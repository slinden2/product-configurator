import { describe, expect, test } from "vitest";
import { canApproveRevision } from "@/lib/access";
import type { Role } from "@/types";

describe("canApproveRevision", () => {
  test.each([
    "SALES_MANAGER",
    "SALES_DIRECTOR",
    "ADMIN",
  ] as const)("%s may approve a revision", (role) => {
    expect(canApproveRevision(role)).toBe(true);
  });

  test.each([
    "SALES",
    "ENGINEER",
  ] as Role[])("%s may not approve a revision", (role) => {
    expect(canApproveRevision(role)).toBe(false);
  });
});
