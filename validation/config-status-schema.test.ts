import { configStatusSchema } from "@/validation/config-status.schema";
import { describe, test, expect } from "vitest";

describe("configStatusSchema", () => {
  test.each(["DRAFT", "OPEN", "LOCKED", "CLOSED"])(
    "should pass with valid status '%s'",
    (status) => {
      expect(() => configStatusSchema.parse({ status })).not.toThrow();
    }
  );

  test("should fail with an invalid status value", () => {
    expect(() =>
      configStatusSchema.parse({ status: "PENDING" })
    ).toThrow();
  });

  test("should fail when status is undefined", () => {
    expect(() =>
      configStatusSchema.parse({ status: undefined })
    ).toThrow();
  });

  test("should fail when status is an empty string", () => {
    expect(() =>
      configStatusSchema.parse({ status: "" })
    ).toThrow();
  });
});
