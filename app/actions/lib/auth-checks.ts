import { isRoleAllowedTransition } from "@/lib/status-config";
import type {
  ConfigOrigin,
  ConfigurationStatusType,
  OfferStatusType,
  Role,
} from "@/types";

/**
 * Determines whether a configuration is currently in an editable state based on
 * the User's Role, the Record's Status, its `origin`, and — for an offer-owned
 * config in the pre-handoff zone — the status of its offer revision.
 *
 * `origin` defaults to `"OFFER"`; standalone callers must pass `"STANDALONE"`.
 *
 * Two-phase gate for OFFER-origin configs:
 * - Before SALES_APPROVED (DRAFT) the config is governed by its offer revision:
 *   editable only while the revision is `DRAFT`. This is a fail-closed gate — a
 *   missing `offerRevisionStatus` (no offer wired up, or a non-DRAFT lifecycle
 *   state) means not editable. ENGINEER has no offer access here and is excluded.
 * - At SALES_APPROVED+ the config is governed by ConfigurationStatus (engineering
 *   rules), regardless of the revision; the offer is already frozen.
 *
 * Rules:
 * - SALES_APPROVED/TECH_APPROVED/CLOSED: Never editable by anyone (both origins).
 *   SALES_APPROVED is a locked hand-off snapshot; to edit it an engineer pulls it
 *   forward to IN_TECH_REVIEW.
 * - STANDALONE: Engineer/Admin only, editable in DRAFT or IN_TECH_REVIEW. The
 *   sales status never applies.
 * - OFFER · IN_TECH_REVIEW: Engineer/Admin (post-handoff engineering zone).
 * - OFFER · DRAFT: offer-access roles only (SALES/SALES_MANAGER/SALES_DIRECTOR/
 *   ADMIN), and only while the offer revision is DRAFT.
 *
 * Status × role × origin × revision only — ownership/scope is enforced separately
 * via canAccessConfiguration (db/queries.ts).
 */
export function isEditable(
  status: ConfigurationStatusType,
  role: Role,
  origin: ConfigOrigin = "OFFER",
  offerRevisionStatus?: OfferStatusType,
): boolean {
  // 1. Hard stop: Sales-approved, Approved and Closed are read-only for all roles
  if (
    status === "SALES_APPROVED" ||
    status === "TECH_APPROVED" ||
    status === "CLOSED"
  ) {
    return false;
  }

  // 2. Standalone configs are pure technical work: Engineer/Admin only, confined
  // to the engineering sub-chain (the sales status never applies).
  if (origin === "STANDALONE") {
    if (role !== "ENGINEER" && role !== "ADMIN") {
      return false;
    }
    return status === "DRAFT" || status === "IN_TECH_REVIEW";
  }

  // 3. OFFER · engineering zone (post-handoff): governed by config status, not the
  // revision. Engineer/Admin finalize the BOM here; the offer is already frozen.
  if (status === "IN_TECH_REVIEW") {
    return role === "ENGINEER" || role === "ADMIN";
  }

  // 4. OFFER · pre-handoff (DRAFT — the only status left here): governed by the
  // offer revision. Fail closed — editable only while the revision is DRAFT; a
  // missing or non-DRAFT revision status means not editable.
  if (offerRevisionStatus !== "DRAFT") {
    return false;
  }
  // Offer-access roles only — ENGINEER has no offer access pre-handoff.
  return (
    role === "SALES" ||
    role === "SALES_MANAGER" ||
    role === "SALES_DIRECTOR" ||
    role === "ADMIN"
  );
}

/**
 * Whether a role may move a configuration from one status to another. Pure
 * role × edge × origin logic — ownership/scope is enforced separately by
 * canAccessConfiguration (db/queries.ts). Mirrored client-side by
 * getValidTransitions in components/status-form.tsx, which also goes through
 * this function, so the two cannot drift.
 *
 * The role-restricted edges live in the single STATUS_TRANSITIONS edge table
 * (lib/status-config.ts); this function layers two rules on top:
 * - ADMIN may make any jump (incl. non-adjacent ones the table cannot enumerate).
 * - On a STANDALONE config the sales status (SALES_APPROVED) is off-limits to
 *   everyone — standalone configs are engineering-only, keeping the technical
 *   lifecycle self-contained.
 *
 * `origin` defaults to `"OFFER"` (the full sales+engineering machine). A
 * STANDALONE config runs only the engineering sub-chain
 * `DRAFT → IN_TECH_REVIEW → TECH_APPROVED → CLOSED`, Engineer/Admin only.
 */
export function canTransition(
  role: Role,
  from: ConfigurationStatusType,
  to: ConfigurationStatusType,
  origin: ConfigOrigin = "OFFER",
): boolean {
  if (from === to) return true;

  // STANDALONE: the sales status is out of bounds for every role (ADMIN
  // included) — standalone configs are engineering-only.
  if (
    origin === "STANDALONE" &&
    (from === "SALES_APPROVED" || to === "SALES_APPROVED")
  ) {
    return false;
  }

  // ADMIN may make any remaining jump (incl. non-adjacent / closing).
  if (role === "ADMIN") return true;

  // Everyone else is restricted to the explicit edge table.
  return isRoleAllowedTransition(role, from, to, origin);
}

/**
 * Whether a role may move an offer **revision** from one lifecycle status to
 * another. Pure role × edge logic — ownership/scope (manager → own + direct
 * reports) is enforced separately by canAccessOffer (db/queries.ts), and the
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
 *
 * Fails closed for ENGINEER (no offer access) on every edge, the identity edge
 * included — a no-op is not a licence for a role with no authority over offers.
 */
export function canTransitionRevision(
  role: Role,
  from: OfferStatusType,
  to: OfferStatusType,
): boolean {
  const isManagement =
    role === "SALES_MANAGER" || role === "SALES_DIRECTOR" || role === "ADMIN";
  const hasOfferAccess = isManagement || role === "SALES";

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

  return false;
}
