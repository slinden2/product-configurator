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
  return new Date(date).toLocaleDateString("it-IT", {
    year: "2-digit",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

type WithId = { id: number };

export function differenceInTwoArrays<K, T>(
  prevArray: T[],
  newArray: T[]
): { added: Omit<T, "id">[]; same: T[]; removed: T[] } {
  const isWithId = (item: T): item is T & WithId => {
    return (item as WithId).id !== undefined;
  };

  // Items without `id` are new
  const added = newArray.filter((item) => !isWithId(item));

  const prevArrIds = prevArray.map((item) => isWithId(item) && item.id);
  const newArrIds = newArray
    .filter((item) => isWithId(item))
    .map((item) => isWithId(item) && item.id);

  const removedIds = prevArrIds.filter(
    (item) => item && !newArrIds.includes(item)
  );

  // Items present in prevArray but not in newArray
  const removed = prevArray.filter(
    (item) => isWithId(item) && removedIds.includes(item.id)
  );

  // Items present with the same `id` in both arrays
  const same = newArray.filter(
    (item) => isWithId(item) && !removedIds.includes(item.id)
  );

  return {
    added,
    same,
    removed,
  };
}
