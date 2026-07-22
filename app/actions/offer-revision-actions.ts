"use server";

import { revalidatePath } from "next/cache";
import { canTransitionRevision } from "@/app/actions/lib/auth-checks";
import {
  authorizeOfferLifecycleAction,
  authorizeRevisionAction,
} from "@/app/actions/lib/authorize";
import { firstZodIssueMessage } from "@/app/actions/lib/first-zod-issue-message";
import { mapActionError } from "@/app/actions/lib/map-action-error";
import { db } from "@/db";
import { loadValidatedConfiguration } from "@/db/load-validated-configuration";
import {
  acceptOfferRevisionWithAudit,
  approveOfferRevisionWithAudit,
  createOfferRevisionFrom,
  createRenegotiationRevisionFrom,
  discardDraftRevisionWithAudit,
  getConfigsForEnergyChainCheck,
  getOfferWithRevisionAndLines,
  getWorkingRevisionForSend,
  lockOfferRow,
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
import { canApproveRevision, canRenegotiateOffer } from "@/lib/access";
import { violatesEnergyChainInvariant } from "@/lib/configuration/energy-chain";
import {
  computeLineMarginAlerts,
  hasActiveMarginAlert,
} from "@/lib/margin-alerts";
import { MSG } from "@/lib/messages";
import {
  firstAcceptedRevisionNo,
  isRenegotiationRevision,
} from "@/lib/offer-renegotiation";
import { repriceOfferLines } from "@/lib/offer-revision-pricing";
import {
  type OfferSettings,
  offerDiscountSchema,
  offerSettingsSchema,
} from "@/validation/offer/offer-settings-schema";
import type { OfferConfigSnapshot } from "@/validation/offer-config-snapshot-schema";

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
      offerId,
      revisionId: revision.id,
      discount_pct: parsed.data.discount_pct.toFixed(2),
      updated_by: user.id,
    });

    revalidatePath(`/offerte/${offerId}`);
    // "/" renders the offer queue cards (counts + oldest-date ages).
    revalidatePath("/");
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
    const { transport_amount, delivery_destination, payment_terms, ...rest } =
      parsed.data;
    await updateRevisionSettingsWithAudit({
      offerId,
      revisionId: revision.id,
      settings: {
        ...rest,
        transport_amount: transport_amount.toFixed(2),
        // Blank optional fields are stored as NULL, mirroring insertOffer.
        delivery_destination: delivery_destination || null,
        payment_terms: payment_terms || null,
      },
      updated_by: user.id,
    });

    revalidatePath(`/offerte/${offerId}`);
    revalidatePath("/");
    return { success: true as const };
  } catch (err) {
    return mapActionError(err, "Failed to set revision settings:");
  }
}

/**
 * Shared tail for the revision lifecycle transitions (submit / approve / reject /
 * send / accept / unaccept): runs `txFn` in a single transaction, revalidates the
 * offer detail + list routes on success, and maps QueryError / DatabaseError /
 * unknown to the standard Italian error shape. Callers run their own auth +
 * transition-gate checks first.
 *
 * A `txFn` that changes the line configs' engineering state (accept / unaccept)
 * returns their ids; the engineering surfaces are then revalidated too — the
 * technical queue plus each config's edit / view / BOM / margin routes (the margin
 * pages re-baseline on the frozen/unfrozen lines).
 */
async function runRevisionTransition(
  offerId: number,
  txFn: (tx: TransactionType) => Promise<number[] | undefined>,
) {
  try {
    const configIds = await db.transaction(txFn);

    revalidatePath(`/offerte/${offerId}`);
    revalidatePath("/offerte");
    revalidatePath("/");
    if (configIds) {
      revalidatePath("/configurazioni");
      for (const configId of configIds) {
        revalidatePath(`/configurazioni/modifica/${configId}`);
        revalidatePath(`/configurazioni/visualizza/${configId}`);
        revalidatePath(`/configurazioni/bom/${configId}`);
        revalidatePath(`/configurazioni/marginalita/${configId}`);
      }
    }
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
    // Serialize against concurrent line adds/removes: the line set validated and
    // re-priced below must be exactly the set the CAS freezes into approval. The
    // lock lives here (not in the WithAudit primitive, unlike accept/unaccept)
    // because these authoritative reads run in the action's txFn before the CAS.
    await lockOfferRow(offerId, tx);

    const working = await getWorkingRevisionForSend(offerId, tx);
    if (!working) throw new QueryError(MSG.offer.notFound);
    if (working.status !== "DRAFT") {
      throw new QueryError(MSG.offer.cannotSubmit);
    }
    // An empty revision must not enter approval — it would freeze empty at send. The
    // UI hides Submit with no lines, but the action is the real boundary.
    if (working.configIds.length === 0) {
      throw new QueryError(MSG.offer.cannotSendEmpty);
    }

    // Cross-entity invariant gate: no line may enter approval while an
    // ENERGY_CHAIN config lacks a qualifying bay (gantry + chain width).
    const lineConfigs = await getConfigsForEnergyChainCheck(
      working.configIds,
      tx,
    );
    for (const cfg of lineConfigs) {
      if (violatesEnergyChainInvariant(cfg.supply_type, cfg.wash_bays)) {
        throw new QueryError(MSG.offer.lineEnergyChainInvalid(cfg.name));
      }
    }

    // Re-price while still DRAFT: this is the as-submitted figure the manager
    // reviews, frozen by the CAS below under the offer row lock. Audited: the
    // lines already carry DRAFT pricing this overwrite destroys, so each line
    // gets an in-tx OFFER_LINE_REPRICE row (unlike the fresh-row creation paths).
    await repriceOfferLines(working.configIds, user.id, tx);

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
    // Single-writer offer lifecycle: the send freeze must not interleave with any
    // structural mutation on this offer (see submitRevisionForApprovalAction).
    await lockOfferRow(offerId, tx);

    const working = await getWorkingRevisionForSend(offerId, tx);
    if (!working) throw new QueryError(MSG.offer.notFound);
    if (working.status !== "APPROVED_TO_SEND") {
      throw new QueryError(MSG.offer.cannotSend);
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
    revalidatePath("/");
    return { success: true as const, data: { revisionNo: newRevisionNo } };
  } catch (err) {
    return mapActionError(err, "Failed to create offer revision:");
  }
}

/**
 * Discards the working DRAFT revision (#266): the exact inverse of
 * {@link createRevisionAction}, hard-deleting the revision, its lines and — for a
 * clone-forward draft — the configurations it owns, so an agent who cloned the wrong
 * source revision is no longer stuck (the only other exits from DRAFT lead forward
 * through the approval gate).
 *
 * `authorizeRevisionAction` supplies offer access + scope + "the working revision is
 * DRAFT". Discarding a **renegotiation** draft is additionally gated to
 * ADMIN / SALES_DIRECTOR, symmetric with who may open one
 * ({@link createRenegotiationRevisionAction}); the state guards and the
 * lines-only cascade live in `discardDraftRevisionWithAudit`, under the offer row lock.
 */
export async function discardDraftRevisionAction(offerId: number) {
  const auth = await authorizeRevisionAction(offerId);
  if (!auth.success) return auth;
  const { user, revision } = auth;

  // The full history: renegotiation-ness is derived from the whole revision list
  // (lib/offer-renegotiation.ts), and a predecessor must exist to fall back to.
  const offer = await getOfferWithRevisionAndLines(offerId, user);
  if (!offer) return { success: false as const, error: MSG.offer.notFound };

  const working = offer.revisions[0];
  if (!working) return { success: false as const, error: MSG.offer.notFound };
  // An offer must always keep at least one revision (re-checked in-tx under the lock).
  if (offer.revisions.length < 2) {
    return {
      success: false as const,
      error: MSG.offer.cannotDiscardFirstRevision,
    };
  }

  const isRenegotiation = isRenegotiationRevision(
    working.revision_no,
    firstAcceptedRevisionNo(offer.revisions),
  );
  if (isRenegotiation && !canRenegotiateOffer(user.role)) {
    return {
      success: false as const,
      error: MSG.offer.unauthorizedDiscardRenegotiation,
    };
  }

  try {
    await db.transaction((tx) =>
      discardDraftRevisionWithAudit(
        offerId,
        revision.id,
        user.id,
        isRenegotiation,
        tx,
      ),
    );

    // Mirrors createRevisionAction: pre-handoff OFFER configs never surface in the
    // technical queue (getUserConfigurations = STANDALONE ∪ OFFER SALES_APPROVED+), so
    // deleting them changes nothing under /configurazioni.
    revalidatePath(`/offerte/${offerId}`);
    revalidatePath("/offerte");
    revalidatePath("/");
    return { success: true as const };
  } catch (err) {
    return mapActionError(err, "Failed to discard offer revision:");
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

  // #269: renegotiation is a margin remedy — require at least one accepted line
  // with an active margin alert. Only gate when an accepted revision exists; the
  // not-accepted state is caught by createRenegotiationRevisionFrom below, which
  // keeps returning its own MSG.offer.renegotiationNotAccepted.
  const offer = await getOfferWithRevisionAndLines(offerId, user);
  const acceptedRevision = offer?.revisions.find(
    (rev) => rev.id === offer.accepted_revision_id,
  );
  if (acceptedRevision) {
    const alerts = await computeLineMarginAlerts(
      acceptedRevision.lines,
      Number(acceptedRevision.discount_pct),
    );
    if (!hasActiveMarginAlert(alerts.values())) {
      return {
        success: false as const,
        error: MSG.offer.renegotiationNoAlert,
      };
    }
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
    revalidatePath("/");
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
 * Each line's config form-shape is loaded inside the tx, after the offer FOR UPDATE
 * lock, and frozen in the same tx. On a renegotiation re-acceptance the lines reference
 * live engineering configs (editable in IN_TECH_REVIEW), so a pre-tx load could freeze
 * a snapshot an engineer save invalidates before commit (issue #245); post-lock reads
 * are safe because every OFFER-config write takes the same lock first
 * (`assertEditableInTx`).
 */
export async function acceptRevisionAction(offerId: number) {
  const auth = await authorizeOfferLifecycleAction(offerId);
  if (!auth.success) return auth;
  const { user, revision } = auth;

  if (!canTransitionRevision(user.role, revision.status, "ACCEPTED")) {
    return { success: false as const, error: MSG.offer.cannotAccept };
  }

  return runRevisionTransition(offerId, async (tx) => {
    // Lock before any read: serializes against concurrent config/sub-record
    // edits and revision transitions, all of which take this same lock first.
    // The re-lock inside acceptOfferRevisionWithAudit is a same-tx no-op.
    await lockOfferRow(offerId, tx);

    const current = await getWorkingRevisionForSend(offerId, tx);
    if (!current) throw new QueryError(MSG.offer.notFound);
    if (current.status !== "SENT") {
      throw new QueryError(MSG.offer.cannotAccept);
    }
    if (current.configIds.length === 0) {
      throw new QueryError(MSG.offer.cannotSendEmpty);
    }

    // Post-lock snapshot loads: what freezes as the margin baseline is exactly
    // the config state the acceptance commits against. Sequential — the tx runs
    // on a single connection anyway.
    const asSoldByConfigId: Record<number, OfferConfigSnapshot> = {};
    for (const configId of current.configIds) {
      const loaded = await loadValidatedConfiguration(configId, user, tx);
      if (!loaded) throw new QueryError(MSG.config.notFound);
      asSoldByConfigId[configId] = {
        configuration: loaded.configuration,
        waterTanks: loaded.waterTanks,
        washBays: loaded.washBays,
      };
    }

    await acceptOfferRevisionWithAudit(
      offerId,
      current.id,
      user.id,
      asSoldByConfigId,
      tx,
    );

    return current.configIds;
  });
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

  return runRevisionTransition(offerId, async (tx) => {
    const working = await getWorkingRevisionForSend(offerId, tx);
    if (!working) throw new QueryError(MSG.offer.notFound);
    if (working.status !== "ACCEPTED") {
      throw new QueryError(MSG.offer.cannotUnaccept);
    }

    await unacceptOfferRevisionWithAudit(offerId, working.id, user.id, tx);

    return working.configIds;
  });
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
    if (!working) throw new QueryError(MSG.offer.notFound);
    if (working.status !== "SENT") {
      throw new QueryError(MSG.offer.cannotRecordOutcome);
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
