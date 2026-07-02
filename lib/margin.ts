import { type BomTag, BomTagLabels, BomTags } from "@/types";
import type { OfferBomLineItem } from "@/validation/offer-schema";

/**
 * Minimum acceptable gross margin, expressed as a percentage (30 = 30%).
 * Below this the deal is flagged on the margin review page so a director/admin
 * can decide whether to send it back to sales for re-negotiation.
 *
 * NOTE: kept as a code constant for now; a DB-backed, admin-configurable value
 * is a planned fast-follow (same read site).
 */
export const MIN_MARGIN_PCT = 30;

const TAG_SET = new Set<string>(BomTags);

/** Maps any (possibly stale/free-form) tag onto a known BomTag, defaulting to MISC. */
function normalizeTag(tag: string | null): BomTag {
  return tag && TAG_SET.has(tag) ? (tag as BomTag) : "MISC";
}

/**
 * Minimal shape of an engineering BOM row needed for cost math. The page maps
 * `getEngineeringBomItems` rows enriched via `enrichWithCosts` onto this.
 */
export interface EbomCostItem {
  pn: string;
  description: string;
  qty: number;
  cost: number;
  tag: string | null;
  is_deleted: boolean;
}

export interface MarginResult {
  revenue: number;
  cost: number;
  /** revenue − cost, in euros. */
  marginValue: number;
  /** Gross margin percentage (0..100). 0 when revenue is non-positive. */
  marginPct: number;
}

export interface TagCostRow {
  tag: BomTag;
  label: string;
  offerCost: number;
  ebomCost: number;
  /** ebomCost − offerCost. */
  delta: number;
}

export type LineDiffStatus = "added" | "removed" | "changed" | "unchanged";

export interface LineDiffRow {
  pn: string;
  description: string;
  offerQty: number | null;
  ebomQty: number | null;
  /** As-quoted cost for this part (summed across categories). */
  offerCost: number;
  /** Current catalog cost for this part (summed across categories). */
  ebomCost: number;
  /** ebomCost − offerCost. */
  costDelta: number;
  /** True when offer and EBOM quantities differ (always false for added/removed). */
  qtyChanged: boolean;
  /** True when the aggregated cost differs beyond epsilon (always false for added/removed). */
  costChanged: boolean;
  status: LineDiffStatus;
}

export interface MarginComparison {
  /** Whether an engineering BOM exists. When false the engineering side is a placeholder. */
  hasEbom: boolean;
  revenue: number;
  offerCost: number;
  ebomCost: number;
  offerMargin: MarginResult;
  currentMargin: MarginResult;
  /** offerMargin.marginPct − currentMargin.marginPct (positive = margin eroded). */
  marginPctDrop: number;
  /** ebomCost − offerCost. */
  costDelta: number;
  belowThreshold: boolean;
  tagBreakdown: TagCostRow[];
  lineDiff: LineDiffRow[];
}

/**
 * Back-computes the as-quoted cost of an offer BOM line. Since
 * `line_total = cost × coefficient × qty`, the original cost basis is
 * `line_total / coefficient`. Guards against a zero coefficient.
 */
export function offerLineCost(item: OfferBomLineItem): number {
  return item.coefficient > 0 ? item.line_total / item.coefficient : 0;
}

/** Sum of as-quoted costs across all offer BOM line items. */
export function computeOfferBomCost(items: OfferBomLineItem[]): number {
  return items.reduce((sum, item) => sum + offerLineCost(item), 0);
}

/** Sum of current catalog cost (cost × qty) across non-deleted EBOM items. */
export function computeEbomCost(items: EbomCostItem[]): number {
  return items
    .filter((item) => !item.is_deleted)
    .reduce((sum, item) => sum + item.cost * item.qty, 0);
}

export function computeMargin(revenue: number, cost: number): MarginResult {
  const marginValue = revenue - cost;
  const marginPct = revenue > 0 ? (marginValue / revenue) * 100 : 0;
  return { revenue, cost, marginValue, marginPct };
}

/** Per-tag cost comparison (offer vs EBOM). Only tags with any cost are returned, in BomTags order. */
export function buildTagBreakdown(
  offerItems: OfferBomLineItem[],
  ebomItems: EbomCostItem[],
): TagCostRow[] {
  const offerByTag = new Map<BomTag, number>();
  for (const item of offerItems) {
    const tag = normalizeTag(item.tag);
    offerByTag.set(tag, (offerByTag.get(tag) ?? 0) + offerLineCost(item));
  }

  const ebomByTag = new Map<BomTag, number>();
  for (const item of ebomItems) {
    if (item.is_deleted) continue;
    const tag = normalizeTag(item.tag);
    ebomByTag.set(tag, (ebomByTag.get(tag) ?? 0) + item.cost * item.qty);
  }

  return BomTags.map((tag) => {
    const offerCost = offerByTag.get(tag) ?? 0;
    const ebomCost = ebomByTag.get(tag) ?? 0;
    return {
      tag,
      label: BomTagLabels[tag],
      offerCost,
      ebomCost,
      delta: ebomCost - offerCost,
    };
  }).filter((row) => row.offerCost > 0 || row.ebomCost > 0);
}

type AggregatedLine = { description: string; qty: number; cost: number };

function aggregateByPn(
  entries: { pn: string; description: string; qty: number; cost: number }[],
): Map<string, AggregatedLine> {
  const map = new Map<string, AggregatedLine>();
  for (const entry of entries) {
    const prev = map.get(entry.pn);
    if (prev) {
      prev.qty += entry.qty;
      prev.cost += entry.cost;
    } else {
      map.set(entry.pn, {
        description: entry.description,
        qty: entry.qty,
        cost: entry.cost,
      });
    }
  }
  return map;
}

const DIFF_ORDER: Record<LineDiffStatus, number> = {
  added: 0,
  removed: 1,
  changed: 2,
  unchanged: 3,
};

/**
 * Outer-joins offer BOM items and EBOM items by part number (aggregating
 * quantities/costs across categories). Flags each part as added, removed,
 * changed or unchanged; sorts changes first, then by largest cost delta.
 */
export function buildLineDiff(
  offerItems: OfferBomLineItem[],
  ebomItems: EbomCostItem[],
): LineDiffRow[] {
  const offerMap = aggregateByPn(
    offerItems.map((item) => ({
      pn: item.pn,
      description: item.description,
      qty: item.qty,
      cost: offerLineCost(item),
    })),
  );
  const ebomMap = aggregateByPn(
    ebomItems
      .filter((item) => !item.is_deleted)
      .map((item) => ({
        pn: item.pn,
        description: item.description,
        qty: item.qty,
        cost: item.cost * item.qty,
      })),
  );

  const pns = [...new Set([...offerMap.keys(), ...ebomMap.keys()])];

  const rows: LineDiffRow[] = pns.map((pn) => {
    const offer = offerMap.get(pn) ?? null;
    const ebom = ebomMap.get(pn) ?? null;
    const offerCost = offer?.cost ?? 0;
    const ebomCost = ebom?.cost ?? 0;

    const qtyChanged = !!offer && !!ebom && offer.qty !== ebom.qty;
    const costChanged =
      !!offer && !!ebom && Math.abs(offer.cost - ebom.cost) > 0.005;

    let status: LineDiffStatus;
    if (!offer) status = "added";
    else if (!ebom) status = "removed";
    else if (qtyChanged || costChanged) status = "changed";
    else status = "unchanged";

    return {
      pn,
      description: ebom?.description ?? offer?.description ?? "",
      offerQty: offer?.qty ?? null,
      ebomQty: ebom?.qty ?? null,
      offerCost,
      ebomCost,
      costDelta: ebomCost - offerCost,
      qtyChanged,
      costChanged,
      status,
    };
  });

  return rows.sort(
    (a, b) =>
      DIFF_ORDER[a.status] - DIFF_ORDER[b.status] ||
      Math.abs(b.costDelta) - Math.abs(a.costDelta),
  );
}

/**
 * Assembles the full margin comparison view model from a fixed offer revenue,
 * the offer's BOM line items (as quoted) and the current EBOM rows.
 */
export function buildMarginComparison(
  revenue: number,
  offerItems: OfferBomLineItem[],
  ebomItems: EbomCostItem[],
): MarginComparison {
  const hasEbom = ebomItems.filter((item) => !item.is_deleted).length > 0;
  const offerCost = computeOfferBomCost(offerItems);
  const ebomCost = computeEbomCost(ebomItems);
  const offerMargin = computeMargin(revenue, offerCost);
  // Without an EBOM the engineering side is a placeholder: cost and margin are
  // shown as 0 (computeMargin(revenue, 0) would otherwise read as 100%).
  const currentMargin = hasEbom
    ? computeMargin(revenue, ebomCost)
    : { revenue, cost: 0, marginValue: 0, marginPct: 0 };

  return {
    hasEbom,
    revenue,
    offerCost,
    ebomCost,
    offerMargin,
    currentMargin,
    marginPctDrop: offerMargin.marginPct - currentMargin.marginPct,
    costDelta: ebomCost - offerCost,
    belowThreshold: hasEbom && currentMargin.marginPct < MIN_MARGIN_PCT,
    tagBreakdown: buildTagBreakdown(offerItems, ebomItems),
    lineDiff: buildLineDiff(offerItems, ebomItems),
  };
}
