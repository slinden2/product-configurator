import { describe, expect, test } from "vitest";
import {
  canTransition,
  classifyOfferFreezeTransition,
  isEditable,
} from "@/app/actions/lib/auth-checks";
import type { ConfigurationStatusType, Role } from "@/types";

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

  describe("SALES role", () => {
    test("can edit DRAFT", () => {
      expect(isEditable("DRAFT", "SALES")).toBe(true);
    });

    test("cannot edit IN_SALES_REVIEW", () => {
      expect(isEditable("IN_SALES_REVIEW", "SALES")).toBe(false);
    });

    test("cannot edit IN_TECH_REVIEW", () => {
      expect(isEditable("IN_TECH_REVIEW", "SALES")).toBe(false);
    });
  });

  describe.each([
    "SALES_MANAGER",
    "SALES_DIRECTOR",
  ] as const)("%s role", (role) => {
    test("can edit DRAFT", () => {
      expect(isEditable("DRAFT", role)).toBe(true);
    });

    test("can edit IN_SALES_REVIEW", () => {
      expect(isEditable("IN_SALES_REVIEW", role)).toBe(true);
    });

    test("cannot edit IN_TECH_REVIEW", () => {
      expect(isEditable("IN_TECH_REVIEW", role)).toBe(false);
    });
  });

  describe.each(["ENGINEER", "ADMIN"] as const)("%s role", (role) => {
    test("can edit DRAFT", () => {
      expect(isEditable("DRAFT", role)).toBe(true);
    });

    test("can edit IN_SALES_REVIEW", () => {
      expect(isEditable("IN_SALES_REVIEW", role)).toBe(true);
    });

    test("can edit IN_TECH_REVIEW", () => {
      expect(isEditable("IN_TECH_REVIEW", role)).toBe(true);
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

describe("classifyOfferFreezeTransition", () => {
  test("freezes on the standard sales approval edge", () => {
    expect(
      classifyOfferFreezeTransition("IN_SALES_REVIEW", "SALES_APPROVED"),
    ).toBe("freeze");
  });

  test("thaws on the standard un-approval edge", () => {
    expect(
      classifyOfferFreezeTransition("SALES_APPROVED", "IN_SALES_REVIEW"),
    ).toBe("thaw");
  });

  test.each([
    ["DRAFT", "SALES_APPROVED"],
    ["DRAFT", "IN_TECH_REVIEW"],
    ["IN_SALES_REVIEW", "TECH_APPROVED"],
    ["IN_SALES_REVIEW", "CLOSED"],
  ] as [
    ConfigurationStatusType,
    ConfigurationStatusType,
  ][])("freezes on non-adjacent jump %s -> %s (entering frozen zone)", (from, to) => {
    expect(classifyOfferFreezeTransition(from, to)).toBe("freeze");
  });

  test.each([
    ["SALES_APPROVED", "DRAFT"],
    ["IN_TECH_REVIEW", "DRAFT"],
    ["TECH_APPROVED", "IN_SALES_REVIEW"],
    ["CLOSED", "DRAFT"],
  ] as [
    ConfigurationStatusType,
    ConfigurationStatusType,
  ][])("thaws on non-adjacent jump %s -> %s (leaving frozen zone)", (from, to) => {
    expect(classifyOfferFreezeTransition(from, to)).toBe("thaw");
  });

  test.each([
    ["SALES_APPROVED", "IN_TECH_REVIEW"],
    ["IN_TECH_REVIEW", "SALES_APPROVED"],
    ["IN_TECH_REVIEW", "TECH_APPROVED"],
    ["TECH_APPROVED", "CLOSED"],
    ["DRAFT", "IN_SALES_REVIEW"],
    ["IN_SALES_REVIEW", "DRAFT"],
  ] as [
    ConfigurationStatusType,
    ConfigurationStatusType,
  ][])("is a no-op within a zone %s -> %s", (from, to) => {
    expect(classifyOfferFreezeTransition(from, to)).toBeNull();
  });
});
