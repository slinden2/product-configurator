import { describe, test, expect } from "vitest";
import { isEditable } from "@/app/actions/lib/auth-checks";
import type { ConfigurationStatusType, Role } from "@/types";

describe("isEditable", () => {
  describe("APPROVED and CLOSED are never editable", () => {
    const roles: Role[] = ["EXTERNAL", "INTERNAL", "ADMIN"];

    test.each(roles)("APPROVED is not editable for %s", (role) => {
      expect(isEditable("APPROVED", role)).toBe(false);
    });

    test.each(roles)("CLOSED is not editable for %s", (role) => {
      expect(isEditable("CLOSED", role)).toBe(false);
    });
  });

  describe("EXTERNAL role", () => {
    test("can edit DRAFT", () => {
      expect(isEditable("DRAFT", "EXTERNAL")).toBe(true);
    });

    test("cannot edit SUBMITTED", () => {
      expect(isEditable("SUBMITTED", "EXTERNAL")).toBe(false);
    });

    test("cannot edit IN_REVIEW", () => {
      expect(isEditable("IN_REVIEW", "EXTERNAL")).toBe(false);
    });
  });

  describe("INTERNAL role", () => {
    test("can edit DRAFT", () => {
      expect(isEditable("DRAFT", "INTERNAL")).toBe(true);
    });

    test("can edit SUBMITTED", () => {
      expect(isEditable("SUBMITTED", "INTERNAL")).toBe(true);
    });

    test("can edit IN_REVIEW", () => {
      expect(isEditable("IN_REVIEW", "INTERNAL")).toBe(true);
    });
  });

  describe("ADMIN role", () => {
    test("can edit DRAFT", () => {
      expect(isEditable("DRAFT", "ADMIN")).toBe(true);
    });

    test("can edit SUBMITTED", () => {
      expect(isEditable("SUBMITTED", "ADMIN")).toBe(true);
    });

    test("can edit IN_REVIEW", () => {
      expect(isEditable("IN_REVIEW", "ADMIN")).toBe(true);
    });
  });
});