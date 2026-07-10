import { isEditable } from "@/app/actions/lib/auth-checks";
import {
  getOfferRefForConfig,
  lockOfferRow,
  offerRevisionStatusFor,
  QueryError,
  type TransactionType,
} from "@/db/queries";
import type { Configuration } from "@/db/schemas";
import { MSG } from "@/lib/messages";
import type { Role } from "@/types";

/**
 * Re-asserts the pre-transaction editability gate under the offer FOR UPDATE
 * lock (TOCTOU guard). The action-level `isEditable` check runs on a pooled
 * read before the transaction opens, so a concurrent revision transition
 * (e.g. submit → PENDING_APPROVAL) can freeze the pricing snapshot in the
 * gate-read → commit gap; without this re-check the edit would commit against
 * the frozen price and `repriceOfferLine` would silently no-op.
 *
 * For OFFER configs: locks the owning offer row (serializing against
 * submit/send/accept/clone, which all take the same lock first), re-reads the
 * owning revision's status in-tx, and re-runs `isEditable` — throwing
 * `QueryError(errorMessage, 409)` to roll the transaction back if the gate no
 * longer holds. No-op for STANDALONE configs (no revision gate).
 *
 * Must be the first statement of the caller's transaction, before any
 * mutation.
 */
export async function assertEditableInTx(
  configuration: Pick<Configuration, "id" | "origin" | "status">,
  role: Role,
  tx: TransactionType,
  errorMessage: string,
): Promise<void> {
  if (configuration.origin !== "OFFER") return;

  // An OFFER config must own a line; a missing one is data drift, not a no-op.
  const offerRef = await getOfferRefForConfig(configuration.id, tx);
  if (!offerRef) throw new QueryError(MSG.offer.notFound, 404);

  await lockOfferRow(offerRef.offerId, tx);

  // Post-lock read: sees the previous lock holder's committed state.
  const offerRevisionStatus = await offerRevisionStatusFor(configuration, tx);
  if (
    !isEditable(
      configuration.status,
      role,
      configuration.origin,
      offerRevisionStatus,
    )
  ) {
    throw new QueryError(errorMessage, 409);
  }
}
