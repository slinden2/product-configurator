import { BomTag, BomTags } from "@/types";

export function groupByTag<T extends { tag?: BomTag | null }>(
  items: T[]
): Map<BomTag, T[]> {
  const map = new Map<BomTag, T[]>();
  for (const tag of BomTags) {
    const tagItems = items.filter((i) => i.tag === tag);
    if (tagItems.length > 0) {
      map.set(tag, tagItems);
    }
  }
  return map;
}

export function hasTagData(items: { tag?: BomTag | null }[]): boolean {
  return items.some((i) => i.tag != null);
}