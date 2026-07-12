import { formatEur } from "@/lib/utils";

/**
 * Offer/margin money math and Italian money/percentage formatting.
 *
 * Kept free of server-only imports (unlike `lib/pricing.ts`) so client
 * components can use the formatters without pulling db code into the bundle.
 */

/** Rounds a money value to 2 decimals (numeric(12,2) storage). */
export function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Per-unit net price after a header discount, rounded to cents. Single source of
 * truth for the offer discount rule — keep the SQL recompute in
 * updateRevisionDiscountWithAudit (db/queries/offers.ts) in sync with this
 * (Postgres round() and Math.round both round half away from zero for
 * non-negative money values). The parity cases are pinned in lib/money.test.ts.
 */
export function computeNetPrice(
  listPrice: number,
  discountPct: number,
): number {
  return round2(listPrice * (1 - discountPct / 100));
}

/** Formats a discount percentage for Italian labels: 10 → "10", 10.5 → "10,50". */
export function formatDiscountPctLabel(pct: number): string {
  return pct % 1 === 0 ? `${pct}` : pct.toFixed(2).replace(".", ",");
}

/** Formats a margin/percentage value Italian-style: 42.5 → "42,5%". */
export function formatPct(value: number): string {
  return `${value.toFixed(1).replace(".", ",")}%`;
}

/** Formats a signed currency delta Italian-style: 100 → "+100,00 €", -50 → "-50,00 €". */
export function formatDelta(delta: number): string {
  const sign = delta > 0 ? "+" : "";
  return `${sign}${formatEur(delta)}`;
}
