import { getPriceCoefficientsByArray } from "@/db/queries";
import type { ConfigurationWithWaterTanksAndWashBays } from "@/db/schemas";
import { BOM, enrichWithCosts } from "@/lib/BOM";
import {
  resolveOfferSurcharges,
  sumSurchargeTotal,
} from "@/lib/offer-surcharges";
import { computeLinePrice, DEFAULT_COEFFICIENT } from "@/lib/pricing";
import type { BomLineCategory, BomTag } from "@/types";
import { BomTagLabels, BomTags, STANDARD_MACHINE_HEIGHT_MM } from "@/types";
import {
  isSurchargeItem,
  type OfferBomLineItem,
  type OfferLineItem,
  type OfferSurchargeItem,
  offerLineItemsSchema,
} from "@/validation/offer-schema";

export type {
  OfferLineItem,
  OfferSurchargeItem,
} from "@/validation/offer-schema";

export interface OfferSectionTotals {
  general: Partial<Record<BomTag, number>>;
  waterTanks: { index: number; total: number }[];
  washBays: { index: number; total: number }[];
}

export interface OfferTotals {
  sectionTotals: OfferSectionTotals;
  total_list_price: number;
  discounted_total: number;
}

export interface GroupedOfferRow {
  tag: BomTag;
  label: string;
  total: number;
  items: OfferBomLineItem[];
}

export interface GroupedOfferSection {
  index: number;
  total: number;
  items: OfferBomLineItem[];
}

export interface GroupedOfferData {
  general: GroupedOfferRow[];
  waterTanks: GroupedOfferSection[];
  washBays: GroupedOfferSection[];
}

function toOfferItem(
  row: { pn: string; description: string; qty: number; tag?: BomTag | null },
  category: BomLineCategory,
  category_index: number,
  costMap: Map<string, number>,
  coeffMap: Map<string, number>,
): OfferBomLineItem {
  const cost = costMap.get(row.pn) ?? 0;
  const coefficient = coeffMap.get(row.pn) ?? DEFAULT_COEFFICIENT;
  return {
    pn: row.pn,
    description: row.description,
    qty: row.qty,
    coefficient,
    list_price: computeLinePrice(cost, coefficient, 1),
    line_total: computeLinePrice(cost, coefficient, row.qty),
    tag: row.tag ?? null,
    category,
    category_index,
  };
}

/** Builds offer items from live BOM rules. */
export async function buildOfferItemsFromLive(
  configuration: ConfigurationWithWaterTanksAndWashBays,
): Promise<OfferBomLineItem[]> {
  const bom = BOM.init(configuration);
  const { generalBOM, waterTankBOMs, washBayBOMs } =
    await bom.buildCompleteBOM();

  const flatSources = [
    ...generalBOM.map((item) => ({
      item,
      category: "GENERAL" as const,
      category_index: 0,
    })),
    ...waterTankBOMs.flatMap((tank, idx) =>
      tank.map((item) => ({
        item,
        category: "WATER_TANK" as const,
        category_index: idx,
      })),
    ),
    ...washBayBOMs.flatMap((bay, idx) =>
      bay.map((item) => ({
        item,
        category: "WASH_BAY" as const,
        category_index: idx,
      })),
    ),
  ];

  if (flatSources.length === 0) return [];

  const allFlat = flatSources.map(({ item }) => item);
  const uniquePns = [...new Set(allFlat.map((i) => i.pn))];
  const [coeffRows, withCosts] = await Promise.all([
    getPriceCoefficientsByArray(uniquePns),
    enrichWithCosts(allFlat),
  ]);
  const coeffMap = new Map(coeffRows.map((r) => [r.pn, Number(r.coefficient)]));
  const costMap = new Map(withCosts.map((r) => [r.pn, r.cost]));

  return flatSources.map(({ item, category, category_index }) =>
    toOfferItem(item, category, category_index, costMap, coeffMap),
  );
}

/** Computes section totals, grand total and discounted total from BOM offer line items. */
export function computeOfferTotals(
  items: OfferBomLineItem[],
  discount_pct: number,
): OfferTotals {
  const general: Partial<Record<BomTag, number>> = {};
  const waterTankMap = new Map<number, number>();
  const washBayMap = new Map<number, number>();

  for (const item of items) {
    if (item.category === "GENERAL") {
      const tag = item.tag ?? ("MISC" as BomTag);
      general[tag] = (general[tag] ?? 0) + item.line_total;
    } else if (item.category === "WATER_TANK") {
      waterTankMap.set(
        item.category_index,
        (waterTankMap.get(item.category_index) ?? 0) + item.line_total,
      );
    } else {
      washBayMap.set(
        item.category_index,
        (washBayMap.get(item.category_index) ?? 0) + item.line_total,
      );
    }
  }

  const total_list_price = items.reduce((sum, i) => sum + i.line_total, 0);
  const discounted_total = total_list_price * (1 - discount_pct / 100);

  return {
    sectionTotals: {
      general,
      waterTanks: [...waterTankMap.entries()]
        .sort(([a], [b]) => a - b)
        .map(([index, total]) => ({ index, total })),
      washBays: [...washBayMap.entries()]
        .sort(([a], [b]) => a - b)
        .map(([index, total]) => ({ index, total })),
    },
    total_list_price,
    discounted_total,
  };
}

/** Groups items for the offer view display with per-line detail. Single pass over items. */
export function groupItemsForDisplay(
  items: OfferBomLineItem[],
  discount_pct: number,
): GroupedOfferData & { total_list_price: number; discounted_total: number } {
  const generalTotals: Partial<Record<BomTag, number>> = {};
  const waterTankTotals = new Map<number, number>();
  const washBayTotals = new Map<number, number>();
  const generalItemsByTag = new Map<BomTag, OfferBomLineItem[]>();
  const waterTankItemsByIndex = new Map<number, OfferBomLineItem[]>();
  const washBayItemsByIndex = new Map<number, OfferBomLineItem[]>();
  let total_list_price = 0;

  for (const item of items) {
    total_list_price += item.line_total;

    if (item.category === "GENERAL") {
      const tag = (item.tag ?? "MISC") as BomTag;
      generalTotals[tag] = (generalTotals[tag] ?? 0) + item.line_total;
      const bucket = generalItemsByTag.get(tag) ?? [];
      bucket.push(item);
      generalItemsByTag.set(tag, bucket);
    } else if (item.category === "WATER_TANK") {
      const idx = item.category_index;
      waterTankTotals.set(
        idx,
        (waterTankTotals.get(idx) ?? 0) + item.line_total,
      );
      const bucket = waterTankItemsByIndex.get(idx) ?? [];
      bucket.push(item);
      waterTankItemsByIndex.set(idx, bucket);
    } else {
      const idx = item.category_index;
      washBayTotals.set(idx, (washBayTotals.get(idx) ?? 0) + item.line_total);
      const bucket = washBayItemsByIndex.get(idx) ?? [];
      bucket.push(item);
      washBayItemsByIndex.set(idx, bucket);
    }
  }

  const discounted_total = total_list_price * (1 - discount_pct / 100);

  const general: GroupedOfferRow[] = BomTags.filter(
    (tag) => (generalTotals[tag] ?? 0) > 0,
  ).map((tag) => ({
    tag,
    label: BomTagLabels[tag],
    total: generalTotals[tag] ?? 0,
    items: generalItemsByTag.get(tag) ?? [],
  }));

  const waterTanks: GroupedOfferSection[] = [...waterTankTotals.entries()]
    .sort(([a], [b]) => a - b)
    .map(([index, total]) => ({
      index,
      total,
      items: waterTankItemsByIndex.get(index) ?? [],
    }));

  const washBays: GroupedOfferSection[] = [...washBayTotals.entries()]
    .sort(([a], [b]) => a - b)
    .map(([index, total]) => ({
      index,
      total,
      items: washBayItemsByIndex.get(index) ?? [],
    }));

  return { general, waterTanks, washBays, total_list_price, discounted_total };
}

/** Concatenates surcharge line items after BOM-derived part items. Phase 1 stub for Phase 4 wiring. */
export function appendSurchargesToOfferItems(
  items: OfferBomLineItem[],
  surcharges: OfferSurchargeItem[],
): OfferLineItem[] {
  return [...items, ...surcharges];
}

export { sumSurchargeTotal } from "@/lib/offer-surcharges";

/**
 * Builds an offer's list-price item set and total from a configuration's live BOM:
 * BOM part items plus the applicable height/paint surcharges. Single source of
 * truth for "the list price of a config" — used by the per-revision-line pricing
 * (computeLinePricing).
 *
 * Returns { ok: false } when a triggered surcharge has no configured price so the
 * caller can fail loudly before persisting bad pricing.
 */
export async function computeOfferListPricing(
  configuration: ConfigurationWithWaterTanksAndWashBays,
  surchargeSettings: { kind: string; price: string | number }[],
): Promise<
  { ok: true; items: OfferLineItem[]; total_list_price: number } | { ok: false }
> {
  const bomItems = await buildOfferItemsFromLive(configuration);

  const surchargeResult = resolveOfferSurcharges({
    totalHeightMm: configuration.total_height,
    standardHeightMm: STANDARD_MACHINE_HEIGHT_MM,
    hasOmzPaint: configuration.has_omz_paint,
    settings: surchargeSettings,
  });
  if (!surchargeResult.ok) return { ok: false };
  const { surcharges } = surchargeResult;

  const { total_list_price: bomTotal } = computeOfferTotals(bomItems, 0);
  return {
    ok: true,
    items: appendSurchargesToOfferItems(bomItems, surcharges),
    total_list_price: bomTotal + sumSurchargeTotal(surcharges),
  };
}

/**
 * Parses raw snapshot items JSON, splits BOM vs surcharge items, groups BOM items
 * for display, and adjusts totals to include surcharges. Single entry point for
 * all offer display/export consumers.
 */
export function prepareOfferDisplayData(
  rawItems: unknown,
  discountPct: number,
): {
  displayData:
    | (GroupedOfferData & {
        total_list_price: number;
        discounted_total: number;
      })
    | null;
  surcharges: OfferSurchargeItem[];
} {
  const parsed = offerLineItemsSchema.safeParse(rawItems);
  const allItems = parsed.success ? parsed.data : [];
  const bomItems = allItems.filter(
    (item): item is OfferBomLineItem => !isSurchargeItem(item),
  );
  const surcharges = allItems.filter(isSurchargeItem);

  if (bomItems.length === 0) return { displayData: null, surcharges };

  const grouped = groupItemsForDisplay(bomItems, discountPct);
  const surchargeTotal = sumSurchargeTotal(surcharges);
  const totalListPrice = grouped.total_list_price + surchargeTotal;
  return {
    displayData: {
      ...grouped,
      total_list_price: totalListPrice,
      discounted_total: totalListPrice * (1 - discountPct / 100),
    },
    surcharges,
  };
}
