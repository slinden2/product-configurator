import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function isArrayOfStrings(input: unknown): input is string[] {
  return (
    Array.isArray(input) && input.every((item) => typeof item === "string")
  );
}

export function formatDateDDMMYYHHMMSS(date: Date): string {
  return date.toLocaleDateString("it-IT", {
    year: "2-digit",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}
