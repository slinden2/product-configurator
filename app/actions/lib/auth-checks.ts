import type {
  ConfigOrigin,
  ConfigurationStatusType,
  OfferStatusType,
  Role,
} from "@/types";

/**
 * The two sales-side statuses an OFFER-origin config passes through. A
 * STANDALONE config never enters either: it runs only the engineering sub-chain.
 */
const SALES_STATUSES: ConfigurationStatusType[] = [
  "IN_SALES_REVIEW",
  "SALES_APPROVED",
];

/**
 * Determines whether a configuration is currently in an editable state based on
 * the User's Role, the Record's Status, its `origin`, and — for an offer-owned
 * config in the pre-handoff zone — the status of its offer revision.
 *
 * `origin` defaults to `"OFFER"`; standalone callers must pass `"STANDALONE"`.
 *
 * Two-phase gate for OFFER-origin configs:
 * - Before SALES_APPROVED (DRAFT/IN_SALES_REVIEW) the config is governed by its
 *   offer revision: editable only while the revision is `DRAFT`. This is a
 *   fail-closed gate — a missing `offerRevisionStatus` (no offer wired up, or a
 *   non-DRAFT lifecycle state) means not editable. ENGINEER has no offer access
 *   here and is excluded.
 * - At SALES_APPROVED+ the config is governed by ConfigurationStatus (engineering
 *   rules), regardless of the revision; the offer is already frozen.
 *
 * Rules:
 * - SALES_APPROVED/TECH_APPROVED/CLOSED: Never editable by anyone (both origins).
 *   SALES_APPROVED is a locked hand-off snapshot; to edit it a manager un-approves
 *   it back to IN_SALES_REVIEW, or an engineer pulls it forward to IN_TECH_REVIEW.
 * - STANDALONE: Engineer/Admin only, editable in DRAFT or IN_TECH_REVIEW. The two
 *   sales statuses never apply.
 * - OFFER · IN_TECH_REVIEW: Engineer/Admin (post-handoff engineering zone).
 * - OFFER · DRAFT/IN_SALES_REVIEW: offer-access roles only, and only while the
 *   offer revision is DRAFT — SALES in DRAFT, SALES_MANAGER/SALES_DIRECTOR/ADMIN
 *   in DRAFT or IN_SALES_REVIEW.
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
  // to the engineering sub-chain (the two sales statuses never apply).
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

  // 4. OFFER · pre-handoff (DRAFT/IN_SALES_REVIEW): governed by the offer revision.
  // Fail closed — editable only while the revision is DRAFT; a missing or non-DRAFT
  // revision status means not editable.
  if (offerRevisionStatus !== "DRAFT") {
    return false;
  }
  // Offer-access roles only — ENGINEER has no offer access pre-handoff.
  if (role === "SALES") {
    return status === "DRAFT";
  }
  if (
    role === "SALES_MANAGER" ||
    role === "SALES_DIRECTOR" ||
    role === "ADMIN"
  ) {
    return status === "DRAFT" || status === "IN_SALES_REVIEW";
  }

  return false;
}

/**
 * Whether a role may move a configuration from one status to another. Pure
 * role × edge × origin logic — ownership/scope is enforced separately by
 * canAccessConfiguration (db/queries.ts). Mirrored client-side by
 * getValidTransitions in components/status-form.tsx; keep them in sync.
 *
 * `origin` defaults to `"OFFER"` (the full sales+engineering machine). A
 * STANDALONE config runs only the engineering sub-chain
 * `DRAFT → IN_TECH_REVIEW → TECH_APPROVED → CLOSED`, Engineer/Admin only, and
 * the two sales statuses are never reachable.
 */
export function canTransition(
  role: Role,
  from: ConfigurationStatusType,
  to: ConfigurationStatusType,
  origin: ConfigOrigin = "OFFER",
): boolean {
  if (from === to) return true;

  if (origin === "STANDALONE") {
    // The two sales statuses are out of bounds for standalone configs, whatever
    // the role (ADMIN included) — keeps the technical lifecycle self-contained.
    if (SALES_STATUSES.includes(from) || SALES_STATUSES.includes(to)) {
      return false;
    }
    // ADMIN may make any remaining (engineering-chain) jump, incl. closing.
    if (role === "ADMIN") return true;
    // ENGINEER walks the engineering sub-chain; CLOSED stays ADMIN-only.
    if (role === "ENGINEER") {
      const allowedTransitions = [
        { from: "DRAFT", to: "IN_TECH_REVIEW" },
        { from: "IN_TECH_REVIEW", to: "DRAFT" },
        { from: "IN_TECH_REVIEW", to: "TECH_APPROVED" },
        { from: "TECH_APPROVED", to: "IN_TECH_REVIEW" },
      ];
      return allowedTransitions.some((t) => t.from === from && t.to === to);
    }
    // Sales roles never act on standalone configs.
    return false;
  }

  if (role === "ADMIN") return true;

  // SALES (Area Manager / Sales Agent): can only submit their own offer for
  // review (DRAFT -> IN_SALES_REVIEW). Once submitted they relinquish control:
  // they cannot pull it back, so a manager mid-review is never undercut. To
  // hand it back, a manager rejects it (IN_SALES_REVIEW -> DRAFT).
  if (role === "SALES") {
    return from === "DRAFT" && to === "IN_SALES_REVIEW";
  }

  // SALES_MANAGER / SALES_DIRECTOR: draft toggle plus approve/reject/un-approve
  // on the sales side (scope is enforced separately via canAccessConfiguration).
  if (role === "SALES_MANAGER" || role === "SALES_DIRECTOR") {
    const allowedTransitions = [
      { from: "DRAFT", to: "IN_SALES_REVIEW" },
      { from: "IN_SALES_REVIEW", to: "DRAFT" },
      { from: "IN_SALES_REVIEW", to: "SALES_APPROVED" },
      { from: "SALES_APPROVED", to: "IN_SALES_REVIEW" },
    ];

    return allowedTransitions.some((t) => t.from === from && t.to === to);
  }

  // ENGINEER (Technical Office): Pull sales-approved work into review and approve
  if (role === "ENGINEER") {
    const allowedTransitions = [
      { from: "SALES_APPROVED", to: "IN_TECH_REVIEW" },
      { from: "IN_TECH_REVIEW", to: "SALES_APPROVED" },
      { from: "IN_TECH_REVIEW", to: "TECH_APPROVED" },
      { from: "TECH_APPROVED", to: "IN_TECH_REVIEW" },
    ];

    return allowedTransitions.some((t) => t.from === from && t.to === to);
  }

  return false;
}

/**
 * Whether a role may move an offer **revision** from one lifecycle status to
 * another. Pure role × edge logic — ownership/scope (manager → own + direct
 * reports) is enforced separately by canAccessOffer (db/queries.ts), and the
 * management-only approval capability by canApproveRevision (lib/access.ts).
 *
 * Lifecycle this phase (Phase 5):
 *   DRAFT → PENDING_APPROVAL → APPROVED_TO_SEND → SENT
 * plus manager hand-back (PENDING_APPROVAL → DRAFT) and un-approve
 * (APPROVED_TO_SEND → DRAFT). The post-SENT customer outcomes
 * (ACCEPTED/REJECTED/EXPIRED) are out of scope here.
 *
 * Rules:
 * - DRAFT → PENDING_APPROVAL (submit): any offer-access role (SALES on own).
 * - PENDING_APPROVAL → APPROVED_TO_SEND (approve): management roles only.
 * - PENDING_APPROVAL → DRAFT (reject / hand-back): management roles only. SALES
 *   cannot pull back its own submission — mirrors the config IN_SALES_REVIEW gate.
 * - APPROVED_TO_SEND → DRAFT (un-approve): management roles only.
 * - APPROVED_TO_SEND → SENT (send): any offer-access role.
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

  return false;
}

/**
 * Statuses in which the sales side can still edit the configuration and its
 * offer. Everything else is the "frozen zone" where the offer is the immutable
 * as-sold snapshot.
 */
const SALES_EDITABLE_STATUSES: ConfigurationStatusType[] = [
  "DRAFT",
  "IN_SALES_REVIEW",
];

/**
 * Classifies a status transition by how it crosses the offer's freeze boundary.
 *
 * The offer freezes as the immutable as-sold snapshot when a config leaves the
 * sales-editable zone (DRAFT/IN_SALES_REVIEW) for the frozen zone
 * (SALES_APPROVED/IN_TECH_REVIEW/TECH_APPROVED/CLOSED), and thaws when it comes
 * back. Keying on the zone crossing — rather than the exact
 * IN_SALES_REVIEW↔SALES_APPROVED edges — means an ADMIN jumping non-adjacently
 * (e.g. DRAFT→SALES_APPROVED, CLOSED→DRAFT) still freezes/thaws correctly, while
 * the engineering-side SALES_APPROVED↔IN_TECH_REVIEW edge stays within the frozen
 * zone so the offer remains frozen while an engineer edits live config.
 *
 * A STANDALONE config has no offer, so it never freezes/thaws — this always
 * returns `null` for it. Without this guard a standalone DRAFT→IN_TECH_REVIEW
 * move would be read as a "freeze" (it crosses the same zone boundary) and the
 * caller's offer-snapshot precondition would block the entire engineering
 * lifecycle. `origin` defaults to `"OFFER"` to preserve the offer behaviour.
 */
export function classifyOfferFreezeTransition(
  from: ConfigurationStatusType,
  to: ConfigurationStatusType,
  origin: ConfigOrigin = "OFFER",
): "freeze" | "thaw" | null {
  // Standalone configs are pure technical work with no offer to freeze.
  if (origin === "STANDALONE") return null;

  const fromSalesEditable = SALES_EDITABLE_STATUSES.includes(from);
  const toSalesEditable = SALES_EDITABLE_STATUSES.includes(to);
  if (fromSalesEditable && !toSalesEditable) return "freeze";
  if (!fromSalesEditable && toSalesEditable) return "thaw";
  return null;
}
