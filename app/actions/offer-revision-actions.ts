"use server";

import { revalidatePath } from "next/cache";
import { DatabaseError } from "pg";
import { canTransitionRevision } from "@/app/actions/lib/auth-checks";
import { db } from "@/db";
import {
  approveOfferRevisionWithAudit,
  createOfferRevisionFrom,
  getOfferWorkingRevision,
  getUserData,
  getWorkingRevisionForSend,
  markOfferRevisionSentWithAudit,
  QueryError,
  returnOfferRevisionToDraftWithAudit,
  submitOfferRevisionForApprovalWithAudit,
  type TransactionType,
  updateRevisionDiscountWithAudit,
  updateRevisionSettingsWithAudit,
} from "@/db/queries";
import { canApproveRevision, canViewOffer } from "@/lib/access";
import { MSG } from "@/lib/messages";
import { repriceOfferLines } from "@/lib/offer-revision-pricing";
import {
  type OfferSettings,
  offerDiscountSchema,
  offerSettingsSchema,
} from "@/validation/offer-schema";

/**
 * Shared gate for revision header mutations: builds on
 * {@link authorizeOfferLifecycleAction} (offer access + scope + working revision) and
 * adds the pre-handoff edit window — the working revision must be DRAFT, since once it
 * advances the commercial terms freeze with the offer.
 */
async function authorizeRevisionAction(offerId: number) {
  const auth = await authorizeOfferLifecycleAction(offerId);
  if (!auth.success) return auth;
  if (auth.revision.status !== "DRAFT") {
    return { success: false as const, error: MSG.offer.lineCannotEdit };
  }
  return auth;
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
 * frozen latest). Returns the scoped working revision (id + status) without loading the
 * full revision history.
 */
async function authorizeOfferLifecycleAction(offerId: number) {
  const user = await getUserData();
  if (!user)
    return { success: false as const, error: MSG.auth.userNotAuthenticated };

  if (!canViewOffer(user.role)) {
    return { success: false as const, error: MSG.offer.unauthorized };
  }

  const revision = await getOfferWorkingRevision(offerId, user);
  if (!revision) return { success: false as const, error: MSG.offer.notFound };

  return { success: true as const, user, revision };
}

/**
 * Shared tail for the revision lifecycle transitions (submit / approve / reject /
 * send): runs `txFn` in a single transaction, revalidates the offer detail + list
 * routes on success, and maps QueryError / DatabaseError / unknown to the standard
 * Italian error shape. Callers run their own auth + transition-gate checks first.
 */
async function runRevisionTransition(
  offerId: number,
  txFn: (tx: TransactionType) => Promise<void>,
) {
  try {
    await db.transaction(txFn);

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
 * Submits the working revision for manager approval (DRAFT → PENDING_APPROVAL). This is
 * the last DRAFT moment, so every line is re-priced here (its `pricing_snapshot` becomes
 * the as-submitted figure the manager reviews and that is later sent). Once it leaves
 * DRAFT the two-phase editability gate locks the line configs until a manager approves
 * it or hands it back.
 */
export async function submitRevisionForApprovalAction(offerId: number) {
  const auth = await authorizeOfferLifecycleAction(offerId);
  if (!auth.success) return auth;
  const { user, revision } = auth;

  if (!canTransitionRevision(user.role, revision.status, "PENDING_APPROVAL")) {
    return { success: false as const, error: MSG.offer.cannotSubmit };
  }

  return runRevisionTransition(offerId, async (tx) => {
    const working = await getWorkingRevisionForSend(offerId, tx);
    if (!working) throw new QueryError(MSG.offer.notFound, 404);
    if (working.status !== "DRAFT") {
      throw new QueryError(MSG.offer.cannotSubmit, 403);
    }
    // An empty revision must not enter approval — it would freeze empty at send. The
    // UI hides Submit with no lines, but the action is the real boundary.
    if (working.configIds.length === 0) {
      throw new QueryError(MSG.offer.cannotSendEmpty, 422);
    }

    // Re-price while still DRAFT — repricing no-ops once it leaves DRAFT.
    await repriceOfferLines(working.configIds, user.id, tx, { audit: false });

    await submitOfferRevisionForApprovalWithAudit(
      offerId,
      working.id,
      user.id,
      tx,
    );
  });
}

/**
 * Manager approval of a revision for send (PENDING_APPROVAL → APPROVED_TO_SEND),
 * stamping `approved_by` / `approved_at`. Requires a management role
 * ({@link canApproveRevision}); scope (manager → own + direct reports) is already
 * enforced by `authorizeOfferLifecycleAction` via `canAccessOffer`, so self-approval
 * within scope is allowed.
 */
export async function approveRevisionAction(offerId: number) {
  const auth = await authorizeOfferLifecycleAction(offerId);
  if (!auth.success) return auth;
  const { user, revision } = auth;

  if (!canApproveRevision(user.role)) {
    return { success: false as const, error: MSG.offer.unauthorizedApprove };
  }
  if (!canTransitionRevision(user.role, revision.status, "APPROVED_TO_SEND")) {
    return { success: false as const, error: MSG.offer.cannotApprove };
  }

  return runRevisionTransition(offerId, async (tx) => {
    await approveOfferRevisionWithAudit(offerId, revision.id, user.id, tx);
  });
}

/**
 * Returns a revision to DRAFT — a manager hand-back from PENDING_APPROVAL, or an
 * un-approve from APPROVED_TO_SEND. Clears `approved_by` / `approved_at`; the line
 * configs unlock for the agent to revise and re-submit. Requires a management role.
 */
export async function rejectRevisionAction(offerId: number) {
  const auth = await authorizeOfferLifecycleAction(offerId);
  if (!auth.success) return auth;
  const { user, revision } = auth;

  if (!canApproveRevision(user.role)) {
    return { success: false as const, error: MSG.offer.unauthorizedApprove };
  }
  const from = revision.status;
  if (from !== "PENDING_APPROVAL" && from !== "APPROVED_TO_SEND") {
    return { success: false as const, error: MSG.offer.cannotReturnToDraft };
  }
  if (!canTransitionRevision(user.role, from, "DRAFT")) {
    return { success: false as const, error: MSG.offer.cannotReturnToDraft };
  }

  return runRevisionTransition(offerId, async (tx) => {
    await returnOfferRevisionToDraftWithAudit(
      offerId,
      revision.id,
      user.id,
      from,
      tx,
    );
  });
}

/**
 * Freezes an approved revision as sent (APPROVED_TO_SEND → SENT) with a `sent_at` stamp.
 * The lines were already re-priced at submit, so there is no re-pricing here. Once SENT
 * the two-phase editability gate keeps the line configs locked.
 */
export async function sendRevisionAction(offerId: number) {
  const auth = await authorizeOfferLifecycleAction(offerId);
  if (!auth.success) return auth;
  const { user, revision } = auth;

  if (!canTransitionRevision(user.role, revision.status, "SENT")) {
    return { success: false as const, error: MSG.offer.cannotSend };
  }

  return runRevisionTransition(offerId, async (tx) => {
    const working = await getWorkingRevisionForSend(offerId, tx);
    if (!working) throw new QueryError(MSG.offer.notFound, 404);
    if (working.status !== "APPROVED_TO_SEND") {
      throw new QueryError(MSG.offer.cannotSend, 403);
    }

    await markOfferRevisionSentWithAudit(offerId, working.id, user.id, tx);
  });
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
  const { user } = auth;

  try {
    const newRevisionNo = await db.transaction(async (tx) => {
      // `sourceRevisionNo` is undefined for the normal "next revision"; the default
      // (latest) is resolved inside createOfferRevisionFrom under the offer row lock,
      // so it can't go stale against a concurrent send/create.
      const { revisionNo, configIds } = await createOfferRevisionFrom(
        offerId,
        sourceRevisionNo,
        user.id,
        tx,
      );

      await repriceOfferLines(configIds, user.id, tx, { audit: false });

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
