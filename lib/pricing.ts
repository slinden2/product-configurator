import { getPriceCoefficientsByArray } from "@/db/queries";
import {
  GeneralMaxBOM,
  WashBayMaxBOM,
  WaterTankMaxBOM,
} from "@/lib/BOM/max-bom";
import { isTodoPn } from "@/lib/BOM/max-bom/conditions";

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
