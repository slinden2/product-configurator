import { InstallationItemKinds } from "@/types";
import type { OfferInstallationItem } from "@/validation/offer-schema";

type SettingRow = { kind: string; price: string | number };

/**
 * Builds the per-offer installation items from the admin defaults, one entry
 * per catalog kind with included=false. Kinds without a settings row fall back
 * to amount 0 so the full catalog is always present on the snapshot.
 */
export function buildDefaultInstallationItems(
  settings: SettingRow[],
): OfferInstallationItem[] {
  const priceByKind = new Map(settings.map((s) => [s.kind, Number(s.price)]));
  return InstallationItemKinds.map((kind) => ({
    kind,
    amount: priceByKind.get(kind) ?? 0,
    included: false,
  }));
}

/** Sums the amounts of the items flagged as included. */
export function sumInstallationTotal(items: OfferInstallationItem[]): number {
  return items
    .filter((item) => item.included)
    .reduce((sum, item) => sum + item.amount, 0);
}
