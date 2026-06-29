import { sumInstallationTotal } from "@/lib/offer-installation";
import type { TransportMode } from "@/types";
import { InstallationItemKinds } from "@/types";
import {
  type OfferInstallationItem,
  offerInstallationItemsSchema,
} from "@/validation/offer-schema";

/** Offer-level presentation settings (transport/installation), in display form. */
export interface OfferDisplaySettings {
  show_net_total_only: boolean;
  transport_amount: number;
  transport_mode: TransportMode;
  /** Same mode values as transport: TBD means installation is not in the offer price. */
  installation_mode: TransportMode;
  installation_items: OfferInstallationItem[];
}

/**
 * Source columns for {@link parseOfferSettings} — the presentation fields shared by
 * the offer revision header (the new commercial source of truth).
 */
export interface OfferSettingsSource {
  show_net_total_only: boolean;
  transport_amount: string;
  transport_mode: TransportMode;
  installation_mode: TransportMode;
  installation_items: unknown;
}

/**
 * Converts the revision's settings columns to display form. The stored
 * installation items are merged over the full catalog so offers created
 * before a catalog extension still show every kind.
 */
export function parseOfferSettings(
  snapshot: OfferSettingsSource,
): OfferDisplaySettings {
  const parsed = offerInstallationItemsSchema.safeParse(
    snapshot.installation_items,
  );
  const storedByKind = new Map(
    (parsed.success ? parsed.data : []).map((item) => [item.kind, item]),
  );
  return {
    show_net_total_only: snapshot.show_net_total_only,
    transport_amount: Number(snapshot.transport_amount),
    transport_mode: snapshot.transport_mode,
    installation_mode: snapshot.installation_mode,
    installation_items: InstallationItemKinds.map(
      (kind) => storedByKind.get(kind) ?? { kind, amount: 0, included: false },
    ),
  };
}

export interface OfferSummaryRow {
  label: string;
  /** null renders a row without an amount (e.g. "Trasporto compreso"). */
  amount: number | null;
}

export interface OfferSummaryExtras {
  transportRow: OfferSummaryRow;
  installationRow: OfferSummaryRow;
  net_total: number;
  /** True when transport/installation change the payable total beyond the discounted total. */
  hasNetAdjustments: boolean;
}

/**
 * Computes the riepilogo rows added by transport and installation settings,
 * plus the final net total. Shared by the offer view, Excel and PDF exports.
 *
 * Both costs follow the same mode semantics: INCLUDED adds the amount to the
 * total without showing it; SEPARATE shows the amount without adding it; TBD
 * shows "da definire" and ignores the amount. The installation amount is the
 * sum of the items flagged as included.
 */
export function computeOfferSummaryExtras(
  settings: OfferDisplaySettings,
  discountedTotal: number,
): OfferSummaryExtras {
  const transportRowByMode: Record<TransportMode, OfferSummaryRow> = {
    INCLUDED: { label: "Trasporto compreso", amount: null },
    SEPARATE: { label: "Trasporto a parte", amount: settings.transport_amount },
    TBD: { label: "Trasporto: da definire", amount: null },
  };
  const transportAdded =
    settings.transport_mode === "INCLUDED" ? settings.transport_amount : 0;

  const installationTotal = sumInstallationTotal(settings.installation_items);
  const installationRowByMode: Record<TransportMode, OfferSummaryRow> = {
    INCLUDED: { label: "Installazione compresa", amount: null },
    SEPARATE: { label: "Installazione a parte", amount: installationTotal },
    TBD: { label: "Installazione: da definire", amount: null },
  };
  const installationAdded =
    settings.installation_mode === "INCLUDED" ? installationTotal : 0;

  const net_total = discountedTotal + transportAdded + installationAdded;

  return {
    transportRow: transportRowByMode[settings.transport_mode],
    installationRow: installationRowByMode[settings.installation_mode],
    net_total,
    hasNetAdjustments: net_total !== discountedTotal,
  };
}
