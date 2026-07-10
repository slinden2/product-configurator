import { describe, expect, test } from "vitest";
import { canTransitionRevision } from "@/app/actions/lib/auth-checks";
import { OfferStatus, type OfferStatusType, type Role, Roles } from "@/types";

/**
 * Executable encoding of `.claude/rules/workflow.md` "Offer Revision
 * Lifecycle": every (role, from, to) cell of the full cartesian product is
 * asserted against a spec oracle re-derived from the spec prose, so a code
 * change that violates the lifecycle fails here even where the sampled suite
 * in auth-checks.test.ts does not reach.
 *
 * Renegotiation revisions "ride the same lifecycle and gates, manager approval
 * included" — guaranteed by construction: canTransitionRevision takes only
 * (role, from, to), no revision identity, so a renegotiation revision cannot
 * be gated differently. This very table is therefore also the renegotiation
 * transition table.
 */

// "Manager approval is required on every revision before send" — the
// management roles that own the approval gate (canApproveRevision).
const MANAGEMENT_ROLES: Role[] = ["SALES_MANAGER", "SALES_DIRECTOR", "ADMIN"];

// "canViewOffer = SALES roles + ADMIN. ENGINEER is excluded."
const OFFER_ACCESS_ROLES: Role[] = ["SALES", ...MANAGEMENT_ROLES];

function assertKnown<T>(value: T, known: readonly T[], kind: string): void {
  if (!known.includes(value)) {
    throw new Error(
      `Spec oracle has no rule for ${kind} "${String(value)}" — update the oracle from workflow.md before widening the enum.`,
    );
  }
}

/**
 * Expected verdict per the spec lifecycle
 * DRAFT → PENDING_APPROVAL → APPROVED_TO_SEND → SENT → ACCEPTED/REJECTED/EXPIRED.
 * Everything not named below — including every edge out of the terminal
 * customer outcomes — is rejected.
 */
function expectedRevisionTransition(
  role: Role,
  from: OfferStatusType,
  to: OfferStatusType,
): boolean {
  assertKnown(role, Roles, "role");
  assertKnown(from, OfferStatus, "offer status");
  assertKnown(to, OfferStatus, "offer status");

  // "ENGINEER ... no offer access at all" — rejected on every edge, the
  // same-status no-op included.
  if (!OFFER_ACCESS_ROLES.includes(role)) return false;

  // Same-status no-op: spec-silent, allowed by code for offer-access roles.
  if (from === to) return true;

  // Submit: any offer-access role ("SALES ... submit a revision for approval").
  if (from === "DRAFT" && to === "PENDING_APPROVAL") return true;

  // "Manager approval is required on every revision before send"; the reject /
  // hand-back and un-approve edges are the same management gate. "Submission
  // is one-way — only a manager can hand it back", so SALES gets none of them.
  if (from === "PENDING_APPROVAL" && to === "APPROVED_TO_SEND")
    return MANAGEMENT_ROLES.includes(role);
  if (from === "PENDING_APPROVAL" && to === "DRAFT")
    return MANAGEMENT_ROLES.includes(role);
  if (from === "APPROVED_TO_SEND" && to === "DRAFT")
    return MANAGEMENT_ROLES.includes(role);

  // "APPROVED_TO_SEND → SENT freezes the revision": any offer-access role.
  if (from === "APPROVED_TO_SEND" && to === "SENT") return true;

  // "ACCEPTED / REJECTED / EXPIRED are the ... terminal customer outcomes of a
  // SENT revision" — recording the customer's decision is not a management gate.
  if (
    from === "SENT" &&
    (to === "ACCEPTED" || to === "REJECTED" || to === "EXPIRED")
  )
    return true;

  // "Un-accept (ACCEPTED → SENT, ADMIN only): the single edge out of the
  // otherwise-terminal ACCEPTED state — an admin correction for a mistaken
  // acceptance." REJECTED / EXPIRED stay fully terminal.
  if (from === "ACCEPTED" && to === "SENT") return role === "ADMIN";

  return false;
}

describe("canTransitionRevision — exhaustive role × from × to matrix (workflow.md 'Offer Revision Lifecycle')", () => {
  const cells = Roles.flatMap((role) =>
    OfferStatus.flatMap((from) =>
      OfferStatus.map(
        (to) =>
          [role, from, to, expectedRevisionTransition(role, from, to)] as const,
      ),
    ),
  );

  test(`covers the full cartesian product (${Roles.length} roles × ${OfferStatus.length}×${OfferStatus.length} edges)`, () => {
    expect(cells).toHaveLength(Roles.length * OfferStatus.length ** 2);
  });

  test.each(
    cells,
  )("canTransitionRevision(%s, %s → %s) → %s", (role, from, to, expected) => {
    expect(canTransitionRevision(role, from, to)).toBe(expected);
  });
});

describe("renegotiation revisions ride the same gates (workflow.md 'Renegotiation')", () => {
  test("canTransitionRevision takes no revision identity — a renegotiation revision cannot be gated differently", () => {
    // (role, from, to): status-only signature; renegotiation-ness is derived
    // elsewhere (lib/offer-renegotiation.ts) and never reaches this gate.
    expect(canTransitionRevision.length).toBe(3);
  });
});
