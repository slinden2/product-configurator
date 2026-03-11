import { washBaySchema } from "@/validation/wash-bay-schema";
import { describe, test, expect } from "vitest";

describe("washBaySchema", () => {
  describe("Lance quantities (must be 0 or 2)", () => {
    test("should pass with both lances at 0", () => {
      expect(() =>
        washBaySchema.parse({ hp_lance_qty: 0, det_lance_qty: 0 })
      ).not.toThrow();
    });

    test("should pass with both lances at 2", () => {
      expect(() =>
        washBaySchema.parse({ hp_lance_qty: 2, det_lance_qty: 2 })
      ).not.toThrow();
    });

    test("should pass with mixed valid values (0 and 2)", () => {
      expect(() =>
        washBaySchema.parse({ hp_lance_qty: 0, det_lance_qty: 2 })
      ).not.toThrow();
    });

    test("should fail when hp_lance_qty is 1", () => {
      expect(() =>
        washBaySchema.parse({ hp_lance_qty: 1, det_lance_qty: 0 })
      ).toThrow("La quantità di lance deve essere 0 o 2.");
    });

    test("should fail when det_lance_qty is 1", () => {
      expect(() =>
        washBaySchema.parse({ hp_lance_qty: 0, det_lance_qty: 1 })
      ).toThrow("La quantità di lance deve essere 0 o 2.");
    });

    test("should fail when hp_lance_qty is 3", () => {
      expect(() =>
        washBaySchema.parse({ hp_lance_qty: 3, det_lance_qty: 0 })
      ).toThrow("La quantità di lance deve essere 0 o 2.");
    });
  });

  describe("Pressure washer type/qty interdependency", () => {
    test("should pass when both pressure_washer_type and qty are set", () => {
      expect(() =>
        washBaySchema.parse({
          hp_lance_qty: 0,
          det_lance_qty: 0,
          pressure_washer_type: "L21_150BAR",
          pressure_washer_qty: 1,
        })
      ).not.toThrow();
    });

    test("should pass when neither pressure_washer_type nor qty are set", () => {
      expect(() =>
        washBaySchema.parse({
          hp_lance_qty: 0,
          det_lance_qty: 0,
          pressure_washer_type: undefined,
          pressure_washer_qty: undefined,
        })
      ).not.toThrow();
    });

    test("should fail when pressure_washer_type is set but qty is 0", () => {
      const result = washBaySchema.safeParse({
        hp_lance_qty: 0,
        det_lance_qty: 0,
        pressure_washer_type: "L21_150BAR",
        pressure_washer_qty: 0,
      });
      expect(result.success).toBe(false);
    });

    test("should fail when pressure_washer_type is set but qty is undefined", () => {
      const result = washBaySchema.safeParse({
        hp_lance_qty: 0,
        det_lance_qty: 0,
        pressure_washer_type: "L21_200BAR",
        pressure_washer_qty: undefined,
      });
      expect(result.success).toBe(false);
    });

    test("should fail when pressure_washer_qty is set but type is undefined", () => {
      const result = washBaySchema.safeParse({
        hp_lance_qty: 0,
        det_lance_qty: 0,
        pressure_washer_type: undefined,
        pressure_washer_qty: 2,
      });
      expect(result.success).toBe(false);
    });
  });

  describe("Default values", () => {
    test("should apply default false for all boolean flags", () => {
      const result = washBaySchema.parse({
        hp_lance_qty: 0,
        det_lance_qty: 0,
      });
      expect(result.has_gantry).toBe(false);
      expect(result.has_shelf_extension).toBe(false);
      expect(result.is_first_bay).toBe(false);
      expect(result.has_bay_dividers).toBe(false);
    });

    test("should apply default 0 for hose_reel_qty", () => {
      const result = washBaySchema.parse({
        hp_lance_qty: 0,
        det_lance_qty: 0,
      });
      expect(result.hose_reel_qty).toBe(0);
    });
  });

  describe("Optional fields", () => {
    test("should accept valid energy_chain_width", () => {
      expect(() =>
        washBaySchema.parse({
          hp_lance_qty: 0,
          det_lance_qty: 0,
          energy_chain_width: "L200",
        })
      ).not.toThrow();
    });

    test("should accept hose_reel_qty up to max 2", () => {
      expect(() =>
        washBaySchema.parse({
          hp_lance_qty: 0,
          det_lance_qty: 0,
          hose_reel_qty: 2,
        })
      ).not.toThrow();
    });

    test("should fail when hose_reel_qty exceeds max of 2", () => {
      expect(() =>
        washBaySchema.parse({
          hp_lance_qty: 0,
          det_lance_qty: 0,
          hose_reel_qty: 3,
        })
      ).toThrow();
    });
  });
});
