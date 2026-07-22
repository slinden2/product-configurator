import type { OfferWithRevisionAndLines } from "@/db/queries";
import type { GroupedOfferData } from "@/lib/offer";
import { prepareOfferDisplayData } from "@/lib/offer";
import {
  buildSupplyConditions,
  computeOfferSummaryExtras,
  type OfferDisplaySettings,
  type OfferSettingsSource,
  type OfferSummaryExtras,
  parseOfferSettings,
  type SupplyConditionLine,
} from "@/lib/offer-settings";
import type { OfferSurchargeItem } from "@/validation/offer/offer-pricing-schema";

type OfferRevision = OfferWithRevisionAndLines["revisions"][number];

/** Grouped BOM (with totals) of a single line, as produced by prepareOfferDisplayData. */
type LineDisplayData = GroupedOfferData & {
  total_list_price: number;
  discounted_total: number;
};

/** One offer line (configuration) ready for rendering in the export document. */
export interface OfferExportLine {
  /** "Pos. N — name", mirroring the on-screen QuoteView line title. */
  title: string;
  quantity: number;
  /** Authoritative stored per-unit list price; line total = unitListPrice × quantity. */
  unitListPrice: number;
  data: LineDisplayData;
  surcharges: OfferSurchargeItem[];
}

/**
 * Fully serializable payload for the offer Excel/PDF generators. Built
 * server-side (lib/offer.ts is not client-safe) and consumed by the client
 * generators, which import only types from it.
 */
export interface OfferRevisionExportData {
  offerNumber: string;
  customerName: string;
  customerAddress: string | null;
  customerEmail: string | null;
  revisionNo: number;
  discountPct: number;
  /** False in net-total-only mode: the price columns/subtotals are dropped. */
  showPrices: boolean;
  lines: OfferExportLine[];
  totalListPrice: number;
  discountedTotal: number;
  extras: OfferSummaryExtras;
  /** The resolved "Condizioni di fornitura" list (placeholders already applied). */
  supplyConditions: SupplyConditionLine[];
}

/** Offer header fields the export needs; a subset of {@link OfferWithRevisionAndLines}. */
type OfferHeaderForExport = Pick<
  OfferWithRevisionAndLines,
  "offer_number" | "customer_name" | "customer_address" | "customer_email"
>;

/**
 * The "Pos. N — customer" line title shared by the quote view and the export.
 * `position` is the stored 0-based line position; the title is 1-based.
 */
export function offerLineTitle(position: number, customerName: string): string {
  return `Pos. ${position + 1} — ${customerName}`;
}

/**
 * Offer-level totals: the sum of each line's stored per-unit pricing × quantity.
 * The header discount and transport/installation apply once, at the offer level,
 * so the discounted total (sum of line nets) is authoritative. Lines without a
 * BOM snapshot still carry stored prices, so they count toward both totals.
 */
export function computeRevisionTotals(revision: OfferRevision): {
  totalListPrice: number;
  discountedTotal: number;
} {
  const totalListPrice = revision.lines.reduce(
    (sum, line) => sum + Number(line.list_price) * line.quantity,
    0,
  );
  const discountedTotal = revision.lines.reduce(
    (sum, line) => sum + Number(line.net_price) * line.quantity,
    0,
  );
  return { totalListPrice, discountedTotal };
}

/**
 * The offer-summary derivation shared by the quote view and the export builder:
 * parse the revision's presentation settings, decide whether list prices are
 * shown (net-total-only mode drops them), and compute the transport/installation
 * riepilogo from the discounted total.
 */
export function deriveOfferSummary(
  settingsSource: OfferSettingsSource,
  discountedTotal: number,
): {
  settings: OfferDisplaySettings;
  showPrices: boolean;
  extras: OfferSummaryExtras;
} {
  const settings = parseOfferSettings(settingsSource);
  return {
    settings,
    showPrices: !settings.show_net_total_only,
    extras: computeOfferSummaryExtras(settings, discountedTotal),
  };
}

/**
 * Assembles the export payload for one revision. Per-line grouped display data,
 * offer-level totals from the stored per-unit prices, and the transport/
 * installation riepilogo all come from the same helpers QuoteView
 * (app/offerte/[id]/quote-view.tsx) renders from, so the two never drift. Lines
 * whose snapshot yields no BOM are skipped in the line list but still counted in
 * the totals (see {@link computeRevisionTotals}).
 */
export function buildOfferRevisionExportData(
  offer: OfferHeaderForExport,
  revision: OfferRevision,
): OfferRevisionExportData {
  const discountPct = Number(revision.discount_pct);

  const lines: OfferExportLine[] = [];
  for (const line of revision.lines) {
    const { displayData, surcharges } = prepareOfferDisplayData(
      line.pricing_snapshot,
      discountPct,
    );
    if (!displayData) continue;
    lines.push({
      title: offerLineTitle(line.position, offer.customer_name),
      quantity: line.quantity,
      unitListPrice: Number(line.list_price),
      data: displayData,
      surcharges,
    });
  }

  const { totalListPrice, discountedTotal } = computeRevisionTotals(revision);
  const { settings, showPrices, extras } = deriveOfferSummary(
    revision,
    discountedTotal,
  );

  return {
    offerNumber: offer.offer_number,
    customerName: offer.customer_name,
    customerAddress: offer.customer_address ?? null,
    customerEmail: offer.customer_email ?? null,
    revisionNo: revision.revision_no,
    discountPct,
    showPrices,
    lines,
    totalListPrice,
    discountedTotal,
    extras,
    supplyConditions: buildSupplyConditions(
      settings,
      offer.customer_address ?? null,
    ),
  };
}
