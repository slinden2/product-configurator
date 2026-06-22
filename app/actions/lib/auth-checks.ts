import type { ConfigurationStatusType, Role } from "@/types";

/**
 * Determines whether a configuration is currently in an editable state
 * based on the User's Role and the Record's Status.
 * * Rules:
 * - SALES_APPROVED/TECH_APPROVED/CLOSED: Never editable by anyone. SALES_APPROVED is a
 *   locked hand-off snapshot; to edit it a manager un-approves it back to
 *   IN_SALES_REVIEW, or an engineer pulls it forward to IN_TECH_REVIEW.
 * - SALES: Editable only in DRAFT.
 * - SALES_MANAGER/SALES_DIRECTOR: Editable in DRAFT or IN_SALES_REVIEW.
 * - ENGINEER/ADMIN: Editable in DRAFT, IN_SALES_REVIEW, or IN_TECH_REVIEW.
 *
 * Status × role only — ownership/scope is enforced separately via
 * canAccessConfiguration (db/queries.ts).
 */
export function isEditable(
  status: ConfigurationStatusType,
  role: Role,
): boolean {
  // 1. Hard stop: Sales-approved, Approved and Closed are read-only for all roles
  if (
    status === "SALES_APPROVED" ||
    status === "TECH_APPROVED" ||
    status === "CLOSED"
  ) {
    return false;
  }

  // 2. Role-based permissions for active states
  if (role === "SALES") {
    return status === "DRAFT";
  }

  if (role === "SALES_MANAGER" || role === "SALES_DIRECTOR") {
    return status === "DRAFT" || status === "IN_SALES_REVIEW";
  }

  if (role === "ENGINEER" || role === "ADMIN") {
    return (
      status === "DRAFT" ||
      status === "IN_SALES_REVIEW" ||
      status === "IN_TECH_REVIEW"
    );
  }

  return false;
}

/**
 * Whether a role may move a configuration from one status to another. Pure
 * role × edge logic — ownership/scope is enforced separately by
 * canAccessConfiguration (db/queries.ts). Mirrored client-side by
 * getValidTransitions in components/status-form.tsx; keep them in sync.
 */
export function canTransition(
  role: Role,
  from: ConfigurationStatusType,
  to: ConfigurationStatusType,
): boolean {
  if (from === to) return true;
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
