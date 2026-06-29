"use server";

import { revalidatePath } from "next/cache";
import { DatabaseError } from "pg";
import { db } from "@/db";
import {
  createOfferRevisionFrom,
  getOfferWithRevisionAndLines,
  getUserData,
  getWorkingRevisionForSend,
  markOfferRevisionSentWithAudit,
  QueryError,
  updateRevisionDiscountWithAudit,
  updateRevisionSettingsWithAudit,
} from "@/db/queries";
import { canViewOffer } from "@/lib/access";
import { MSG } from "@/lib/messages";
import { repriceOfferLine } from "@/lib/offer-revision-pricing";
import {
  type OfferSettings,
  offerDiscountSchema,
  offerSettingsSchema,
} from "@/validation/offer-schema";

/**
 * Shared gate for revision header mutations: offer access (ENGINEER excluded),
 * ownership/scope, and the pre-handoff edit window (revision 1 must be DRAFT — once
 * it advances the commercial terms freeze with the offer).
 */
async function authorizeRevisionAction(offerId: number) {
  const user = await getUserData();
  if (!user)
    return { success: false as const, error: MSG.auth.userNotAuthenticated };

  if (!canViewOffer(user.role)) {
    return { success: false as const, error: MSG.offer.unauthorized };
  }

  const offer = await getOfferWithRevisionAndLines(offerId, user);
  if (!offer) return { success: false as const, error: MSG.offer.notFound };

  const revision = offer.revisions[0];
  if (!revision) return { success: false as const, error: MSG.offer.notFound };
  if (revision.status !== "DRAFT") {
    return { success: false as const, error: MSG.offer.lineCannotEdit };
  }

  return { success: true as const, user, revision };
}

export async function setRevisionDiscountAction(
  offerId: number,
  discount_pct: number,
) {
  const parsed = offerDiscountSchema.safeParse({ discount_pct });
  if (!parsed.success) {
    return { success: false as const, error: MSG.offer.invalidDiscount };
  }

  const auth = await authorizeRevisionAction(offerId);
  if (!auth.success) return auth;
  const { user, revision } = auth;

  try {
    await updateRevisionDiscountWithAudit({
      revisionId: revision.id,
      discount_pct: parsed.data.discount_pct.toFixed(2),
      updated_by: user.id,
    });

    revalidatePath(`/offerte/${offerId}`);
    return { success: true as const };
  } catch (err) {
    if (err instanceof QueryError) {
      return { success: false as const, error: err.message };
    }
    if (err instanceof DatabaseError) {
      return { success: false as const, error: MSG.db.error };
    }
    return { success: false as const, error: MSG.db.unknown };
  }
}

export async function setRevisionSettingsAction(
  offerId: number,
  settings: OfferSettings,
) {
  const parsed = offerSettingsSchema.safeParse(settings);
  if (!parsed.success) {
    return {
      success: false as const,
      error: parsed.error.issues[0]?.message ?? MSG.offer.invalidSettings,
    };
  }

  const auth = await authorizeRevisionAction(offerId);
  if (!auth.success) return auth;
  const { user, revision } = auth;

  try {
    const { transport_amount, ...rest } = parsed.data;
    await updateRevisionSettingsWithAudit({
      revisionId: revision.id,
      settings: { ...rest, transport_amount: transport_amount.toFixed(2) },
      updated_by: user.id,
    });

    revalidatePath(`/offerte/${offerId}`);
    return { success: true as const };
  } catch (err) {
    if (err instanceof QueryError) {
      return { success: false as const, error: err.message };
    }
    if (err instanceof DatabaseError) {
      return { success: false as const, error: MSG.db.error };
    }
    return { success: false as const, error: MSG.db.unknown };
  }
}

/**
 * Shared offer-access + scope gate for the revision lifecycle actions (send / create).
 * Unlike {@link authorizeRevisionAction} it does NOT require the working revision to be
 * DRAFT — those actions carry their own state guards (send needs DRAFT, create needs a
 * frozen latest). Returns the scoped offer so the caller can read the latest revision.
 */
async function authorizeOfferLifecycleAction(offerId: number) {
  const user = await getUserData();
  if (!user)
    return { success: false as const, error: MSG.auth.userNotAuthenticated };

  if (!canViewOffer(user.role)) {
    return { success: false as const, error: MSG.offer.unauthorized };
  }

  const offer = await getOfferWithRevisionAndLines(offerId, user);
  if (!offer) return { success: false as const, error: MSG.offer.notFound };

  return { success: true as const, user, offer };
}

/**
 * Freezes the offer's working revision as sent: re-prices every line (so its
 * `pricing_snapshot` is the authoritative as-sent figure) then flips the revision to
 * `SENT` with a `sent_at` stamp. Once SENT the two-phase editability gate locks the
 * line configs. Phase 5 inserts the approval states ahead of this; for now it is a
 * direct DRAFT → SENT transition.
 */
export async function sendRevisionAction(offerId: number) {
  const auth = await authorizeOfferLifecycleAction(offerId);
  if (!auth.success) return auth;
  const { user } = auth;

  try {
    await db.transaction(async (tx) => {
      const working = await getWorkingRevisionForSend(offerId, tx);
      if (!working) throw new QueryError(MSG.offer.notFound, 404);
      if (working.status !== "DRAFT") {
        throw new QueryError(MSG.offer.cannotSend, 403);
      }
      // An empty revision must not freeze as the immutable as-sent record — the UI
      // hides Send when there are no lines, but the action is the real boundary
      // (direct invocation, or the last line removed in another tab mid-send).
      if (working.configIds.length === 0) {
        throw new QueryError(MSG.offer.cannotSendEmpty, 422);
      }

      // Re-price while still DRAFT — repriceOfferLine no-ops once frozen.
      for (const configId of working.configIds) {
        await repriceOfferLine(configId, user.id, tx, { audit: false });
      }

      await markOfferRevisionSentWithAudit(offerId, working.id, user.id, tx);
    });

    revalidatePath(`/offerte/${offerId}`);
    revalidatePath("/offerte");
    return { success: true as const };
  } catch (err) {
    if (err instanceof QueryError) {
      return { success: false as const, error: err.message };
    }
    if (err instanceof DatabaseError) {
      return { success: false as const, error: MSG.db.error };
    }
    return { success: false as const, error: MSG.db.unknown };
  }
}

/**
 * Clone-forward: creates a new working revision from a source revision (defaults to the
 * latest — the normal "next revision"; passing an earlier `revision_no` reverts to it).
 * Deep-clones each line's config + sub-records into fresh editable rows and re-prices
 * them. Requires the latest revision to be frozen (guarded in `createOfferRevisionFrom`).
 */
export async function createRevisionAction(
  offerId: number,
  sourceRevisionNo?: number,
) {
  const auth = await authorizeOfferLifecycleAction(offerId);
  if (!auth.success) return auth;
  const { user, offer } = auth;

  const latestNo = offer.revisions[0]?.revision_no;
  if (latestNo === undefined) {
    return { success: false as const, error: MSG.offer.notFound };
  }

  try {
    const newRevisionNo = await db.transaction(async (tx) => {
      const { revisionNo, configIds } = await createOfferRevisionFrom(
        offerId,
        sourceRevisionNo ?? latestNo,
        user.id,
        tx,
      );

      for (const configId of configIds) {
        await repriceOfferLine(configId, user.id, tx, { audit: false });
      }

      return revisionNo;
    });

    revalidatePath(`/offerte/${offerId}`);
    revalidatePath("/offerte");
    return { success: true as const, data: { revisionNo: newRevisionNo } };
  } catch (err) {
    if (err instanceof QueryError) {
      return { success: false as const, error: err.message };
    }
    if (err instanceof DatabaseError) {
      return { success: false as const, error: MSG.db.error };
    }
    return { success: false as const, error: MSG.db.unknown };
  }
}
