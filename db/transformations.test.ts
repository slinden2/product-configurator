import { describe, expect, test } from "vitest";
import { transformWashBaySchemaToDbData } from "@/db/transformations";
import { washBayDefaults } from "@/validation/wash-bay-schema";

describe("transformWashBaySchemaToDbData", () => {
  test("maps cleared pressure washer fields to explicit null (not undefined)", () => {
    const dbData = transformWashBaySchemaToDbData({
      ...washBayDefaults,
      pressure_washer_type: undefined,
      pressure_washer_qty: undefined,
    });

    // Explicit null keys so Drizzle .set() writes them, instead of skipping
    // undefined keys and leaving stale values in the DB.
    expect(dbData.pressure_washer_type).toBeNull();
    expect(dbData.pressure_washer_qty).toBeNull();
  });

  test("passes populated pressure washer fields through unchanged", () => {
    const dbData = transformWashBaySchemaToDbData({
      ...washBayDefaults,
      pressure_washer_type: "L21_200BAR",
      pressure_washer_qty: 2,
    });

    expect(dbData.pressure_washer_type).toBe("L21_200BAR");
    expect(dbData.pressure_washer_qty).toBe(2);
  });
});
