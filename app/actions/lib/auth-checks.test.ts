import { describe, expect, test } from "vitest";
import { canTransitionRevision } from "@/app/actions/lib/auth-checks";
import type { OfferStatusType, Role } from "@/types";

// isEditable and canTransition moved to lib/status-config.ts (pure domain
// logic); their suites live in lib/status-config.test.ts. This file covers only
// canTransitionRevision, which still lives in auth-checks.ts.
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

  describe("ACCEPTED -> SENT (undo a mistaken acceptance): ADMIN only", () => {
    test("ADMIN may undo an acceptance", () => {
      expect(canTransitionRevision("ADMIN", "ACCEPTED", "SENT")).toBe(true);
    });

    test.each([
      "SALES",
      "SALES_MANAGER",
      "SALES_DIRECTOR",
      "ENGINEER",
    ] as const)("%s may not undo an acceptance", (role) => {
      expect(canTransitionRevision(role, "ACCEPTED", "SENT")).toBe(false);
    });
  });

  describe("unsupported edges fail closed", () => {
    const badEdges: [OfferStatusType, OfferStatusType][] = [
      ["DRAFT", "APPROVED_TO_SEND"],
      ["DRAFT", "SENT"],
      ["PENDING_APPROVAL", "SENT"],
      ["SENT", "DRAFT"],
      ["ACCEPTED", "DRAFT"],
      ["REJECTED", "SENT"],
    ];
    test.each(badEdges)("ADMIN cannot jump %s -> %s", (from, to) => {
      expect(canTransitionRevision("ADMIN", from, to)).toBe(false);
    });
  });
});
