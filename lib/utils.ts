import { SelectOption } from "@/types";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDateDDMMYYHHMMSS(date: Date): string {
  return new Date(date).toLocaleDateString("it-IT", {
    year: "2-digit",
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
