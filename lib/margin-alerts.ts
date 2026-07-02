import { getEngineeringBomItemsForConfigs } from "@/db/queries";
import { enrichWithCosts } from "@/lib/BOM";
import {
  computeEbomCost,
  computeMargin,
  type EbomCostItem,
  getConfigurationProductCategory,
  getMarginThresholdForCategory,
  isMarginBelowThreshold,
} from "@/lib/margin";
import { prepareOfferDisplayData } from "@/lib/offer";

export interface LineMarginAlert {
  lineId: number;
  configurationId: number;
  /** Live gross margin percentage of the current EBOM vs the as-sold revenue. */
  marginPct: number;
  thresholdPct: number;
  belowThreshold: boolean;
}

type AlertInputLine = {
  id: number;
  configuration_id: number;
  pricing_snapshot: unknown;
  as_sold_frozen_at: Date | null;
};

/**
 * Live per-line margin alerts for the accepted revision's frozen lines.
 * Revenue is the per-unit discounted offer total from the line's
 * `pricing_snapshot` (quantity intentionally ignored) and cost is the current
 * EBOM at today's catalog cost — the same semantics as the margin review page,
 * so the offer badge and that page can never disagree. The threshold is picked
 * automatically from the line configuration's product category.
 *
 * Non-frozen lines, lines without a snapshot and configs without an EBOM are
 * skipped or resolve to no alert. Costs are fetched in one batch query plus a
 * single part-number lookup regardless of line count.
 */
export async function computeLineMarginAlerts(
  lines: AlertInputLine[],
  discountPct: number,
): Promise<Map<number, LineMarginAlert>> {
  const frozenLines = lines.filter(
    (line) => line.as_sold_frozen_at !== null && line.pricing_snapshot !== null,
  );
  const alerts = new Map<number, LineMarginAlert>();
  if (frozenLines.length === 0) return alerts;

  const ebomRows = await getEngineeringBomItemsForConfigs(
    frozenLines.map((line) => line.configuration_id),
  );
  const enriched = await enrichWithCosts(ebomRows);

  const ebomByConfig = new Map<number, EbomCostItem[]>();
  for (const row of enriched) {
    const items = ebomByConfig.get(row.configuration_id) ?? [];
    items.push({
      pn: row.pn,
      description: row.description,
      qty: row.qty,
      cost: row.cost,
      tag: row.tag,
      is_deleted: row.is_deleted,
    });
    ebomByConfig.set(row.configuration_id, items);
  }

  for (const line of frozenLines) {
    const { displayData } = prepareOfferDisplayData(
      line.pricing_snapshot,
      discountPct,
    );
    if (!displayData) continue;

    const revenue = displayData.discounted_total;
    const ebomItems = ebomByConfig.get(line.configuration_id) ?? [];
    const thresholdPct = getMarginThresholdForCategory(
      getConfigurationProductCategory(),
    );

    alerts.set(line.id, {
      lineId: line.id,
      configurationId: line.configuration_id,
      marginPct: computeMargin(revenue, computeEbomCost(ebomItems)).marginPct,
      thresholdPct,
      belowThreshold: isMarginBelowThreshold(revenue, ebomItems, thresholdPct),
    });
  }

  return alerts;
}
