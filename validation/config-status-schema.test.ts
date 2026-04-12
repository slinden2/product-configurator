import { describe, expect, test } from "vitest";
import { configStatusSchema } from "@/validation/config-status-schema";

describe("configStatusSchema", () => {
  test.each([
    "DRAFT",
    "SUBMITTED",
    "IN_REVIEW",
    "APPROVED",
    "CLOSED",
  ])("should pass with valid status '%s'", (status) => {
    expect(() => configStatusSchema.parse({ status })).not.toThrow();
  });

  test("should fail with an invalid status value", () => {
    expect(() => configStatusSchema.parse({ status: "PENDING" })).toThrow();
  });

  test("should fail when status is undefined", () => {
    expect(() => configStatusSchema.parse({ status: undefined })).toThrow();
  });

  test("should fail when status is an empty string", () => {
    expect(() => configStatusSchema.parse({ status: "" })).toThrow();
  });
});
