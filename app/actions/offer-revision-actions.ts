"use server";

import { revalidatePath } from "next/cache";
import { canTransitionRevision } from "@/app/actions/lib/auth-checks";
import { firstZodIssueMessage } from "@/app/actions/lib/first-zod-issue-message";
import { mapActionError } from "@/app/actions/lib/map-action-error";
import { db } from "@/db";
import { loadValidatedConfiguration } from "@/db/load-validated-configuration";
import {
  acceptOfferRevisionWithAudit,
  approveOfferRevisionWithAudit,
  createOfferRevisionFrom,
  createRenegotiationRevisionFrom,
  getConfigsForEnergyChainCheck,
  getOfferWorkingRevision,
  getUserData,
  getWorkingRevisionForSend,
  markOfferRevisionSentWithAudit,
  QueryError,
  recordOfferRevisionOutcomeWithAudit,
  returnOfferRevisionToDraftWithAudit,
  submitOfferRevisionForApprovalWithAudit,
  type TransactionType,
  unacceptOfferRevisionWithAudit,
  updateRevisionDiscountWithAudit,
  updateRevisionSettingsWithAudit,
} from "@/db/queries";
import {
  canApproveRevision,
  canRenegotiateOffer,
  canViewOffer,
} from "@/lib/access";
import { violatesEnergyChainInvariant } from "@/lib/configuration/energy-chain";
import { MSG } from "@/lib/messages";
import { repriceOfferLines } from "@/lib/offer-revision-pricing";
import type { OfferConfigSnapshot } from "@/validation/offer-config-snapshot-schema";
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
    return mapActionError(err, "Failed to set revision discount:");
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
      error: firstZodIssueMessage(parsed.error, MSG.offer.invalidSettings),
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
    return mapActionError(err, "Failed to set revision settings:");
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
    return mapActionError(err, "Offer revision transition failed:");
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

    // Cross-entity invariant gate: no line may enter approval while an
    // ENERGY_CHAIN config lacks a qualifying bay (gantry + chain width).
    const lineConfigs = await getConfigsForEnergyChainCheck(
      working.configIds,
      tx,
    );
    for (const cfg of lineConfigs) {
      if (violatesEnergyChainInvariant(cfg.supply_type, cfg.wash_bays)) {
        throw new QueryError(MSG.offer.lineEnergyChainInvalid(cfg.name), 422);
      }
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
    return mapActionError(err, "Failed to create offer revision:");
  }
}

/**
 * Opens a post-acceptance **renegotiation revision** (#85): a commercial-only working
 * revision cloned from the in-force accepted revision, whose lines reference the
 * current engineering configs read-only (no deep-clone) and are re-priced from them —
 * the customer is re-quoted what engineering says the machine currently is. Gated to
 * ADMIN / SALES_DIRECTOR (`canRenegotiateOffer`) on top of the offer-access gate;
 * state guards (offer accepted, no open working revision) live in
 * `createRenegotiationRevisionFrom`.
 */
export async function createRenegotiationRevisionAction(offerId: number) {
  const auth = await authorizeOfferLifecycleAction(offerId);
  if (!auth.success) return auth;
  const { user } = auth;

  if (!canRenegotiateOffer(user.role)) {
    return {
      success: false as const,
      error: MSG.offer.renegotiationUnauthorized,
    };
  }

  try {
    const result = await db.transaction(async (tx) => {
      const { revisionNo, configIds } = await createRenegotiationRevisionFrom(
        offerId,
        user.id,
        tx,
      );

      // The automatic re-quote: derive the new lines' pricing from the current
      // engineering configs in the same transaction.
      await repriceOfferLines(configIds, user.id, tx, { audit: false });

      return { revisionNo, configIds };
    });

    revalidatePath(`/offerte/${offerId}`);
    revalidatePath("/offerte");
    // The margin pages show the "renegotiation open" state.
    for (const configId of result.configIds) {
      revalidatePath(`/configurazioni/marginalita/${configId}`);
    }
    return { success: true as const, data: { revisionNo: result.revisionNo } };
  } catch (err) {
    return mapActionError(err, "Failed to create renegotiation revision:");
  }
}

/**
 * Records customer acceptance of the SENT working revision (SENT → ACCEPTED) and hands
 * every line config off to engineering: each flips to `SALES_APPROVED` with an
 * at-acceptance as-sold freeze written onto its line, and the offer locks
 * (`accepted_revision_id`). Any offer-access role within scope can record the outcome —
 * recording what the customer decided is not a management gate.
 *
 * Each line's config form-shape is loaded here (pooled reads, before the tx) and frozen
 * inside the tx, mirroring the old as-sold freeze pattern.
 */
export async function acceptRevisionAction(offerId: number) {
  const auth = await authorizeOfferLifecycleAction(offerId);
  if (!auth.success) return auth;
  const { user, revision } = auth;

  if (!canTransitionRevision(user.role, revision.status, "ACCEPTED")) {
    return { success: false as const, error: MSG.offer.cannotAccept };
  }

  const working = await getWorkingRevisionForSend(offerId);
  if (!working) return { success: false as const, error: MSG.offer.notFound };
  if (working.status !== "SENT") {
    return { success: false as const, error: MSG.offer.cannotAccept };
  }
  if (working.configIds.length === 0) {
    return { success: false as const, error: MSG.offer.cannotSendEmpty };
  }

  const asSoldByConfigId: Record<number, OfferConfigSnapshot> = {};
  for (const configId of working.configIds) {
    const loaded = await loadValidatedConfiguration(configId, user);
    if (!loaded) return { success: false as const, error: MSG.config.notFound };
    asSoldByConfigId[configId] = {
      configuration: loaded.configuration,
      waterTanks: loaded.waterTanks,
      washBays: loaded.washBays,
    };
  }

  try {
    await db.transaction(async (tx) => {
      await acceptOfferRevisionWithAudit(
        offerId,
        working.id,
        user.id,
        asSoldByConfigId,
        tx,
      );
    });

    revalidatePath(`/offerte/${offerId}`);
    revalidatePath("/offerte");
    // The line configs are now SALES_APPROVED — refresh the engineering surfaces.
    // The margin pages re-baseline on the newly frozen lines (relevant on a
    // renegotiation re-acceptance, where the new prices can clear the alert).
    revalidatePath("/configurazioni");
    for (const configId of working.configIds) {
      revalidatePath(`/configurazioni/modifica/${configId}`);
      revalidatePath(`/configurazioni/visualizza/${configId}`);
      revalidatePath(`/configurazioni/bom/${configId}`);
      revalidatePath(`/configurazioni/marginalita/${configId}`);
    }
    return { success: true as const };
  } catch (err) {
    return mapActionError(err, "Failed to accept offer revision:");
  }
}

/**
 * ADMIN-only correction for a mistaken acceptance: reverts the in-force accepted
 * revision ACCEPTED → SENT, unlocks the offer (`accepted_revision_id` → null), unwinds
 * the per-line as-sold freeze, and returns each line config to DRAFT (out of the
 * engineering queue). Refused if any config has already advanced past SALES_APPROVED or
 * if the acceptance was a renegotiation re-acceptance — both guarded in
 * `unacceptOfferRevisionWithAudit`. The ADMIN-only ACCEPTED → SENT edge lives in
 * `canTransitionRevision`.
 */
export async function unacceptRevisionAction(offerId: number) {
  const auth = await authorizeOfferLifecycleAction(offerId);
  if (!auth.success) return auth;
  const { user, revision } = auth;

  if (!canTransitionRevision(user.role, revision.status, "SENT")) {
    return { success: false as const, error: MSG.offer.cannotUnaccept };
  }

  const working = await getWorkingRevisionForSend(offerId);
  if (!working) return { success: false as const, error: MSG.offer.notFound };
  if (working.status !== "ACCEPTED") {
    return { success: false as const, error: MSG.offer.cannotUnaccept };
  }

  try {
    await db.transaction(async (tx) => {
      await unacceptOfferRevisionWithAudit(offerId, working.id, user.id, tx);
    });

    revalidatePath(`/offerte/${offerId}`);
    revalidatePath("/offerte");
    // The line configs are back to DRAFT and out of the engineering queue — refresh
    // the same surfaces the acceptance touched.
    revalidatePath("/configurazioni");
    for (const configId of working.configIds) {
      revalidatePath(`/configurazioni/modifica/${configId}`);
      revalidatePath(`/configurazioni/visualizza/${configId}`);
      revalidatePath(`/configurazioni/bom/${configId}`);
      revalidatePath(`/configurazioni/marginalita/${configId}`);
    }
    return { success: true as const };
  } catch (err) {
    return mapActionError(err, "Failed to unaccept offer revision:");
  }
}

/**
 * Records a non-accepting customer outcome on the SENT working revision: REJECTED
 * (customer declined) or EXPIRED (validity lapsed). Terminal for that revision; the
 * configs are untouched and a new revision can still be cloned forward. Any offer-access
 * role within scope can record it.
 */
export async function recordRevisionOutcomeAction(
  offerId: number,
  outcome: "REJECTED" | "EXPIRED",
) {
  const auth = await authorizeOfferLifecycleAction(offerId);
  if (!auth.success) return auth;
  const { user, revision } = auth;

  if (!canTransitionRevision(user.role, revision.status, outcome)) {
    return { success: false as const, error: MSG.offer.cannotRecordOutcome };
  }

  return runRevisionTransition(offerId, async (tx) => {
    const working = await getWorkingRevisionForSend(offerId, tx);
    if (!working) throw new QueryError(MSG.offer.notFound, 404);
    if (working.status !== "SENT") {
      throw new QueryError(MSG.offer.cannotRecordOutcome, 403);
    }
    await recordOfferRevisionOutcomeWithAudit(
      offerId,
      working.id,
      user.id,
      outcome,
      tx,
    );
  });
}
