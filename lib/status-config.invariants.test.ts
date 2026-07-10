import { describe, expect, test } from "vitest";
import {
  type ConfigOrigin,
  ConfigOrigins,
  ConfigurationStatus,
  type ConfigurationStatusType,
  HANDED_OFF_STATUSES,
  OfferStatus,
  type OfferStatusType,
  PRE_HANDOFF_STATUSES,
  type Role,
  Roles,
} from "@/types";
import { canTransition, isEditable } from "./status-config";

/**
 * Executable encoding of `.claude/rules/workflow.md` for the configuration
 * gates: every cell of the full cartesian product is asserted against a spec
 * oracle re-derived from the spec prose (never from the implementation's own
 * edge table), so a code change that violates the spec fails here even if the
 * sampled suites in status-config.test.ts happen not to cover it.
 *
 * Spec-silent behavior encoded as-is and reported alongside the suite:
 * - Same-status no-op "transitions" are allowed for every role and origin
 *   (canTransition short-circuits on `from === to`), including identity on the
 *   STANDALONE hand-off statuses the spec calls out of bounds — an unreachable
 *   state in practice, since no edge can enter them.
 */

// --- Spec oracle: role sets quoted from workflow.md ---

// "SALES_APPROVED, TECH_APPROVED, CLOSED → read-only for all roles."
const READ_ONLY_STATUSES: ConfigurationStatusType[] = [
  "SALES_APPROVED",
  "TECH_APPROVED",
  "CLOSED",
];

// "ENGINEER / ADMIN → DRAFT (standalone) and IN_TECH_REVIEW (OFFER)."
const ENGINEERING_SIDE: Role[] = ["ENGINEER", "ADMIN"];

// "canViewOffer = SALES roles + ADMIN. ENGINEER is excluded." — the roles that
// may edit a pre-handoff OFFER config while its revision is DRAFT.
const OFFER_ACCESS_ROLES: Role[] = [
  "SALES",
  "SALES_MANAGER",
  "SALES_DIRECTOR",
  "ADMIN",
];

function assertKnown<T>(value: T, known: readonly T[], kind: string): void {
  if (!known.includes(value)) {
    throw new Error(
      `Spec oracle has no rule for ${kind} "${String(value)}" — update the oracle from workflow.md before widening the enum.`,
    );
  }
}

/**
 * Expected `isEditable` verdict per workflow.md "Editable Logic (Immutable
 * States)". Throws on enum members the spec does not cover yet, so widening an
 * enum forces a deliberate oracle update instead of a silent default.
 */
function expectedEditable(
  status: ConfigurationStatusType,
  role: Role,
  origin: ConfigOrigin,
  offerRevisionStatus: OfferStatusType | undefined,
): boolean {
  assertKnown(role, Roles, "role");
  assertKnown(status, ConfigurationStatus, "status");
  assertKnown(origin, ConfigOrigins, "origin");

  // "SALES_APPROVED, TECH_APPROVED, CLOSED → read-only for all roles."
  if (READ_ONLY_STATUSES.includes(status)) return false;

  // "STANDALONE: Engineer/Admin only, editable in DRAFT. The hand-off statuses
  // never apply." — the offer revision is irrelevant to a standalone config.
  if (origin === "STANDALONE") {
    return ENGINEERING_SIDE.includes(role) && status === "DRAFT";
  }

  // "OFFER config at SALES_APPROVED+ → governed by ConfigurationStatus":
  // IN_TECH_REVIEW is the post-handoff engineering zone, Engineer/Admin only.
  if (status === "IN_TECH_REVIEW") return ENGINEERING_SIDE.includes(role);

  // "OFFER config, pre-SALES_APPROVED → governed by the offer revision:
  // editable only while the owning revision is DRAFT. Fail-closed — a missing
  // revision status means not editable, which also means ENGINEER cannot edit
  // a pre-handoff OFFER config."
  return offerRevisionStatus === "DRAFT" && OFFER_ACCESS_ROLES.includes(role);
}

/**
 * The workflow edges named by the spec, re-derived from prose (NOT from
 * STATUS_TRANSITIONS, so a drifting edge table cannot vouch for itself).
 */
const SPEC_EDGES: Record<
  ConfigOrigin,
  {
    from: ConfigurationStatusType;
    to: ConfigurationStatusType;
    roles: Role[];
  }[]
> = {
  // "Transitions: OFFER SALES_APPROVED ↔ IN_TECH_REVIEW, IN_TECH_REVIEW ↔
  // TECH_APPROVED" (ENGINEER; "ADMIN may perform any defined workflow edge").
  // "Only role that can move status to CLOSED or revert it" → ADMIN-only pair.
  OFFER: [
    { from: "SALES_APPROVED", to: "IN_TECH_REVIEW", roles: ENGINEERING_SIDE },
    { from: "IN_TECH_REVIEW", to: "SALES_APPROVED", roles: ENGINEERING_SIDE },
    { from: "IN_TECH_REVIEW", to: "TECH_APPROVED", roles: ENGINEERING_SIDE },
    { from: "TECH_APPROVED", to: "IN_TECH_REVIEW", roles: ENGINEERING_SIDE },
    { from: "TECH_APPROVED", to: "CLOSED", roles: ["ADMIN"] },
    { from: "CLOSED", to: "TECH_APPROVED", roles: ["ADMIN"] },
  ],
  // "STANDALONE runs only the two-state working/approved machine
  // DRAFT ↔ TECH_APPROVED → CLOSED and never touches the hand-off statuses."
  STANDALONE: [
    { from: "DRAFT", to: "TECH_APPROVED", roles: ENGINEERING_SIDE },
    { from: "TECH_APPROVED", to: "DRAFT", roles: ENGINEERING_SIDE },
    { from: "TECH_APPROVED", to: "CLOSED", roles: ["ADMIN"] },
    { from: "CLOSED", to: "TECH_APPROVED", roles: ["ADMIN"] },
  ],
};

/**
 * Expected `canTransition` verdict per workflow.md's status machines. Sales
 * roles appear in no edge ("no manual sales edge exists" into SALES_APPROVED;
 * approval happens on the offer revision), and everything outside the named
 * edges — non-adjacent jumps included — is rejected for every role, ADMIN too
 * ("there is no status override").
 */
function expectedTransition(
  role: Role,
  from: ConfigurationStatusType,
  to: ConfigurationStatusType,
  origin: ConfigOrigin,
): boolean {
  assertKnown(role, Roles, "role");
  assertKnown(from, ConfigurationStatus, "status");
  assertKnown(to, ConfigurationStatus, "status");
  assertKnown(origin, ConfigOrigins, "origin");

  // Same-status no-op: spec-silent, allowed by code for every role/origin.
  if (from === to) return true;

  return SPEC_EDGES[origin].some(
    (edge) => edge.from === from && edge.to === to && edge.roles.includes(role),
  );
}

// --- Exhaustive tables ---

const REVISION_STATUSES: (OfferStatusType | undefined)[] = [
  ...OfferStatus,
  undefined,
];

describe("isEditable — exhaustive status × role × origin × revision matrix (workflow.md 'Editable Logic')", () => {
  const cells = ConfigurationStatus.flatMap((status) =>
    Roles.flatMap((role) =>
      ConfigOrigins.flatMap((origin) =>
        REVISION_STATUSES.map(
          (revision) =>
            [
              status,
              role,
              origin,
              revision,
              expectedEditable(status, role, origin, revision),
            ] as const,
        ),
      ),
    ),
  );

  test(`covers the full cartesian product (${ConfigurationStatus.length} statuses × ${Roles.length} roles × ${ConfigOrigins.length} origins × ${REVISION_STATUSES.length} revision states)`, () => {
    expect(cells).toHaveLength(
      ConfigurationStatus.length *
        Roles.length *
        ConfigOrigins.length *
        REVISION_STATUSES.length,
    );
  });

  test.each(
    cells,
  )("isEditable(%s, %s, %s, revision=%s) → %s", (status, role, origin, revision, expected) => {
    expect(isEditable(status, role, origin, revision)).toBe(expected);
  });
});

describe("canTransition — exhaustive from × to × role × origin matrix (workflow.md status machines)", () => {
  const cells = ConfigurationStatus.flatMap((from) =>
    ConfigurationStatus.flatMap((to) =>
      Roles.flatMap((role) =>
        ConfigOrigins.map(
          (origin) =>
            [
              role,
              from,
              to,
              origin,
              expectedTransition(role, from, to, origin),
            ] as const,
        ),
      ),
    ),
  );

  test(`covers the full cartesian product (${ConfigurationStatus.length}×${ConfigurationStatus.length} edges × ${Roles.length} roles × ${ConfigOrigins.length} origins)`, () => {
    expect(cells).toHaveLength(
      ConfigurationStatus.length ** 2 * Roles.length * ConfigOrigins.length,
    );
  });

  test.each(
    cells,
  )("canTransition(%s, %s → %s, %s) → %s", (role, from, to, origin, expected) => {
    expect(canTransition(role, from, to, origin)).toBe(expected);
  });
});

describe("hand-off status partition (workflow.md technical-queue rule)", () => {
  test("HANDED_OFF_STATUSES is exactly SALES_APPROVED and beyond — the OFFER configs the technical queue may include", () => {
    expect(HANDED_OFF_STATUSES).toEqual([
      "SALES_APPROVED",
      "IN_TECH_REVIEW",
      "TECH_APPROVED",
      "CLOSED",
    ]);
  });

  test("PRE_HANDOFF_STATUSES is exactly DRAFT — the sales-only zone engineers never see", () => {
    expect(PRE_HANDOFF_STATUSES).toEqual(["DRAFT"]);
  });

  test("the two sets partition the whole status machine (no status unaccounted for)", () => {
    expect(
      [...PRE_HANDOFF_STATUSES, ...HANDED_OFF_STATUSES].toSorted(),
    ).toEqual([...ConfigurationStatus].toSorted());
  });
});
