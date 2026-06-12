import { describe, expect, test } from "vitest";
import { installationItemSettingsSchema } from "@/validation/installation-item-settings-schema";

describe("installationItemSettingsSchema", () => {
  test("accepts BASE_SYSTEM kind with numeric price and formats as string", () => {
    const result = installationItemSettingsSchema.parse({
      kind: "BASE_SYSTEM",
      price: 1500,
    });
    expect(result.price).toBe("1500.00");
    expect(result.kind).toBe("BASE_SYSTEM");
  });

  test("accepts HP_ROOF_BAR kind", () => {
    const result = installationItemSettingsSchema.parse({
      kind: "HP_ROOF_BAR",
      price: 1200,
    });
    expect(result.price).toBe("1200.00");
    expect(result.kind).toBe("HP_ROOF_BAR");
  });

  test("coerces string price to number then formats it", () => {
    const result = installationItemSettingsSchema.parse({
      kind: "BASE_SYSTEM",
      price: "1500",
    });
    expect(result.price).toBe("1500.00");
  });

  test("accepts zero price (item not yet priced)", () => {
    const result = installationItemSettingsSchema.parse({
      kind: "BASE_SYSTEM",
      price: 0,
    });
    expect(result.price).toBe("0.00");
  });

  test("rejects negative price", () => {
    expect(() =>
      installationItemSettingsSchema.parse({ kind: "BASE_SYSTEM", price: -1 }),
    ).toThrow();
  });

  test("rejects unknown kind", () => {
    expect(() =>
      installationItemSettingsSchema.parse({ kind: "HEIGHT", price: 1000 }),
    ).toThrow();
  });
});
