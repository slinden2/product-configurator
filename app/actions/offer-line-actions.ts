"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { addOfferLine, removeOfferLine } from "@/db/queries";
import { OFFER_CONFIG_NAME_PLACEHOLDER } from "@/lib/configuration/constants";
import { MSG } from "@/lib/messages";
import { repriceOfferLine } from "@/lib/offer-revision-pricing";
import { configSchema } from "@/validation/config-schema";
import { authorizeOfferLifecycleAction } from "./lib/authorize";
import { firstZodIssueMessage } from "./lib/first-zod-issue-message";
import { mapActionError } from "./lib/map-action-error";

/**
 * Adds a new machine configuration line to an offer's revision 1. The config is
 * created with origin=OFFER (owned by the offer owner) and a line row at the next
 * position with placeholder pricing. Returns the new configuration id so the UI
 * can land on its edit page (where tanks/bays become editable).
 */
export const addOfferLineAction = async (
  offerId: number,
  formData: unknown,
) => {
  // OFFER configs do not own a customer-name field. Supply a validation-only
  // placeholder here; addOfferLine replaces it with the authoritative offer
  // header value inside the locked transaction.
  const offerConfigData =
    typeof formData === "object" && formData !== null
      ? { ...formData, name: OFFER_CONFIG_NAME_PLACEHOLDER }
      : formData;
  const validation = configSchema.safeParse(offerConfigData);

  if (!validation.success) {
    return {
      success: false as const,
      error: firstZodIssueMessage(validation.error, MSG.db.unknown),
    };
  }

  // Offer access + existence + scope. The revision-DRAFT gate lives in addOfferLine,
  // so the working revision's status is not needed here — only that the offer is
  // reachable.
  const auth = await authorizeOfferLifecycleAction(offerId);
  if (!auth.success) return auth;
  const { user } = auth;

  try {
    // The revision-DRAFT and renegotiation-lock gates live in addOfferLine (throws
    // QueryError otherwise) — a sanctioned query-layer gate, see app/actions/CLAUDE.md.
    // Price the new line from its live BOM in the same transaction; the
    // OFFER_LINE_ADD log already records the creation, so skip the reprice audit.
    // requireDraft: a just-inserted line on a non-DRAFT revision is a lost race
    // with submit — roll back the add instead of committing it unpriced.
    const id = await db.transaction(async (tx) => {
      const { id: configId } = await addOfferLine(
        offerId,
        validation.data,
        user.id,
        tx,
      );
      await repriceOfferLine(configId, user.id, tx, {
        audit: false,
        requireDraft: true,
      });
      return configId;
    });
    // The offer list renders the working revision's line count; "/" its queue ages.
    revalidatePath("/offerte");
    revalidatePath(`/offerte/${offerId}`);
    revalidatePath("/");
    return { success: true as const, id };
  } catch (err) {
    return mapActionError(err, "Failed to add offer line:");
  }
};

/**
 * Removes a configuration line from an offer's working revision, deleting the line
 * row and its configuration. Gated on the revision being DRAFT.
 */
export const removeOfferLineAction = async (
  offerId: number,
  configId: number,
) => {
  // Offer access + existence + scope. The revision-DRAFT and renegotiation-lock gates
  // live in removeOfferLine — a sanctioned query-layer gate, see app/actions/CLAUDE.md.
  const auth = await authorizeOfferLifecycleAction(offerId);
  if (!auth.success) return auth;

  try {
    await removeOfferLine(offerId, configId, auth.user.id);
    // The offer list renders the working revision's line count.
    revalidatePath("/offerte");
    revalidatePath(`/offerte/${offerId}`);
    revalidatePath("/");
    return { success: true as const };
  } catch (err) {
    return mapActionError(err, "Failed to remove offer line:");
  }
};
