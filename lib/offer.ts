import type { ConfigurationWithWaterTanksAndWashBays } from "@/db/schemas";
import { BOM, enrichWithCosts } from "@/lib/BOM";
import { applyDiscount } from "@/lib/money";
import {
  resolveOfferSurcharges,
  sumSurchargeTotal,
} from "@/lib/offer-surcharges";
import { computeLinePrice, enrichWithPrices } from "@/lib/pricing";
import type { BomLineCategory, BomTag, SettingRow } from "@/types";
import { BomTagLabels, BomTags, STANDARD_MACHINE_HEIGHT_MM } from "@/types";
import {
  isSurchargeItem,
  type OfferBomLineItem,
  type OfferLineItem,
  type OfferSurchargeItem,
  offerLineItemsSchema,
} from "@/validation/offer/offer-pricing-schema";

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
  row: {
    pn: string;
    description: string;
    qty: number;
    tag?: BomTag | null;
    cost: number;
    coefficient: number;
    list_price: number;
  },
  category: BomLineCategory,
  category_index: number,
): OfferBomLineItem {
  return {
    pn: row.pn,
    description: row.description,
    qty: row.qty,
    coefficient: row.coefficient,
    list_price: computeLinePrice(row.cost, row.coefficient, 1),
    // enrichWithPrices' list_price already multiplies by qty — it is the line total.
    line_total: row.list_price,
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
  const withCosts = await enrichWithCosts(allFlat);
  const withPrices = await enrichWithPrices(withCosts);

  return flatSources.map(({ category, category_index }, idx) =>
    toOfferItem(withPrices[idx], category, category_index),
  );
}

/**
 * Computes section totals, grand total and discounted total from BOM offer line
 * items. A thin projection of {@link groupItemsForDisplay} (the single bucketing
 * pass) down to per-section totals, dropping the per-line detail.
 */
export function computeOfferTotals(
  items: OfferBomLineItem[],
  discount_pct: number,
): OfferTotals {
  const grouped = groupItemsForDisplay(items, discount_pct);

  const general: Partial<Record<BomTag, number>> = {};
  for (const row of grouped.general) {
    general[row.tag] = row.total;
  }

  return {
    sectionTotals: {
      general,
      waterTanks: grouped.waterTanks.map(({ index, total }) => ({
        index,
        total,
      })),
      washBays: grouped.washBays.map(({ index, total }) => ({ index, total })),
    },
    total_list_price: grouped.total_list_price,
    discounted_total: grouped.discounted_total,
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
      const tag = item.tag ?? "MISC";
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

  const discounted_total = applyDiscount(total_list_price, discount_pct);

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
  surchargeSettings: SettingRow[],
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

  const bomTotal = bomItems.reduce((sum, item) => sum + item.line_total, 0);
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
      discounted_total: applyDiscount(totalListPrice, discountPct),
    },
    surcharges,
  };
}
