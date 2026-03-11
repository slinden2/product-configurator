import { supplyTypeSchema } from "@/validation/configuration/supply-type-schema";
import { describe, test, expect } from "vitest";

describe("supplyTypeSchema", () => {
  describe("supply_type undefined", () => {
    test("should fail when supply_type is undefined", () => {
      const result = supplyTypeSchema.safeParse({
        supply_type: undefined,
        supply_side: "LEFT",
        supply_fixing_type: "POST",
        has_post_frame: false,
      });
      expect(result.success).toBe(false);
    });
  });

  describe("STRAIGHT_SHELF", () => {
    test("should pass without fixing type (fixing type is optional)", () => {
      expect(() =>
        supplyTypeSchema.parse({
          supply_type: "STRAIGHT_SHELF",
          supply_side: "LEFT",
          supply_fixing_type: undefined,
          has_post_frame: false,
        })
      ).not.toThrow();
    });

    test("should pass with POST fixing type and has_post_frame true", () => {
      expect(() =>
        supplyTypeSchema.parse({
          supply_type: "STRAIGHT_SHELF",
          supply_side: "RIGHT",
          supply_fixing_type: "POST",
          has_post_frame: true,
        })
      ).not.toThrow();
    });

    test("should pass with WALL fixing type and has_post_frame false", () => {
      expect(() =>
        supplyTypeSchema.parse({
          supply_type: "STRAIGHT_SHELF",
          supply_side: "LEFT",
          supply_fixing_type: "WALL",
          has_post_frame: false,
        })
      ).not.toThrow();
    });

    test("should fail when has_post_frame is true but fixing is WALL", () => {
      expect(() =>
        supplyTypeSchema.parse({
          supply_type: "STRAIGHT_SHELF",
          supply_side: "LEFT",
          supply_fixing_type: "WALL",
          has_post_frame: true,
        })
      ).toThrow("Telaio disponibile solo con fissaggio a Palo.");
    });

    test("should fail when supply_side is missing", () => {
      const result = supplyTypeSchema.safeParse({
        supply_type: "STRAIGHT_SHELF",
        supply_side: undefined,
        supply_fixing_type: undefined,
        has_post_frame: false,
      });
      expect(result.success).toBe(false);
    });
  });

  describe("BOOM", () => {
    test("should pass with fixing type set", () => {
      expect(() =>
        supplyTypeSchema.parse({
          supply_type: "BOOM",
          supply_side: "RIGHT",
          supply_fixing_type: "WALL",
          has_post_frame: false,
        })
      ).not.toThrow();
    });

    test("should fail when fixing type is missing", () => {
      const result = supplyTypeSchema.safeParse({
        supply_type: "BOOM",
        supply_side: "LEFT",
        supply_fixing_type: undefined,
        has_post_frame: false,
      });
      expect(result.success).toBe(false);
    });

    test("should fail when supply_side is missing", () => {
      const result = supplyTypeSchema.safeParse({
        supply_type: "BOOM",
        supply_side: undefined,
        supply_fixing_type: "POST",
        has_post_frame: false,
      });
      expect(result.success).toBe(false);
    });
  });

  describe("ENERGY_CHAIN", () => {
    test("should pass with fixing type set and has_post_frame false", () => {
      expect(() =>
        supplyTypeSchema.parse({
          supply_type: "ENERGY_CHAIN",
          supply_side: "LEFT",
          supply_fixing_type: "POST",
          has_post_frame: false,
        })
      ).not.toThrow();
    });

    test("should fail when fixing type is missing", () => {
      const result = supplyTypeSchema.safeParse({
        supply_type: "ENERGY_CHAIN",
        supply_side: "LEFT",
        supply_fixing_type: undefined,
        has_post_frame: false,
      });
      expect(result.success).toBe(false);
    });

    test("should fail when has_post_frame is true", () => {
      const result = supplyTypeSchema.safeParse({
        supply_type: "ENERGY_CHAIN",
        supply_side: "LEFT",
        supply_fixing_type: "POST",
        has_post_frame: true,
      });
      expect(result.success).toBe(false);
    });
  });
});
