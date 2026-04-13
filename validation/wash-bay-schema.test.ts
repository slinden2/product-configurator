import { describe, expect, test } from "vitest";
import { washBaySchema } from "@/validation/wash-bay-schema";

describe("washBaySchema", () => {
  describe("Lance quantities (must be 0 or 2)", () => {
    test("should pass with both lances at 0", () => {
      expect(() =>
        washBaySchema.parse({ hp_lance_qty: 0, det_lance_qty: 0 }),
      ).not.toThrow();
    });

    test("should pass with both lances at 2", () => {
      expect(() =>
        washBaySchema.parse({ hp_lance_qty: 2, det_lance_qty: 2 }),
      ).not.toThrow();
    });

    test("should pass with mixed valid values (0 and 2)", () => {
      expect(() =>
        washBaySchema.parse({ hp_lance_qty: 0, det_lance_qty: 2 }),
      ).not.toThrow();
    });

    test("should fail when hp_lance_qty is 1", () => {
      expect(() =>
        washBaySchema.parse({ hp_lance_qty: 1, det_lance_qty: 0 }),
      ).toThrow("La quantità di lance deve essere 0 o 2.");
    });

    test("should fail when det_lance_qty is 1", () => {
      expect(() =>
        washBaySchema.parse({ hp_lance_qty: 0, det_lance_qty: 1 }),
      ).toThrow("La quantità di lance deve essere 0 o 2.");
    });

    test("should fail when hp_lance_qty is 3", () => {
      expect(() =>
        washBaySchema.parse({ hp_lance_qty: 3, det_lance_qty: 0 }),
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
        }),
      ).not.toThrow();
    });

    test("should pass when neither pressure_washer_type nor qty are set", () => {
      expect(() =>
        washBaySchema.parse({
          hp_lance_qty: 0,
          det_lance_qty: 0,
          pressure_washer_type: undefined,
          pressure_washer_qty: undefined,
        }),
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

    test("should pass when pressure_washer_qty is 3", () => {
      const result = washBaySchema.safeParse({
        hp_lance_qty: 0,
        det_lance_qty: 0,
        pressure_washer_type: "L21_150BAR",
        pressure_washer_qty: 3,
      });
      expect(result.success).toBe(true);
    });

    test("should fail when pressure_washer_qty exceeds max of 3", () => {
      const result = washBaySchema.safeParse({
        hp_lance_qty: 0,
        det_lance_qty: 0,
        pressure_washer_type: "L21_150BAR",
        pressure_washer_qty: 4,
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

    test("should apply default 0 for all hose reel fields", () => {
      const result = washBaySchema.parse({
        hp_lance_qty: 0,
        det_lance_qty: 0,
      });
      expect(result.hose_reel_hp_with_post_qty).toBe(0);
      expect(result.hose_reel_hp_without_post_qty).toBe(0);
      expect(result.hose_reel_det_with_post_qty).toBe(0);
      expect(result.hose_reel_det_without_post_qty).toBe(0);
      expect(result.hose_reel_hp_det_with_post_qty).toBe(0);
    });
  });

  describe("Optional fields", () => {
    test("should accept valid energy_chain_width", () => {
      expect(() =>
        washBaySchema.parse({
          hp_lance_qty: 0,
          det_lance_qty: 0,
          energy_chain_width: "L200",
        }),
      ).not.toThrow();
    });

    test("should accept each hose reel field up to max 2", () => {
      expect(() =>
        washBaySchema.parse({
          hp_lance_qty: 0,
          det_lance_qty: 0,
          hose_reel_hp_with_post_qty: 2,
          hose_reel_hp_without_post_qty: 0,
          hose_reel_det_with_post_qty: 0,
          hose_reel_det_without_post_qty: 0,
          hose_reel_hp_det_with_post_qty: 0,
        }),
      ).not.toThrow();
    });

    test("should fail when any hose reel field exceeds max of 2", () => {
      expect(() =>
        washBaySchema.parse({
          hp_lance_qty: 0,
          det_lance_qty: 0,
          hose_reel_hp_with_post_qty: 3,
        }),
      ).toThrow();
    });

    test("should fail when total hose reels exceed 3", () => {
      const result = washBaySchema.safeParse({
        hp_lance_qty: 0,
        det_lance_qty: 0,
        hose_reel_hp_with_post_qty: 2,
        hose_reel_hp_without_post_qty: 2,
        hose_reel_det_with_post_qty: 0,
        hose_reel_det_without_post_qty: 0,
        hose_reel_hp_det_with_post_qty: 0,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const msg =
          result.error.flatten().fieldErrors.hose_reel_hp_with_post_qty;
        expect(msg?.[0]).toContain("non può superare 3");
      }
    });

    test("should accept total hose reels equal to 3", () => {
      expect(() =>
        washBaySchema.parse({
          hp_lance_qty: 0,
          det_lance_qty: 0,
          hose_reel_hp_with_post_qty: 1,
          hose_reel_det_with_post_qty: 1,
          hose_reel_hp_det_with_post_qty: 1,
        }),
      ).not.toThrow();
    });
  });

  describe("Energy chain hose/cable quantities", () => {
    test("should accept all ec fields as undefined", () => {
      const result = washBaySchema.safeParse({
        hp_lance_qty: 0,
        det_lance_qty: 0,
      });
      expect(result.success).toBe(true);
    });

    test("should accept ec_profinet_cable_qty within range 0-1", () => {
      expect(
        washBaySchema.safeParse({
          hp_lance_qty: 0,
          det_lance_qty: 0,
          ec_profinet_cable_qty: 0,
        }).success,
      ).toBe(true);
      expect(
        washBaySchema.safeParse({
          hp_lance_qty: 0,
          det_lance_qty: 0,
          ec_profinet_cable_qty: 1,
        }).success,
      ).toBe(true);
    });

    test("should reject ec_profinet_cable_qty > 1", () => {
      expect(
        washBaySchema.safeParse({
          hp_lance_qty: 0,
          det_lance_qty: 0,
          ec_profinet_cable_qty: 2,
        }).success,
      ).toBe(false);
    });

    test("should accept ec_r2_34_inox_tube_qty up to 3", () => {
      expect(
        washBaySchema.safeParse({
          hp_lance_qty: 0,
          det_lance_qty: 0,
          ec_r2_34_inox_tube_qty: 3,
        }).success,
      ).toBe(true);
    });

    test("should reject ec_r2_34_inox_tube_qty > 3", () => {
      expect(
        washBaySchema.safeParse({
          hp_lance_qty: 0,
          det_lance_qty: 0,
          ec_r2_34_inox_tube_qty: 4,
        }).success,
      ).toBe(false);
    });

    test("should reject ec_air_tube_qty > 1", () => {
      expect(
        washBaySchema.safeParse({
          hp_lance_qty: 0,
          det_lance_qty: 0,
          ec_air_tube_qty: 2,
        }).success,
      ).toBe(false);
    });

    test("should require ec_signal_cable_qty when energy chain is active", () => {
      const result = washBaySchema.safeParse({
        hp_lance_qty: 0,
        det_lance_qty: 0,
        has_gantry: true,
        energy_chain_width: "L200",
        ec_signal_cable_qty: undefined,
      });
      expect(result.success).toBe(false);
    });

    test("should require ec_water_1_tube_qty when energy chain is active", () => {
      const result = washBaySchema.safeParse({
        hp_lance_qty: 0,
        det_lance_qty: 0,
        has_gantry: true,
        energy_chain_width: "L200",
        ec_water_1_tube_qty: undefined,
      });
      expect(result.success).toBe(false);
    });

    test("should pass when energy chain is active and required fields are set", () => {
      const result = washBaySchema.safeParse({
        hp_lance_qty: 0,
        det_lance_qty: 0,
        has_gantry: true,
        energy_chain_width: "L200",
        ec_signal_cable_qty: 1,
        ec_water_1_tube_qty: 1,
      });
      expect(result.success).toBe(true);
    });
  });
});
