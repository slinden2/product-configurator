import { describe, test, expect } from "vitest";
import { isEditable } from "@/app/actions/lib/auth-checks";
import type { ConfigurationStatusType, Role } from "@/types";

describe("isEditable", () => {
  describe("LOCKED and CLOSED are never editable", () => {
    const roles: Role[] = ["EXTERNAL", "INTERNAL", "ADMIN"];

    test.each(roles)("LOCKED is not editable for %s", (role) => {
      expect(isEditable("LOCKED", role)).toBe(false);
    });

    test.each(roles)("CLOSED is not editable for %s", (role) => {
      expect(isEditable("CLOSED", role)).toBe(false);
    });
  });

  describe("EXTERNAL role", () => {
    test("can edit DRAFT", () => {
      expect(isEditable("DRAFT", "EXTERNAL")).toBe(true);
    });

    test("cannot edit OPEN", () => {
      expect(isEditable("OPEN", "EXTERNAL")).toBe(false);
    });
  });

  describe("INTERNAL role", () => {
    test("can edit DRAFT", () => {
      expect(isEditable("DRAFT", "INTERNAL")).toBe(true);
    });

    test("can edit OPEN", () => {
      expect(isEditable("OPEN", "INTERNAL")).toBe(true);
    });
  });

  describe("ADMIN role", () => {
    test("can edit DRAFT", () => {
      expect(isEditable("DRAFT", "ADMIN")).toBe(true);
    });

    test("can edit OPEN", () => {
      expect(isEditable("OPEN", "ADMIN")).toBe(true);
    });
  });
});