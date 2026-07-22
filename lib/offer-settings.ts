import { sumInstallationTotal } from "@/lib/offer-installation";
import { formatDateDDMMYYYY } from "@/lib/utils";
import type { TransportMode, WarrantyMonths } from "@/types";
import { InstallationItemKinds, WarrantyMonthsOptions } from "@/types";
import {
  type OfferInstallationItem,
  offerInstallationItemsSchema,
} from "@/validation/offer/offer-settings-schema";

/** Offer-level presentation settings (transport/installation), in display form. */
export interface OfferDisplaySettings {
  show_net_total_only: boolean;
  transport_amount: number;
  transport_mode: TransportMode;
  /** Same mode values as transport: TBD means installation is not in the offer price. */
  installation_mode: TransportMode;
  installation_items: OfferInstallationItem[];
  /** Rounding discount ("Sconto extra") subtracted from the net total; 0 means none. */
  extra_discount_amount: number;
  delivery_date: Date | null;
  /** Empty string means "not set" — the quote falls back to the customer address. */
  delivery_destination: string;
  /** Empty string means "not set" — the quote renders "Da definire". */
  payment_terms: string;
  warranty_months: WarrantyMonths;
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
  extra_discount_amount: string;
  delivery_date: Date | null;
  delivery_destination: string | null;
  payment_terms: string | null;
  warranty_months: number;
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
    extra_discount_amount: Number(snapshot.extra_discount_amount),
    delivery_date: snapshot.delivery_date,
    delivery_destination: snapshot.delivery_destination ?? "",
    payment_terms: snapshot.payment_terms ?? "",
    // A stored value outside the catalog (only reachable by a manual DB edit)
    // normalizes to the contractual default, like malformed items above.
    warranty_months:
      WarrantyMonthsOptions.find((m) => m === snapshot.warranty_months) ?? 12,
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
  /**
   * Rounding discount row ("Sconto extra") with a **negative** amount, so every
   * surface renders it through its standard money row (same convention as the
   * "Sconto %" rows). Null when no extra discount is set or the revision is
   * net-total-only — a discount row would leak the price breakdown that mode
   * hides, so only the already-reduced net total is shown.
   */
  extraDiscountRow: OfferSummaryRow | null;
  net_total: number;
  /**
   * True when an included add-on or the extra discount adjusts the payable
   * total. Presence-based, not a totals comparison: adjustments that exactly
   * cancel out numerically must still reveal the net total, or the document
   * would end on a dangling discount row with no final result.
   */
  hasNetAdjustments: boolean;
}

/**
 * Computes the riepilogo rows added by transport and installation settings,
 * plus the final net total. Shared by the offer view, Excel and PDF exports.
 *
 * Both costs follow the same mode semantics: INCLUDED adds the amount to the
 * total without showing it; SEPARATE shows the amount without adding it; TBD
 * and CUSTOMER (the customer arranges it) render a label-only row and ignore
 * the amount. The installation amount is the sum of the items flagged as
 * included.
 *
 * The extra discount is subtracted last. It is deliberately not clamped: an
 * amount larger than the subtotal yields a negative net total, which the live
 * Riepilogo next to the input makes immediately visible — clamping would
 * silently misstate the arithmetic on a commercial document.
 */
export function computeOfferSummaryExtras(
  settings: OfferDisplaySettings,
  discountedTotal: number,
): OfferSummaryExtras {
  const transportRowByMode: Record<TransportMode, OfferSummaryRow> = {
    INCLUDED: { label: "Trasporto compreso", amount: null },
    SEPARATE: { label: "Trasporto a parte", amount: settings.transport_amount },
    CUSTOMER: { label: "Trasporto a cura cliente", amount: null },
    TBD: { label: "Trasporto: da definire", amount: null },
  };
  const transportAdded =
    settings.transport_mode === "INCLUDED" ? settings.transport_amount : 0;

  const installationTotal = sumInstallationTotal(settings.installation_items);
  const installationRowByMode: Record<TransportMode, OfferSummaryRow> = {
    INCLUDED: { label: "Installazione compresa", amount: null },
    SEPARATE: { label: "Installazione a parte", amount: installationTotal },
    // Not offered by the installation select; defined for enum completeness.
    CUSTOMER: { label: "Installazione a cura cliente", amount: null },
    TBD: { label: "Installazione: da definire", amount: null },
  };
  const installationAdded =
    settings.installation_mode === "INCLUDED" ? installationTotal : 0;

  const extraDiscount = settings.extra_discount_amount;
  const net_total =
    discountedTotal + transportAdded + installationAdded - extraDiscount;

  return {
    transportRow: transportRowByMode[settings.transport_mode],
    installationRow: installationRowByMode[settings.installation_mode],
    extraDiscountRow:
      extraDiscount > 0 && !settings.show_net_total_only
        ? { label: "Sconto extra", amount: -extraDiscount }
        : null,
    net_total,
    hasNetAdjustments:
      transportAdded > 0 || installationAdded > 0 || extraDiscount > 0,
  };
}

export interface SupplyConditionLine {
  label: string;
  /** null renders the label alone (the static "IVA esclusa" line). */
  value: string | null;
}

/**
 * The "Condizioni di fornitura" list (#274), shared by the quote view, Excel and
 * PDF exports so all surfaces resolve the placeholders identically. "IVA esclusa"
 * is always the first line; empty delivery date / payment terms render
 * "Da definire"; an empty destination falls back to the offer's customer address
 * (a live header read — a header correction retroactively changes re-exports,
 * consistent with the documented header-edit behavior).
 */
export function buildSupplyConditions(
  settings: OfferDisplaySettings,
  customerAddress: string | null,
): SupplyConditionLine[] {
  const toBeDefined = "Da definire";
  return [
    { label: "IVA esclusa", value: null },
    {
      label: "Data di consegna",
      value: settings.delivery_date
        ? formatDateDDMMYYYY(settings.delivery_date)
        : toBeDefined,
    },
    {
      label: "Destinazione",
      value: settings.delivery_destination || customerAddress || toBeDefined,
    },
    {
      label: "Modalità di pagamento",
      value: settings.payment_terms || toBeDefined,
    },
    { label: "Garanzia", value: `${settings.warranty_months} mesi` },
  ];
}
