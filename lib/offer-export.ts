import type { OfferWithRevisionAndLines } from "@/db/queries";
import type { GroupedOfferData } from "@/lib/offer";
import { prepareOfferDisplayData } from "@/lib/offer";
import {
  computeOfferSummaryExtras,
  type OfferSummaryExtras,
  parseOfferSettings,
} from "@/lib/offer-settings";
import type { OfferSurchargeItem } from "@/validation/offer-schema";

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
}

/** Offer header fields the export needs; a subset of {@link OfferWithRevisionAndLines}. */
type OfferHeaderForExport = Pick<
  OfferWithRevisionAndLines,
  "offer_number" | "customer_name" | "customer_address" | "customer_email"
>;

/**
 * Assembles the export payload for one revision, mirroring the math in
 * QuoteView (app/offerte/[id]/quote-view.tsx): per-line grouped display data,
 * offer-level totals from the stored per-unit prices, and the transport/
 * installation riepilogo. Lines whose snapshot yields no BOM are skipped.
 */
export function buildOfferRevisionExportData(
  offer: OfferHeaderForExport,
  revision: OfferRevision,
): OfferRevisionExportData {
  const discountPct = Number(revision.discount_pct);
  const settings = parseOfferSettings(revision);

  const lines: OfferExportLine[] = [];
  for (const line of revision.lines) {
    const { displayData, surcharges } = prepareOfferDisplayData(
      line.pricing_snapshot,
      discountPct,
    );
    if (!displayData) continue;
    lines.push({
      title: `Pos. ${line.position + 1} — ${
        line.configuration.name || "Configurazione"
      }`,
      quantity: line.quantity,
      unitListPrice: Number(line.list_price),
      data: displayData,
      surcharges,
    });
  }

  // Offer-level totals are the sum of each line's stored per-unit pricing ×
  // quantity; the header discount and transport/installation apply once.
  const totalListPrice = revision.lines.reduce(
    (sum, line) => sum + Number(line.list_price) * line.quantity,
    0,
  );
  const discountedTotal = revision.lines.reduce(
    (sum, line) => sum + Number(line.net_price) * line.quantity,
    0,
  );

  return {
    offerNumber: offer.offer_number,
    customerName: offer.customer_name,
    customerAddress: offer.customer_address ?? null,
    customerEmail: offer.customer_email ?? null,
    revisionNo: revision.revision_no,
    discountPct,
    showPrices: !settings.show_net_total_only,
    lines,
    totalListPrice,
    discountedTotal,
    extras: computeOfferSummaryExtras(settings, discountedTotal),
  };
}
