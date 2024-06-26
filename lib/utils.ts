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
