import type { DatabaseType, TransactionType } from "@/db/queries";
import {
  getSurchargeSettings,
  insertActivityLog,
  loadConfigForPricing,
  offerRevisionLineForConfig,
  QueryError,
  updateOfferRevisionLinePricing,
} from "@/db/queries";
import type { ConfigurationWithWaterTanksAndWashBays } from "@/db/schemas";
import { MSG } from "@/lib/messages";
import { computeOfferListPricing, type OfferLineItem } from "@/lib/offer";
import { computeNetPrice, round2 } from "@/lib/utils";

export interface LinePricing {
  /** Per single unit; quantity is applied at display/summary time, never folded in. */
  list_price: number;
  /** Per single unit: list_price allocated for the revision header discount. */
  net_price: number;
  /** BOM line items + surcharges — feeds the quote view via prepareOfferDisplayData. */
  pricing_snapshot: OfferLineItem[];
}

type SurchargeSetting = { kind: string; price: string | number };

/**
 * Computes a single offer line's pricing from its configuration's live BOM, reusing
 * the shared computeOfferListPricing pipeline: BOM list prices + applicable
 * surcharges give the per-unit list price; the header discount yields the per-unit
 * net price; the combined item list is stored as the line's pricing_snapshot so the
 * quote view renders without rebuilding the BOM.
 *
 * Returns { ok: false } when a triggered surcharge has no configured price, so the
 * caller can fail loudly before persisting bad pricing.
 */
export async function computeLinePricing(
  configuration: ConfigurationWithWaterTanksAndWashBays,
  discountPct: number,
  surchargeSettings: SurchargeSetting[],
): Promise<{ ok: true; pricing: LinePricing } | { ok: false }> {
  const result = await computeOfferListPricing(
    configuration,
    surchargeSettings,
  );
  if (!result.ok) return { ok: false };

  const list_price = round2(result.total_list_price);
  return {
    ok: true,
    pricing: {
      list_price,
      net_price: computeNetPrice(list_price, discountPct),
      pricing_snapshot: result.items,
    },
  };
}

/**
 * Re-prices the offer revision line that owns `configId` from its live BOM, in the
 * caller's transaction. No-op when the revision is not DRAFT (frozen/handed-off
 * lines must not move; editability is already gated upstream, this is a defensive
 * guard). Throws QueryError when an OFFER config has no line row (invariant
 * violation) or a triggered surcharge has no configured price, so the whole
 * mutation rolls back.
 *
 * `opts.audit` defaults to true; pass false on first pricing (the OFFER_LINE_ADD log
 * already records the creation and its price).
 */
export async function repriceOfferLine(
  configId: number,
  userId: string,
  txOrDb: DatabaseType | TransactionType,
  opts: { audit?: boolean } = {},
): Promise<void> {
  const line = await offerRevisionLineForConfig(configId, txOrDb);
  // An OFFER config must own a line; a missing one is data drift, not a no-op.
  if (!line) throw new QueryError(MSG.offer.notFound, 404);
  // A non-DRAFT revision is frozen/handed-off: leave its as-sold pricing untouched.
  if (line.status !== "DRAFT") return;

  const configuration = await loadConfigForPricing(configId, txOrDb);
  if (!configuration) throw new QueryError(MSG.config.notFound, 404);

  const surchargeSettings = await getSurchargeSettings();
  const result = await computeLinePricing(
    configuration,
    Number(line.discount_pct),
    surchargeSettings,
  );
  if (!result.ok) {
    throw new QueryError(MSG.surcharge.priceNotConfigured, 400);
  }

  await updateOfferRevisionLinePricing(line.lineId, result.pricing, txOrDb);

  if (opts.audit !== false) {
    await insertActivityLog(
      {
        userId,
        action: "OFFER_LINE_REPRICE",
        targetEntity: "offer_revision_line",
        targetId: line.lineId.toString(),
        metadata: {
          list_price: result.pricing.list_price.toFixed(2),
          net_price: result.pricing.net_price.toFixed(2),
        },
      },
      txOrDb,
    );
  }
}
