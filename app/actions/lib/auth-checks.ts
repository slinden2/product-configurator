import { canApproveRevision } from "@/lib/access";
import { OFFER_ROLES } from "@/lib/roles";
import type { OfferStatusType, Role } from "@/types";

// canTransition and isEditable are pure domain logic and live in
// lib/status-config.ts (alongside the STATUS_TRANSITIONS edge table and
// getTransitionDirection). Re-exported here so app-layer callers keep a single
// import site; lib/ and db/ import them straight from @/lib/status-config to
// avoid a db/lib → app dependency inversion.
export { canTransition, isEditable } from "@/lib/status-config";

/**
 * Whether a role may move an offer **revision** from one lifecycle status to
 * another. Pure role × edge logic — ownership/scope (manager → own + direct
 * reports) is enforced separately by canAccessOffer (db/queries/offers.ts), and the
 * management-only approval capability by canApproveRevision (lib/access.ts).
 *
 * Lifecycle:
 *   DRAFT → PENDING_APPROVAL → APPROVED_TO_SEND → SENT
 *        → ACCEPTED / REJECTED / EXPIRED
 * plus manager hand-back (PENDING_APPROVAL → DRAFT) and un-approve
 * (APPROVED_TO_SEND → DRAFT).
 *
 * Rules:
 * - DRAFT → PENDING_APPROVAL (submit): any offer-access role (SALES on own).
 * - PENDING_APPROVAL → APPROVED_TO_SEND (approve): management roles only.
 * - PENDING_APPROVAL → DRAFT (reject / hand-back): management roles only. SALES
 *   cannot pull back its own submission.
 * - APPROVED_TO_SEND → DRAFT (un-approve): management roles only.
 * - APPROVED_TO_SEND → SENT (send): any offer-access role.
 * - SENT → ACCEPTED / REJECTED / EXPIRED (record customer outcome): any
 *   offer-access role. Recording what the customer decided is not a management
 *   gate — approval already happened before send.
 * - ACCEPTED → SENT (undo a mistaken acceptance): ADMIN only. The single edge
 *   out of the otherwise-terminal ACCEPTED state, an admin correction tool; the
 *   action layer unwinds the as-sold freeze and the config hand-off.
 *
 * Fails closed for ENGINEER (no offer access) on every edge, the identity edge
 * included — a no-op is not a licence for a role with no authority over offers.
 */
export function canTransitionRevision(
  role: Role,
  from: OfferStatusType,
  to: OfferStatusType,
): boolean {
  // Management = the offer-approval capability; offer access = any offer-viewing
  // role. Both derived from the shared role sets so they can't drift.
  const isManagement = canApproveRevision(role);
  const hasOfferAccess = OFFER_ROLES.includes(role);

  // ENGINEER (and any non-offer role) never acts on offer revisions, not even a
  // same-status no-op. Gate here so the identity short-circuit can't fail open.
  if (!hasOfferAccess) return false;

  if (from === to) return true;

  if (from === "DRAFT" && to === "PENDING_APPROVAL") return true;
  if (from === "PENDING_APPROVAL" && to === "APPROVED_TO_SEND")
    return isManagement;
  if (from === "PENDING_APPROVAL" && to === "DRAFT") return isManagement;
  if (from === "APPROVED_TO_SEND" && to === "DRAFT") return isManagement;
  if (from === "APPROVED_TO_SEND" && to === "SENT") return true;
  if (
    from === "SENT" &&
    (to === "ACCEPTED" || to === "REJECTED" || to === "EXPIRED")
  )
    return true;
  // ADMIN-only correction: undo a mistaken acceptance back to SENT.
  if (from === "ACCEPTED" && to === "SENT") return role === "ADMIN";

  return false;
}
