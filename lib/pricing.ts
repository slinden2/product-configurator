import { getPriceCoefficientsByArray } from "@/db/queries";
import {
  GeneralMaxBOM,
  WashBayMaxBOM,
  WaterTankMaxBOM,
} from "@/lib/BOM/max-bom";
import { isTodoPn } from "@/lib/BOM/max-bom/conditions";
import type { CoefficientSource } from "@/types";

export const DEFAULT_COEFFICIENT = 3.0;

/** Collects all unique, real PNs referenced across the three MaxBOM rule arrays.
 * Excludes TODO_PN placeholders that lack a real part number. */
export function collectMaxBomPns(): string[] {
  const all = [
    ...GeneralMaxBOM.map((i) => i.pn),
    ...WaterTankMaxBOM.map((i) => i.pn),
    ...WashBayMaxBOM.map((i) => i.pn),
  ];
  return [...new Set(all)].filter((pn) => !isTodoPn(pn));
}

/**
 * Diff between the MaxBOM rule catalog and the coefficient rows: `missing` are
 * MaxBOM PNs with no coefficient row yet (the sync action inserts these),
 * `orphans` are MAXBOM-sourced rows whose PN no longer appears in any rule.
 * Single source for the coefficients-page banner and the sync action, so the
 * two can never disagree. Rows without a `source` never count as orphans.
 * Pure: callers pass the catalog (normally `collectMaxBomPns()`).
 */
export function computeMaxBomCoefficientDiff(
  rows: { pn: string; source?: CoefficientSource }[],
  maxBomPns: string[],
): { missing: string[]; orphans: string[] } {
  const maxBomSet = new Set(maxBomPns);
  const existingSet = new Set(rows.map((r) => r.pn));
  return {
    missing: maxBomPns.filter((pn) => !existingSet.has(pn)),
    orphans: rows
      .filter((r) => r.source === "MAXBOM" && !maxBomSet.has(r.pn))
      .map((r) => r.pn),
  };
}

export function computeLinePrice(
  cost: number,
  coefficient: number,
  qty: number,
): number {
  return cost * coefficient * qty;
}

/**
 * Enriches BOM items with their coefficient and computed list_price.
 * Missing coefficient rows fall back to DEFAULT_COEFFICIENT.
 * Parallels enrichWithCosts in lib/BOM/index.ts.
 */
export async function enrichWithPrices<
  T extends { pn: string; qty: number; cost: number },
>(items: T[]): Promise<(T & { coefficient: number; list_price: number })[]> {
  if (items.length === 0) return [];
  const uniquePns = [...new Set(items.map((i) => i.pn))];
  const rows = await getPriceCoefficientsByArray(uniquePns);
  const coeffMap = new Map(rows.map((r) => [r.pn, Number(r.coefficient)]));

  return items.map((item) => {
    const coefficient = coeffMap.get(item.pn) ?? DEFAULT_COEFFICIENT;
    return {
      ...item,
      coefficient,
      list_price: computeLinePrice(item.cost, coefficient, item.qty),
    };
  });
}
