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

interface RepriceOpts {
  /** Defaults to true; pass false on first pricing (the OFFER_LINE_ADD log already
   *  records the creation and its price). */
  audit?: boolean;
  /** Throw (409) instead of silently skipping when the revision is not DRAFT. Pass
   *  true when the caller just inserted the line: a non-DRAFT revision there is
   *  proof of a lost race with submit, and the whole mutation must roll back. */
  requireDraft?: boolean;
}

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
 * caller's transaction. When the revision is not DRAFT (frozen/handed-off lines
 * must not move; editability is already gated upstream) it no-ops as a defensive
 * guard — or throws when `opts.requireDraft` is set (see {@link RepriceOpts}).
 * Throws QueryError when an OFFER config has no line row (invariant violation) or
 * a triggered surcharge has no configured price, so the whole mutation rolls back.
 */
export async function repriceOfferLine(
  configId: number,
  userId: string,
  txOrDb: DatabaseType | TransactionType,
  opts: RepriceOpts = {},
): Promise<void> {
  // Surcharge settings are read in the caller's tx (consistent with the lines being
  // priced) rather than on a separate pooled connection.
  const surchargeSettings = await getSurchargeSettings(txOrDb);
  await repriceLineWithSettings(
    configId,
    userId,
    surchargeSettings,
    txOrDb,
    opts,
  );
}

/**
 * Re-prices every offer line in `configIds` in one pass. Surcharge settings are global
 * and constant for the pass, so they are fetched **once** (in the caller's tx) and
 * reused for every line — avoiding the N identical settings queries a per-line loop of
 * {@link repriceOfferLine} would issue on a clone/send.
 */
export async function repriceOfferLines(
  configIds: number[],
  userId: string,
  txOrDb: DatabaseType | TransactionType,
  opts: RepriceOpts = {},
): Promise<void> {
  if (configIds.length === 0) return;
  const surchargeSettings = await getSurchargeSettings(txOrDb);
  for (const configId of configIds) {
    await repriceLineWithSettings(
      configId,
      userId,
      surchargeSettings,
      txOrDb,
      opts,
    );
  }
}

/** Core re-price of a single line from pre-fetched surcharge settings. */
async function repriceLineWithSettings(
  configId: number,
  userId: string,
  surchargeSettings: SurchargeSetting[],
  txOrDb: DatabaseType | TransactionType,
  opts: RepriceOpts = {},
): Promise<void> {
  const line = await offerRevisionLineForConfig(configId, txOrDb);
  // An OFFER config must own a line; a missing one is data drift, not a no-op.
  if (!line) throw new QueryError(MSG.offer.notFound, 404);
  // A non-DRAFT revision is frozen/handed-off: leave its as-sold pricing untouched.
  // On an add (requireDraft) that freeze is a lost race with submit — fail the tx.
  if (line.status !== "DRAFT") {
    if (opts.requireDraft) {
      throw new QueryError(MSG.offer.lineCannotEdit, 409);
    }
    return;
  }

  const configuration = await loadConfigForPricing(configId, txOrDb);
  if (!configuration) throw new QueryError(MSG.config.notFound, 404);

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
