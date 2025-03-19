import { genericRequiredMessage } from "@/validation/common";
import {
  RailTypeEnum,
  railSchema,
} from "@/validation/configuration/rail-schema";
import { describe, test, expect } from "vitest";

// Helper function to create rail data objects for testing
function createRailObject({
  rail_type,
  rail_length,
  rail_guide_qty,
}: {
  rail_type: keyof typeof RailTypeEnum.enum;
  rail_length: number | string;
  rail_guide_qty: number | string;
}) {
  return {
    rail_type,
    rail_length,
    rail_guide_qty,
  };
}

describe("railSchema", () => {
  describe("Validation of railSchema with correct data", () => {
    test("should validate successfully with a rail type, length within range, and guide quantity", () => {
      const validData = createRailObject({
        rail_type: RailTypeEnum.enum.DOWELED,
        rail_length: 21,
        rail_guide_qty: 1,
      });
      expect(() => railSchema.parse(validData)).not.toThrow();
    });

    test("should validate successfully with minimum rail length and zero guide quantity", () => {
      const validData = createRailObject({
        rail_type: RailTypeEnum.enum.WELDED,
        rail_length: 7,
        rail_guide_qty: 0,
      });
      expect(() => railSchema.parse(validData)).not.toThrow();
    });

    test("should validate successfully with maximum rail length and maximum guide quantity", () => {
      const validData = createRailObject({
        rail_type: RailTypeEnum.enum.WELDED,
        rail_length: 26,
        rail_guide_qty: 2,
      });
      expect(() => railSchema.parse(validData)).not.toThrow();
    });
  });

  describe("Error cases in railSchema validation", () => {
    test("should throw error if rail_type is missing", () => {
      const invalidData = {
        rail_length: 21,
        rail_guide_qty: 1,
      };
      expect(() => railSchema.parse(invalidData)).toThrow(
        genericRequiredMessage
      );
    });

    test("should throw error if rail_length is below minimum value", () => {
      const invalidData = createRailObject({
        rail_type: RailTypeEnum.enum.DOWELED,
        rail_length: 6,
        rail_guide_qty: 1,
      });
      expect(() => railSchema.parse(invalidData)).toThrow();
    });

    test("should throw error if rail_length is above maximum value", () => {
      const invalidData = createRailObject({
        rail_type: RailTypeEnum.enum.WELDED,
        rail_length: 27,
        rail_guide_qty: 1,
      });
      expect(() => railSchema.parse(invalidData)).toThrow();
    });

    test("should throw error if rail_guide_qty is below 0", () => {
      const invalidData = createRailObject({
        rail_type: RailTypeEnum.enum.DOWELED,
        rail_length: 21,
        rail_guide_qty: -1,
      });
      expect(() => railSchema.parse(invalidData)).toThrow();
    });

    test("should throw error if rail_guide_qty is above 2", () => {
      const invalidData = createRailObject({
        rail_type: RailTypeEnum.enum.WELDED,
        rail_length: 21,
        rail_guide_qty: 3,
      });
      expect(() => railSchema.parse(invalidData)).toThrow();
    });
  });

  describe("Coercion cases for railSchema", () => {
    test("should coerce rail_length from string to number", () => {
      const validData = createRailObject({
        rail_type: RailTypeEnum.enum.DOWELED,
        rail_length: "21",
        rail_guide_qty: 1,
      });
      const parsedData = railSchema.parse(validData);
      expect(parsedData.rail_length).toBe(21);
    });

    test("should coerce rail_guide_qty from string to number", () => {
      const validData = createRailObject({
        rail_type: RailTypeEnum.enum.WELDED,
        rail_length: 21,
        rail_guide_qty: "2",
      });
      const parsedData = railSchema.parse(validData);
      expect(parsedData.rail_guide_qty).toBe(2);
    });
  });
});
