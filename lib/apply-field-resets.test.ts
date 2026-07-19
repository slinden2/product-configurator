import type { UseFormSetValue } from "react-hook-form";
import { describe, expect, test, vi } from "vitest";
import { applyFieldResets } from "./apply-field-resets";

// A minimal form shape for exercising the helper's path/value typing.
interface TestForm {
  a: string;
  b: number;
  c: boolean;
  d: string;
}

describe("applyFieldResets", () => {
  test("resets each listed field to the config's resetToValue with validate + dirty", () => {
    const setValue = vi.fn() as unknown as UseFormSetValue<TestForm>;

    applyFieldResets(setValue, [
      { fieldsToReset: ["a", "d"], resetToValue: "fallback" },
    ]);

    expect(setValue).toHaveBeenCalledTimes(2);
    expect(setValue).toHaveBeenNthCalledWith(1, "a", "fallback", {
      shouldValidate: true,
      shouldDirty: true,
    });
    expect(setValue).toHaveBeenNthCalledWith(2, "d", "fallback", {
      shouldValidate: true,
      shouldDirty: true,
    });
  });

  test("coalesces a missing resetToValue to undefined", () => {
    const setValue = vi.fn() as unknown as UseFormSetValue<TestForm>;

    applyFieldResets(setValue, [{ fieldsToReset: ["b"] }]);

    expect(setValue).toHaveBeenCalledExactlyOnceWith("b", undefined, {
      shouldValidate: true,
      shouldDirty: true,
    });
  });

  test("applies multiple configs, each with its own value", () => {
    const setValue = vi.fn() as unknown as UseFormSetValue<TestForm>;

    applyFieldResets(setValue, [
      { fieldsToReset: ["c"], resetToValue: false },
      { fieldsToReset: ["b"], resetToValue: 0 },
    ]);

    expect(setValue).toHaveBeenCalledTimes(2);
    expect(setValue).toHaveBeenNthCalledWith(1, "c", false, {
      shouldValidate: true,
      shouldDirty: true,
    });
    expect(setValue).toHaveBeenNthCalledWith(2, "b", 0, {
      shouldValidate: true,
      shouldDirty: true,
    });
  });

  test("is a no-op for an empty config list", () => {
    const setValue = vi.fn() as unknown as UseFormSetValue<TestForm>;

    applyFieldResets(setValue, []);

    expect(setValue).not.toHaveBeenCalled();
  });
});
