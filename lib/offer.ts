import { getPriceCoefficientsByArray } from "@/db/queries";
import type { ConfigurationWithWaterTanksAndWashBays } from "@/db/schemas";
import type { OfferSnapshot } from "@/db/schemas/offer-snapshots";
import { BOM, enrichWithCosts } from "@/lib/BOM";
import { computeLinePrice, DEFAULT_COEFFICIENT } from "@/lib/pricing";
import type { BomTag, ConfigurationStatusType } from "@/types";
import { BomTagLabels, BomTags } from "@/types";
import type {
  OfferLineItem,
  OfferSnapshotItem,
  OfferSurchargeItem,
} from "@/validation/offer-schema";

export type {
  OfferLineItem,
  OfferSurchargeItem,
} from "@/validation/offer-schema";

type OfferCategory = "GENERAL" | "WATER_TANK" | "WASH_BAY";

export const OFFER_STALENESS_DAYS = 60;

export type EbomDriftStatus = "none" | "live_but_ebom_exists" | "ebom_changed";

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
  items: OfferSnapshotItem[];
}

export interface GroupedOfferSection {
  index: number;
  total: number;
  items: OfferSnapshotItem[];
}

export interface GroupedOfferData {
  general: GroupedOfferRow[];
  waterTanks: GroupedOfferSection[];
  washBays: GroupedOfferSection[];
}

/** Returns true when the offer is stale and the config is not frozen. */
export function isOfferStale(
  snapshot: Pick<OfferSnapshot, "generated_at">,
  status: ConfigurationStatusType,
): boolean {
  if (status === "APPROVED" || status === "CLOSED") return false;
  const ageMs = Date.now() - new Date(snapshot.generated_at).getTime();
  const ageDays = ageMs / (1000 * 60 * 60 * 24);
  return ageDays > OFFER_STALENESS_DAYS;
}

/**
 * Determines whether the offer's source data has drifted from the current EBOM state.
 * - live_but_ebom_exists: offer was built from live rules, but EBOM now exists.
 * - ebom_changed: offer was built from EBOM, but EBOM has since been updated.
 */
export function detectEbomDrift(
  snapshot: Pick<OfferSnapshot, "source" | "generated_at">,
  ebomMaxUpdatedAt: Date | null,
): EbomDriftStatus {
  if (snapshot.source === "LIVE" && ebomMaxUpdatedAt !== null) {
    return "live_but_ebom_exists";
  }
  if (
    snapshot.source === "EBOM" &&
    ebomMaxUpdatedAt !== null &&
    new Date(ebomMaxUpdatedAt) > new Date(snapshot.generated_at)
  ) {
    return "ebom_changed";
  }
  return "none";
}

type EbomRow = {
  pn: string;
  description: string;
  qty: number;
  is_deleted: boolean;
  tag: BomTag | null;
  category: OfferCategory;
  category_index: number;
  cost?: number;
};

function toOfferItem(
  row: { pn: string; description: string; qty: number; tag?: BomTag | null },
  category: OfferCategory,
  category_index: number,
  costMap: Map<string, number>,
  coeffMap: Map<string, number>,
): OfferSnapshotItem {
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

/** Builds offer items from an engineering BOM snapshot. Excludes soft-deleted rows. */
export async function buildOfferItemsFromEbom(
  ebomRows: EbomRow[],
): Promise<OfferSnapshotItem[]> {
  const active = ebomRows.filter((r) => !r.is_deleted);
  if (active.length === 0) return [];

  const uniquePns = [...new Set(active.map((r) => r.pn))];
  const [coeffRows, withCosts] = await Promise.all([
    getPriceCoefficientsByArray(uniquePns),
    enrichWithCosts(active),
  ]);
  const coeffMap = new Map(coeffRows.map((r) => [r.pn, Number(r.coefficient)]));
  const costMap = new Map(withCosts.map((r) => [r.pn, r.cost]));

  return active.map((row) =>
    toOfferItem(row, row.category, row.category_index, costMap, coeffMap),
  );
}

/** Builds offer items from live BOM rules. */
export async function buildOfferItemsFromLive(
  configuration: ConfigurationWithWaterTanksAndWashBays,
): Promise<OfferSnapshotItem[]> {
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

/** Computes section totals, grand total and discounted total from snapshot items. */
export function computeOfferTotals(
  items: OfferSnapshotItem[],
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
  items: OfferSnapshotItem[],
  discount_pct: number,
): GroupedOfferData & { total_list_price: number; discounted_total: number } {
  const generalTotals: Partial<Record<BomTag, number>> = {};
  const waterTankTotals = new Map<number, number>();
  const washBayTotals = new Map<number, number>();
  const generalItemsByTag = new Map<BomTag, OfferSnapshotItem[]>();
  const waterTankItemsByIndex = new Map<number, OfferSnapshotItem[]>();
  const washBayItemsByIndex = new Map<number, OfferSnapshotItem[]>();
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
  items: OfferSnapshotItem[],
  surcharges: OfferSurchargeItem[],
): OfferLineItem[] {
  return [...items, ...surcharges];
}
