import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { SelectOption } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatEur(value: number): string {
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
  }).format(value);
}

/** Rounds a money value to 2 decimals (numeric(12,2) storage). */
export function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Per-unit net price after a header discount, rounded to cents. Single source of
 * truth for the offer discount rule — keep the SQL recompute in
 * updateRevisionDiscountWithAudit in sync with this (Postgres round() and
 * Math.round both round half away from zero for non-negative money values).
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

export function formatDateDDMMYYYYHHMM(date: Date): string {
  return new Date(date).toLocaleDateString("it-IT", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

// NOT_SELECTED_VALUE must be a non-empty string. "" or undefined will cause problems
// with the Select component. Trust me, you have already tried those approaches.
export const NOT_SELECTED_VALUE = "null";
export const NOT_SELECTED_LABEL = "---";

export const withNoSelection = (items: SelectOption[]): SelectOption[] => {
  return [{ value: NOT_SELECTED_VALUE, label: NOT_SELECTED_LABEL }, ...items];
};
