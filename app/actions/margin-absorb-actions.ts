"use server";

import { revalidatePath } from "next/cache";
import {
  absorbOfferLineMarginWithAudit,
  getEngineeringBomItems,
  getOfferLinePricingForLine,
  getOfferRevisionsForDerivation,
  getUserData,
} from "@/db/queries";
import { canViewMarginReview } from "@/lib/access";
import { enrichWithCosts } from "@/lib/BOM";
import {
  computeEbomCost,
  computeMargin,
  type EbomCostItem,
  getConfigurationProductCategory,
  getMarginThresholdForCategory,
  isMarginAlertActive,
} from "@/lib/margin";
import { MSG } from "@/lib/messages";
import { prepareOfferDisplayData } from "@/lib/offer";
import { hasRenegotiationInFlight } from "@/lib/offer-renegotiation";
import {
  type MarginAbsorbInput,
  marginAbsorbSchema,
} from "@/validation/offer/offer-settings-schema";
import { firstZodIssueMessage } from "./lib/first-zod-issue-message";
import { mapActionError } from "./lib/map-action-error";

/**
 * Absorb sign-off (#84): a management decision to accept a post-acceptance
 * margin below threshold. The absorbed margin is recomputed here from the
 * as-sold revenue and the current EBOM — never taken from the client — and
 * becomes the re-alert baseline.
 *
 * Gated to `canViewMarginReview` roles (ADMIN / SALES_DIRECTOR). Both have
 * all-offers scope (`OFFER_ALL_ACCESS_ROLES`), so no per-offer ownership
 * fetch is needed — the same reasoning as the margin page itself.
 */
export async function absorbLineMarginAction(
  lineId: number,
  input: MarginAbsorbInput,
) {
  // The hub passes the accepted revision line's own id (not a config id). Reuse
  // the generic not-found message rather than adding a near-duplicate string.
  if (!Number.isInteger(lineId) || lineId <= 0)
    return { success: false as const, error: MSG.config.notFound };

  const parsed = marginAbsorbSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false as const,
      error: firstZodIssueMessage(parsed.error, MSG.db.unknown),
    };
  }

  const user = await getUserData();
  if (!user)
    return { success: false as const, error: MSG.auth.userNotAuthenticated };
  if (!canViewMarginReview(user.role))
    return {
      success: false as const,
      error: MSG.marginReview.absorbUnauthorized,
    };

  const line = await getOfferLinePricingForLine(lineId);
  // Must be the offer's in-force accepted, frozen line. Line-keyed we can be
  // handed a superseded ACCEPTED line (a renegotiation supersedes but leaves the
  // prior revision ACCEPTED); revision_id === accepted_revision_id rejects it.
  if (
    !line ||
    line.revisionStatus !== "ACCEPTED" ||
    line.as_sold_frozen_at === null ||
    line.pricing_snapshot === null ||
    line.revision_id !== line.accepted_revision_id
  ) {
    return {
      success: false as const,
      error: MSG.marginReview.absorbNotAccepted,
    };
  }

  // Absorb and renegotiate are the two branches of one decision point: while a
  // renegotiation is in flight (SENT included — the customer's answer is
  // pending) the sign-off is suspended. It returns when the renegotiation is
  // discarded, rejected or expires; on re-acceptance the baseline resets
  // instead.
  const revisions = await getOfferRevisionsForDerivation(line.offer_id);
  if (hasRenegotiationInFlight(revisions)) {
    return {
      success: false as const,
      error: MSG.marginReview.absorbRenegotiationInFlight,
    };
  }

  // Live margin, computed exactly like the margin page: as-sold discounted
  // revenue vs the current catalog cost of the non-deleted EBOM.
  const { displayData } = prepareOfferDisplayData(
    line.pricing_snapshot,
    Number(line.discount_pct),
  );
  if (!displayData)
    return {
      success: false as const,
      error: MSG.marginReview.absorbNotAccepted,
    };
  const revenue = displayData.discounted_total;

  const ebomRows = await getEngineeringBomItems(line.configuration_id);
  const enriched = await enrichWithCosts(
    ebomRows.filter((row) => !row.is_deleted),
  );
  const ebomItems: EbomCostItem[] = enriched.map((row) => ({
    pn: row.pn,
    description: row.description,
    qty: row.qty,
    cost: row.cost,
    tag: row.tag,
    is_deleted: row.is_deleted,
  }));

  const thresholdPct = getMarginThresholdForCategory(
    getConfigurationProductCategory(),
  );
  const absorbedMarginPct =
    line.absorbed_margin_percent === null
      ? null
      : Number(line.absorbed_margin_percent);

  // Nothing to sign off unless the alert is currently raised: the margin must
  // be below threshold and not already covered by a previous absorb decision.
  if (!isMarginAlertActive(revenue, ebomItems, thresholdPct, absorbedMarginPct))
    return { success: false as const, error: MSG.marginReview.absorbNotActive };

  const liveMarginPct = computeMargin(
    revenue,
    computeEbomCost(ebomItems),
  ).marginPct;
  const note = parsed.data.note?.length ? parsed.data.note : null;

  try {
    await absorbOfferLineMarginWithAudit({
      lineId: line.id,
      offerId: line.offer_id,
      configId: line.configuration_id,
      revisionId: line.revision_id,
      absorbedBy: user.id,
      absorbedMarginPct: liveMarginPct.toFixed(2),
      thresholdPct,
      note,
    });

    revalidatePath(`/configurazioni/marginalita/${line.configuration_id}`);
    revalidatePath(`/offerte/${line.offer_id}`);
    revalidatePath("/offerte");
    return { success: true as const };
  } catch (err) {
    return mapActionError(err, "Failed to absorb line margin:");
  }
}
