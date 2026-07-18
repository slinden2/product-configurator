import { notFound, redirect } from "next/navigation";
import ConfigNavigationBar from "@/components/config-navigation-bar";
import DetailsCard from "@/components/shared/details-card";
import { loadValidatedConfiguration } from "@/db/load-validated-configuration";
import {
  getConfigurationWithTanksAndBays,
  getEngineeringBomItems,
  getOfferLinePricingLinesForConfig,
  getOfferRefForConfig,
  getUserData,
  type OfferLinePricing,
} from "@/db/queries";
import { canViewMarginReview } from "@/lib/access";
import { enrichWithCosts } from "@/lib/BOM";
import {
  type AsSoldDiff,
  buildAsSoldDiff,
  parseAsSoldSnapshot,
} from "@/lib/configuration/build-as-sold-diff";
import {
  buildMarginComparison,
  type EbomCostItem,
  type MarginComparison,
} from "@/lib/margin";
import { MSG } from "@/lib/messages";
import { prepareOfferDisplayData } from "@/lib/offer";
import { hasProjectableRenegotiation } from "@/lib/offer-margin-hub";
import { OfferStatusLabels } from "@/types";
import MarginReviewView from "./margin-review-view";

interface MarginReviewPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ revision?: string }>;
}

const MarginReviewPage = async (props: MarginReviewPageProps) => {
  const params = await props.params;
  const confId = parseInt(params.id, 10);
  if (Number.isNaN(confId)) notFound();
  // The hub's "Analizza" link carries the selected view (?revision=working|accepted)
  // so drilling in preserves it; default (and any other value) is the projection.
  const { revision: revisionParam } = await props.searchParams;

  const user = await getUserData();
  if (!user) redirect("/login");

  // Page-authoritative auth (doctrine #102): the page runs its own role check
  // before any data access (layout guards don't gate concurrent page fetches).
  // The margin page exposes cost AND the customer's quoted price together, so it
  // is restricted to management/system roles (ADMIN/SALES_DIRECTOR). ENGINEER —
  // who has no offer access — must never reach it, even by direct URL.
  // Role-disallowed → the read-only view, which enforces its own scope.
  if (!canViewMarginReview(user.role)) {
    redirect(`/configurazioni/visualizza/${confId}`);
  }

  // The margin page is ADMIN/SALES_DIRECTOR-only, both of which have offer access,
  // so the "back to offer" ref is always appropriate here (null only for the rare
  // standalone config reaching this page). The configuration fetch is scoped
  // (getConfigurationWithTanksAndBays enforces ownership → null when out of scope)
  // so role and scope are both enforced before any margin data is rendered.
  const [configuration, lines, ebomRows, offer] = await Promise.all([
    getConfigurationWithTanksAndBays(confId, user),
    getOfferLinePricingLinesForConfig(confId),
    getEngineeringBomItems(confId),
    getOfferRefForConfig(confId),
  ]);

  if (!configuration) notFound();

  // accepted-first ordering → lines[0] is the in-force accepted line (post-
  // acceptance) or the latest line (pre-acceptance) — the baseline view.
  const primaryLine = lines[0] ?? null;

  const header = (
    <>
      <ConfigNavigationBar
        confId={confId}
        activePage="marginalita"
        role={user.role}
        offer={offer}
      />
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="inline-block">Marginalità</h1>
          {offer && primaryLine && (
            <p className="text-sm text-muted-foreground">
              Offerta {offer.offerNumber} · Revisione {primaryLine.revision_no}
            </p>
          )}
        </div>
      </div>
      <DetailsCard
        clientName={configuration.name}
        description={configuration.description}
      />
    </>
  );

  const emptyState = (message: string) => (
    <div className="space-y-6">
      {header}
      <div className="text-center py-16 text-muted-foreground">
        <p>{message}</p>
      </div>
    </div>
  );

  if (!primaryLine) return emptyState(MSG.marginReview.noOffer);

  // EBOM cost basis: current catalog cost of the non-deleted engineering BOM.
  // Shared by both the accepted and projected comparisons — the engineering cost
  // is a property of the live config, not of the revision being priced.
  const activeEbomRows = ebomRows.filter((row) => !row.is_deleted);
  const enriched = await enrichWithCosts(activeEbomRows);
  const ebomItems: EbomCostItem[] = enriched.map((row) => ({
    pn: row.pn,
    description: row.description,
    qty: row.qty,
    cost: row.cost,
    tag: row.tag,
    is_deleted: row.is_deleted,
  }));

  // A margin comparison for one pricing line: revenue is that line's as-sent quote
  // (pricing_snapshot) discounted by its revision header discount, vs the shared
  // live EBOM cost. Returns null until the owning revision has a snapshot.
  const buildLineComparison = (
    line: OfferLinePricing,
  ): { comparison: MarginComparison; discountPct: number } | null => {
    const items = line.pricing_snapshot;
    if (!items) return null;
    const discountPct = Number(line.discount_pct);
    const { displayData } = prepareOfferDisplayData(items, discountPct);
    if (!displayData) return null;
    const offerBomItems = [
      ...displayData.general.flatMap((group) => group.items),
      ...displayData.waterTanks.flatMap((section) => section.items),
      ...displayData.washBays.flatMap((section) => section.items),
    ];
    const absorbedMarginPct =
      line.absorbed_margin_percent === null
        ? null
        : Number(line.absorbed_margin_percent);
    return {
      comparison: buildMarginComparison(
        displayData.discounted_total,
        offerBomItems,
        ebomItems,
        undefined,
        absorbedMarginPct,
      ),
      discountPct,
    };
  };

  const baseData = buildLineComparison(primaryLine);
  if (!baseData) return emptyState(MSG.marginReview.noOffer);

  // As-sold drift: compare the at-acceptance snapshot with the current
  // engineering config (same form shape on both sides). Only computed once a
  // freeze exists — pre-acceptance lines have no as-sold baseline to drift from.
  const asSoldFrozenAt = primaryLine.as_sold_frozen_at ?? null;
  let asSoldDiff: AsSoldDiff | null = null;
  let asSoldDiffUnavailable = false;
  if (asSoldFrozenAt) {
    const snapshot = parseAsSoldSnapshot(primaryLine.as_sold_snapshot);
    const currentConfig = snapshot
      ? await loadValidatedConfiguration(confId, user)
      : null;
    if (snapshot && currentConfig) {
      asSoldDiff = buildAsSoldDiff(snapshot, currentConfig);
    } else {
      asSoldDiffUnavailable = true;
    }
  }

  // Absorb sign-off context: only post-acceptance frozen lines carry a recorded
  // decision. Shown read-only here (who/when/margin/note); the absorb/renegotiate
  // decision itself is taken on the offer margin hub, not on this analysis page.
  const primaryAbsorbedMarginPct =
    primaryLine.absorbed_margin_percent === null
      ? null
      : Number(primaryLine.absorbed_margin_percent);
  const absorb =
    primaryLine.revisionStatus === "ACCEPTED" && asSoldFrozenAt
      ? {
          signOff:
            primaryLine.absorbed_at !== null &&
            primaryAbsorbedMarginPct !== null
              ? {
                  byLabel: primaryLine.absorbed_by_email ?? "—",
                  at: primaryLine.absorbed_at,
                  marginPct: primaryAbsorbedMarginPct,
                  note: primaryLine.absorbed_note,
                }
              : null,
        }
      : null;

  // Projected (working-revision) view: the config's renegotiation line, when a
  // live renegotiation exists. The working line carries live re-derived pricing
  // but no as-sold freeze; its margin projects the renegotiated discount against
  // the same live EBOM cost. `hasProjectableRenegotiation` keeps the rule
  // identical to the offer hub.
  const acceptedRevisionId = primaryLine.accepted_revision_id;
  const workingLine = lines.reduce<OfferLinePricing | null>(
    (latest, line) =>
      latest && latest.revision_no >= line.revision_no ? latest : line,
    null,
  );
  let projected: {
    revisionNo: number;
    statusLabel: string;
    comparison: MarginComparison;
    discountPct: number;
  } | null = null;
  if (
    workingLine &&
    hasProjectableRenegotiation(
      { id: workingLine.revision_id, status: workingLine.revisionStatus },
      acceptedRevisionId,
      workingLine.revision_no > primaryLine.revision_no,
    )
  ) {
    const projectedData = buildLineComparison(workingLine);
    if (projectedData) {
      projected = {
        revisionNo: workingLine.revision_no,
        statusLabel: OfferStatusLabels[workingLine.revisionStatus],
        comparison: projectedData.comparison,
        discountPct: projectedData.discountPct,
      };
    }
  }

  const initialView = revisionParam === "accepted" ? "accepted" : "projected";

  return (
    <div className="space-y-6">
      {header}

      <MarginReviewView
        comparison={baseData.comparison}
        discountPct={baseData.discountPct}
        asSoldFrozenAt={asSoldFrozenAt}
        asSoldDiff={asSoldDiff}
        asSoldDiffUnavailable={asSoldDiffUnavailable}
        absorb={absorb}
        projected={projected}
        initialView={initialView}
      />
    </div>
  );
};

export default MarginReviewPage;
