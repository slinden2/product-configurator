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

/**
 * Formats a timestamp as "dd/mm/yyyy, hh:mm" in Italian time. Accepts a string
 * because timestamps that cross a server/client boundary arrive serialized.
 * The timezone is pinned so server and client render identically.
 */
export function formatDateDDMMYYYYHHMM(date: Date | string): string {
  return new Date(date).toLocaleString("it-IT", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Europe/Rome",
  });
}

// NOT_SELECTED_VALUE must be a non-empty string. "" or undefined will cause problems
// with the Select component. Trust me, you have already tried those approaches.
export const NOT_SELECTED_VALUE = "null";
export const NOT_SELECTED_LABEL = "---";

export const withNoSelection = (items: SelectOption[]): SelectOption[] => {
  return [{ value: NOT_SELECTED_VALUE, label: NOT_SELECTED_LABEL }, ...items];
};
