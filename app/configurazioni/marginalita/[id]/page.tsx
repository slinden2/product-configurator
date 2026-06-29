import { notFound, redirect } from "next/navigation";
import ConfigNavigationBar from "@/components/config-navigation-bar";
import DetailsCard from "@/components/shared/details-card";
import {
  getConfiguration,
  getEngineeringBomItems,
  getOfferLinePricingForConfig,
  getUserData,
} from "@/db/queries";
import { canViewMarginReview } from "@/lib/access";
import { enrichWithCosts } from "@/lib/BOM";
import { buildMarginComparison, type EbomCostItem } from "@/lib/margin";
import { MSG } from "@/lib/messages";
import { prepareOfferDisplayData } from "@/lib/offer";
import MarginReviewView from "./margin-review-view";

interface MarginReviewPageProps {
  params: Promise<{ id: string }>;
}

const MarginReviewPage = async (props: MarginReviewPageProps) => {
  const params = await props.params;
  const confId = parseInt(params.id, 10);
  if (Number.isNaN(confId)) notFound();

  const user = await getUserData();
  if (!user) redirect("/login");

  // The margin page exposes cost AND the customer's quoted price together, so it
  // is restricted to management/system roles (ADMIN/SALES_DIRECTOR). ENGINEER —
  // who has no offer access — must never reach it, even by direct URL.
  if (!canViewMarginReview(user.role)) notFound();

  const [configuration, linePricing, ebomRows] = await Promise.all([
    getConfiguration(confId),
    getOfferLinePricingForConfig(confId),
    getEngineeringBomItems(confId),
  ]);

  if (!configuration) notFound();

  const header = (
    <>
      <ConfigNavigationBar
        confId={confId}
        activePage="marginalita"
        role={user.role}
      />
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <h1 className="inline-block">Marginalità</h1>
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

  // Revenue reference: the offer revision line's as-sent quote (pricing_snapshot),
  // discounted by the revision header discount, incl. surcharges. Null until the
  // owning revision has been submitted/sent.
  const items = linePricing?.pricing_snapshot ?? null;
  const discountPct = linePricing ? Number(linePricing.discount_pct) : 0;
  const { displayData } = items
    ? prepareOfferDisplayData(items, discountPct)
    : { displayData: null };

  if (!items || !displayData) return emptyState(MSG.marginReview.noOffer);

  // EBOM cost basis: current catalog cost of the non-deleted engineering BOM.
  // When no EBOM exists the engineering side renders as 0 placeholders.
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

  const offerBomItems = [
    ...displayData.general.flatMap((group) => group.items),
    ...displayData.waterTanks.flatMap((section) => section.items),
    ...displayData.washBays.flatMap((section) => section.items),
  ];

  const comparison = buildMarginComparison(
    displayData.discounted_total,
    offerBomItems,
    ebomItems,
  );

  return (
    <div className="space-y-6">
      {header}

      <MarginReviewView
        comparison={comparison}
        discountPct={discountPct}
        asSoldFrozenAt={linePricing?.as_sold_frozen_at ?? null}
      />
    </div>
  );
};

export default MarginReviewPage;
