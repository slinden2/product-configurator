import { describe, expect, test } from "vitest";
import { surchargeSettingsSchema } from "@/validation/surcharge-settings-schema";

describe("surchargeSettingsSchema", () => {
  test("accepts HEIGHT kind with numeric price and formats as string", () => {
    const result = surchargeSettingsSchema.parse({
      kind: "HEIGHT",
      price: 1500,
    });
    expect(result.price).toBe("1500.00");
    expect(result.kind).toBe("HEIGHT");
  });

  test("accepts PAINT kind", () => {
    const result = surchargeSettingsSchema.parse({
      kind: "PAINT",
      price: 1200,
    });
    expect(result.price).toBe("1200.00");
    expect(result.kind).toBe("PAINT");
  });

  test("coerces string price to number then formats it", () => {
    const result = surchargeSettingsSchema.parse({
      kind: "HEIGHT",
      price: "1500",
    });
    expect(result.price).toBe("1500.00");
  });

  test("formats decimal prices correctly", () => {
    const result = surchargeSettingsSchema.parse({
      kind: "PAINT",
      price: 1250.5,
    });
    expect(result.price).toBe("1250.50");
  });

  test("rejects zero price", () => {
    expect(() =>
      surchargeSettingsSchema.parse({ kind: "HEIGHT", price: 0 }),
    ).toThrow();
  });

  test("rejects negative price", () => {
    expect(() =>
      surchargeSettingsSchema.parse({ kind: "HEIGHT", price: -100 }),
    ).toThrow();
  });

  test("rejects unknown kind", () => {
    expect(() =>
      surchargeSettingsSchema.parse({ kind: "DISCOUNT", price: 1000 }),
    ).toThrow();
  });
});
