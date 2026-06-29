import { describe, expect, test } from "vitest";
import {
  canTransition,
  canTransitionRevision,
  isEditable,
} from "@/app/actions/lib/auth-checks";
import type { ConfigurationStatusType, OfferStatusType, Role } from "@/types";

describe("isEditable", () => {
  describe("SALES_APPROVED, TECH_APPROVED and CLOSED are never editable", () => {
    const roles: Role[] = [
      "SALES",
      "SALES_MANAGER",
      "SALES_DIRECTOR",
      "ENGINEER",
      "ADMIN",
    ];

    test.each(roles)("SALES_APPROVED is not editable for %s", (role) => {
      expect(isEditable("SALES_APPROVED", role)).toBe(false);
    });

    test.each(roles)("TECH_APPROVED is not editable for %s", (role) => {
      expect(isEditable("TECH_APPROVED", role)).toBe(false);
    });

    test.each(roles)("CLOSED is not editable for %s", (role) => {
      expect(isEditable("CLOSED", role)).toBe(false);
    });
  });

  // OFFER pre-handoff (DRAFT/IN_SALES_REVIEW) is a two-phase gate: editable only
  // while the offer revision is DRAFT. A missing revision status fails closed.
  describe("OFFER pre-handoff — revision is DRAFT", () => {
    test("SALES can edit DRAFT only", () => {
      expect(isEditable("DRAFT", "SALES", "OFFER", "DRAFT")).toBe(true);
      expect(isEditable("IN_SALES_REVIEW", "SALES", "OFFER", "DRAFT")).toBe(
        false,
      );
    });

    test.each([
      "SALES_MANAGER",
      "SALES_DIRECTOR",
      "ADMIN",
    ] as const)("%s can edit DRAFT and IN_SALES_REVIEW", (role) => {
      expect(isEditable("DRAFT", role, "OFFER", "DRAFT")).toBe(true);
      expect(isEditable("IN_SALES_REVIEW", role, "OFFER", "DRAFT")).toBe(true);
    });

    test("ENGINEER has no offer access pre-handoff", () => {
      expect(isEditable("DRAFT", "ENGINEER", "OFFER", "DRAFT")).toBe(false);
      expect(isEditable("IN_SALES_REVIEW", "ENGINEER", "OFFER", "DRAFT")).toBe(
        false,
      );
    });
  });

  describe("OFFER pre-handoff — fail closed", () => {
    const roles: Role[] = [
      "SALES",
      "SALES_MANAGER",
      "SALES_DIRECTOR",
      "ENGINEER",
      "ADMIN",
    ];

    test.each(
      roles,
    )("%s cannot edit DRAFT when the revision is not DRAFT (SENT)", (role) => {
      expect(isEditable("DRAFT", role, "OFFER", "SENT")).toBe(false);
    });

    // The approval states lock the line configs exactly like SENT does.
    test.each(
      roles,
    )("%s cannot edit DRAFT when the revision is PENDING_APPROVAL or APPROVED_TO_SEND", (role) => {
      expect(isEditable("DRAFT", role, "OFFER", "PENDING_APPROVAL")).toBe(
        false,
      );
      expect(isEditable("DRAFT", role, "OFFER", "APPROVED_TO_SEND")).toBe(
        false,
      );
    });

    test.each(
      roles,
    )("%s cannot edit DRAFT when no revision status is supplied", (role) => {
      expect(isEditable("DRAFT", role, "OFFER")).toBe(false);
      expect(isEditable("IN_SALES_REVIEW", role, "OFFER")).toBe(false);
    });
  });

  describe("OFFER engineering zone (IN_TECH_REVIEW)", () => {
    test.each([
      "ENGINEER",
      "ADMIN",
    ] as const)("%s can edit IN_TECH_REVIEW regardless of revision", (role) => {
      expect(isEditable("IN_TECH_REVIEW", role)).toBe(true);
      expect(isEditable("IN_TECH_REVIEW", role, "OFFER", "SENT")).toBe(true);
    });

    test.each([
      "SALES",
      "SALES_MANAGER",
      "SALES_DIRECTOR",
    ] as const)("%s cannot edit IN_TECH_REVIEW", (role) => {
      expect(isEditable("IN_TECH_REVIEW", role, "OFFER", "DRAFT")).toBe(false);
    });
  });
});

describe("isEditable — STANDALONE origin", () => {
  describe.each(["ENGINEER", "ADMIN"] as const)("%s role", (role) => {
    test("can edit DRAFT", () => {
      expect(isEditable("DRAFT", role, "STANDALONE")).toBe(true);
    });

    test("can edit IN_TECH_REVIEW", () => {
      expect(isEditable("IN_TECH_REVIEW", role, "STANDALONE")).toBe(true);
    });

    test("cannot edit the frozen states", () => {
      expect(isEditable("TECH_APPROVED", role, "STANDALONE")).toBe(false);
      expect(isEditable("CLOSED", role, "STANDALONE")).toBe(false);
    });

    test("the two sales statuses are never editable", () => {
      expect(isEditable("IN_SALES_REVIEW", role, "STANDALONE")).toBe(false);
      expect(isEditable("SALES_APPROVED", role, "STANDALONE")).toBe(false);
    });
  });

  describe.each([
    "SALES",
    "SALES_MANAGER",
    "SALES_DIRECTOR",
  ] as const)("%s role can never edit a standalone config", (role) => {
    test.each([
      "DRAFT",
      "IN_SALES_REVIEW",
      "IN_TECH_REVIEW",
      "TECH_APPROVED",
    ] as ConfigurationStatusType[])("not editable in %s", (status) => {
      expect(isEditable(status, role, "STANDALONE")).toBe(false);
    });
  });
});

describe("canTransition", () => {
  test("a same-status no-op is always allowed", () => {
    expect(canTransition("SALES", "DRAFT", "DRAFT")).toBe(true);
  });

  describe("SALES", () => {
    test("can submit DRAFT -> IN_SALES_REVIEW", () => {
      expect(canTransition("SALES", "DRAFT", "IN_SALES_REVIEW")).toBe(true);
    });

    test("cannot pull a submitted offer back (IN_SALES_REVIEW -> DRAFT)", () => {
      expect(canTransition("SALES", "IN_SALES_REVIEW", "DRAFT")).toBe(false);
    });

    test("cannot approve (IN_SALES_REVIEW -> SALES_APPROVED)", () => {
      expect(canTransition("SALES", "IN_SALES_REVIEW", "SALES_APPROVED")).toBe(
        false,
      );
    });

    test("cannot touch engineering-side statuses", () => {
      expect(canTransition("SALES", "SALES_APPROVED", "IN_TECH_REVIEW")).toBe(
        false,
      );
      expect(canTransition("SALES", "IN_TECH_REVIEW", "TECH_APPROVED")).toBe(
        false,
      );
    });
  });

  describe.each(["SALES_MANAGER", "SALES_DIRECTOR"] as const)("%s", (role) => {
    test("can approve, reject and un-approve", () => {
      expect(canTransition(role, "DRAFT", "IN_SALES_REVIEW")).toBe(true);
      expect(canTransition(role, "IN_SALES_REVIEW", "SALES_APPROVED")).toBe(
        true,
      );
      expect(canTransition(role, "IN_SALES_REVIEW", "DRAFT")).toBe(true);
      expect(canTransition(role, "SALES_APPROVED", "IN_SALES_REVIEW")).toBe(
        true,
      );
    });

    test("cannot move into engineering review or approve", () => {
      expect(canTransition(role, "SALES_APPROVED", "IN_TECH_REVIEW")).toBe(
        false,
      );
      expect(canTransition(role, "IN_TECH_REVIEW", "TECH_APPROVED")).toBe(
        false,
      );
    });
  });

  describe("ENGINEER", () => {
    test("can pull SALES_APPROVED into review and back", () => {
      expect(
        canTransition("ENGINEER", "SALES_APPROVED", "IN_TECH_REVIEW"),
      ).toBe(true);
      expect(
        canTransition("ENGINEER", "IN_TECH_REVIEW", "SALES_APPROVED"),
      ).toBe(true);
    });

    test("can approve and reopen", () => {
      expect(canTransition("ENGINEER", "IN_TECH_REVIEW", "TECH_APPROVED")).toBe(
        true,
      );
      expect(canTransition("ENGINEER", "TECH_APPROVED", "IN_TECH_REVIEW")).toBe(
        true,
      );
    });

    test("cannot act on the sales side", () => {
      expect(canTransition("ENGINEER", "DRAFT", "IN_SALES_REVIEW")).toBe(false);
      expect(
        canTransition("ENGINEER", "IN_SALES_REVIEW", "SALES_APPROVED"),
      ).toBe(false);
    });

    test("cannot close (ADMIN only)", () => {
      expect(canTransition("ENGINEER", "TECH_APPROVED", "CLOSED")).toBe(false);
    });
  });

  describe("ADMIN", () => {
    test("can make any transition, including closing and reverting", () => {
      const edges: [ConfigurationStatusType, ConfigurationStatusType][] = [
        ["DRAFT", "CLOSED"],
        ["TECH_APPROVED", "CLOSED"],
        ["CLOSED", "TECH_APPROVED"],
        ["SALES_APPROVED", "DRAFT"],
      ];
      for (const [from, to] of edges) {
        expect(canTransition("ADMIN", from, to)).toBe(true);
      }
    });
  });
});

describe("canTransition — STANDALONE origin", () => {
  describe("ENGINEER walks the engineering sub-chain", () => {
    test("can open and reopen review (DRAFT <-> IN_TECH_REVIEW)", () => {
      expect(
        canTransition("ENGINEER", "DRAFT", "IN_TECH_REVIEW", "STANDALONE"),
      ).toBe(true);
      expect(
        canTransition("ENGINEER", "IN_TECH_REVIEW", "DRAFT", "STANDALONE"),
      ).toBe(true);
    });

    test("can approve and reopen (IN_TECH_REVIEW <-> TECH_APPROVED)", () => {
      expect(
        canTransition(
          "ENGINEER",
          "IN_TECH_REVIEW",
          "TECH_APPROVED",
          "STANDALONE",
        ),
      ).toBe(true);
      expect(
        canTransition(
          "ENGINEER",
          "TECH_APPROVED",
          "IN_TECH_REVIEW",
          "STANDALONE",
        ),
      ).toBe(true);
    });

    test("cannot reach the sales statuses", () => {
      expect(
        canTransition("ENGINEER", "DRAFT", "IN_SALES_REVIEW", "STANDALONE"),
      ).toBe(false);
      expect(
        canTransition("ENGINEER", "DRAFT", "SALES_APPROVED", "STANDALONE"),
      ).toBe(false);
    });

    test("cannot close (ADMIN only)", () => {
      expect(
        canTransition("ENGINEER", "TECH_APPROVED", "CLOSED", "STANDALONE"),
      ).toBe(false);
    });
  });

  describe("ADMIN", () => {
    test("can make any engineering-chain jump, including closing", () => {
      const edges: [ConfigurationStatusType, ConfigurationStatusType][] = [
        ["DRAFT", "IN_TECH_REVIEW"],
        ["DRAFT", "TECH_APPROVED"],
        ["TECH_APPROVED", "CLOSED"],
        ["CLOSED", "IN_TECH_REVIEW"],
      ];
      for (const [from, to] of edges) {
        expect(canTransition("ADMIN", from, to, "STANDALONE")).toBe(true);
      }
    });

    test("still cannot route a standalone config through a sales status", () => {
      expect(
        canTransition("ADMIN", "DRAFT", "IN_SALES_REVIEW", "STANDALONE"),
      ).toBe(false);
      expect(
        canTransition(
          "ADMIN",
          "SALES_APPROVED",
          "IN_TECH_REVIEW",
          "STANDALONE",
        ),
      ).toBe(false);
    });
  });

  describe.each([
    "SALES",
    "SALES_MANAGER",
    "SALES_DIRECTOR",
  ] as const)("%s cannot transition a standalone config", (role) => {
    test("DRAFT -> IN_TECH_REVIEW is rejected", () => {
      expect(canTransition(role, "DRAFT", "IN_TECH_REVIEW", "STANDALONE")).toBe(
        false,
      );
    });
  });
});

describe("canTransitionRevision", () => {
  const management: Role[] = ["SALES_MANAGER", "SALES_DIRECTOR", "ADMIN"];

  test.each([
    "SALES",
    "SALES_MANAGER",
    "SALES_DIRECTOR",
    "ADMIN",
  ] as const)("identity transition is allowed for offer-access role %s", (role) => {
    expect(canTransitionRevision(role, "DRAFT", "DRAFT")).toBe(true);
  });

  test("ENGINEER (no offer access) is rejected even on the identity edge", () => {
    expect(canTransitionRevision("ENGINEER", "DRAFT", "DRAFT")).toBe(false);
  });

  describe("DRAFT -> PENDING_APPROVAL (submit)", () => {
    test.each([
      "SALES",
      "SALES_MANAGER",
      "SALES_DIRECTOR",
      "ADMIN",
    ] as const)("%s (offer-access) may submit", (role) => {
      expect(canTransitionRevision(role, "DRAFT", "PENDING_APPROVAL")).toBe(
        true,
      );
    });

    test("ENGINEER may not submit", () => {
      expect(
        canTransitionRevision("ENGINEER", "DRAFT", "PENDING_APPROVAL"),
      ).toBe(false);
    });
  });

  describe("PENDING_APPROVAL -> APPROVED_TO_SEND (approve)", () => {
    test.each(management)("%s may approve", (role) => {
      expect(
        canTransitionRevision(role, "PENDING_APPROVAL", "APPROVED_TO_SEND"),
      ).toBe(true);
    });

    test.each(["SALES", "ENGINEER"] as const)("%s may not approve", (role) => {
      expect(
        canTransitionRevision(role, "PENDING_APPROVAL", "APPROVED_TO_SEND"),
      ).toBe(false);
    });
  });

  describe("return to DRAFT (reject / un-approve) is management-only", () => {
    test.each(management)("%s may hand back and un-approve", (role) => {
      expect(canTransitionRevision(role, "PENDING_APPROVAL", "DRAFT")).toBe(
        true,
      );
      expect(canTransitionRevision(role, "APPROVED_TO_SEND", "DRAFT")).toBe(
        true,
      );
    });

    test("SALES cannot pull back its own submission", () => {
      expect(canTransitionRevision("SALES", "PENDING_APPROVAL", "DRAFT")).toBe(
        false,
      );
    });
  });

  describe("APPROVED_TO_SEND -> SENT (send)", () => {
    test.each([
      "SALES",
      "SALES_MANAGER",
      "SALES_DIRECTOR",
      "ADMIN",
    ] as const)("%s (offer-access) may send", (role) => {
      expect(canTransitionRevision(role, "APPROVED_TO_SEND", "SENT")).toBe(
        true,
      );
    });

    test("ENGINEER may not send", () => {
      expect(
        canTransitionRevision("ENGINEER", "APPROVED_TO_SEND", "SENT"),
      ).toBe(false);
    });
  });

  describe("SENT -> ACCEPTED / REJECTED / EXPIRED (record customer outcome)", () => {
    test.each([
      "SALES",
      "SALES_MANAGER",
      "SALES_DIRECTOR",
      "ADMIN",
    ] as const)("%s (offer-access) may record any outcome", (role) => {
      expect(canTransitionRevision(role, "SENT", "ACCEPTED")).toBe(true);
      expect(canTransitionRevision(role, "SENT", "REJECTED")).toBe(true);
      expect(canTransitionRevision(role, "SENT", "EXPIRED")).toBe(true);
    });

    test("ENGINEER may not record an outcome", () => {
      expect(canTransitionRevision("ENGINEER", "SENT", "ACCEPTED")).toBe(false);
      expect(canTransitionRevision("ENGINEER", "SENT", "REJECTED")).toBe(false);
      expect(canTransitionRevision("ENGINEER", "SENT", "EXPIRED")).toBe(false);
    });
  });

  describe("unsupported edges fail closed", () => {
    const badEdges: [OfferStatusType, OfferStatusType][] = [
      ["DRAFT", "APPROVED_TO_SEND"],
      ["DRAFT", "SENT"],
      ["PENDING_APPROVAL", "SENT"],
      ["SENT", "DRAFT"],
      ["ACCEPTED", "DRAFT"],
      ["ACCEPTED", "SENT"],
      ["REJECTED", "SENT"],
    ];
    test.each(badEdges)("ADMIN cannot jump %s -> %s", (from, to) => {
      expect(canTransitionRevision("ADMIN", from, to)).toBe(false);
    });
  });
});
