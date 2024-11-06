import { genericRequiredMessage, invalidOption } from "@/validation/common";
import {
  TouchFixingType,
  TouchPosEnum,
  touchSchema,
} from "@/validation/configuration/touchSchema";
import { describe, test, expect } from "vitest";

// Helper function to create test data objects
function createTouchData({
  has_itecoweb = false,
  has_card_reader = false,
  card_qty,
  is_fast = false,
  touch_qty,
  touch_pos,
  touch_fixing_type,
}: {
  has_itecoweb?: boolean;
  has_card_reader?: boolean;
  card_qty?: number | string;
  is_fast?: boolean;
  touch_qty: number | string;
  touch_pos?: keyof typeof TouchPosEnum.enum;
  touch_fixing_type?: keyof typeof TouchFixingType.enum;
}) {
  return {
    has_itecoweb,
    has_card_reader,
    card_qty,
    is_fast,
    touch_qty,
    touch_pos,
    touch_fixing_type,
  };
}

describe("touchSchema", () => {
  describe("Validation of touchSchema with correct data", () => {
    test("should validate successfully with 1 touch, external position, and wall fixing type", () => {
      const validData = createTouchData({
        touch_qty: 1,
        touch_pos: TouchPosEnum.enum.EXTERNAL,
        touch_fixing_type: TouchFixingType.enum.WALL,
        card_qty: 50,
      });
      expect(() => touchSchema.parse(validData)).not.toThrow();
    });

    test("should validate successfully with 2 touches and post fixing type", () => {
      const validData = createTouchData({
        touch_qty: 2,
        touch_fixing_type: TouchFixingType.enum.POST,
        card_qty: 100,
      });
      expect(() => touchSchema.parse(validData)).not.toThrow();
    });

    test("should validate successfully with 0 card_qty and card reader disabled", () => {
      const validData = createTouchData({
        touch_qty: 1,
        touch_pos: TouchPosEnum.enum.INTERNAL,
        touch_fixing_type: undefined,
        card_qty: 0,
        has_card_reader: false,
      });
      expect(() => touchSchema.parse(validData)).not.toThrow();
    });
  });

  describe("Error cases in touchSchema validation", () => {
    test("should throw error if touch_qty is below minimum (1)", () => {
      const invalidData = createTouchData({
        touch_qty: 0,
        touch_pos: TouchPosEnum.enum.EXTERNAL,
        touch_fixing_type: TouchFixingType.enum.WALL,
      });
      expect(() => touchSchema.parse(invalidData)).toThrow();
    });

    test("should throw error if touch_qty is 1, touch_pos is INTERNAL and touch_fixing_type is set", () => {
      const invalidData = createTouchData({
        touch_qty: 1,
        touch_pos: TouchPosEnum.enum.INTERNAL,
        touch_fixing_type: TouchFixingType.enum.WALL,
      });
      expect(() => touchSchema.parse(invalidData)).toThrow();
    });

    test("should throw error if touch_qty is above maximum (2)", () => {
      const invalidData = createTouchData({
        touch_qty: 3,
        touch_pos: TouchPosEnum.enum.EXTERNAL,
        touch_fixing_type: TouchFixingType.enum.WALL,
      });
      expect(() => touchSchema.parse(invalidData)).toThrow();
    });

    test("should throw error if touch_pos is INTERNAL and touch_fixing_type is set", () => {
      const invalidData = createTouchData({
        touch_qty: 1,
        touch_pos: TouchPosEnum.enum.INTERNAL,
        touch_fixing_type: TouchFixingType.enum.POST,
      });
      expect(() => touchSchema.parse(invalidData)).toThrowError(invalidOption);
    });

    test("should throw error if touch_pos is EXTERNAL and touch_fixing_type is not set", () => {
      const invalidData = createTouchData({
        touch_qty: 1,
        touch_pos: TouchPosEnum.enum.EXTERNAL,
        touch_fixing_type: undefined,
      });
      expect(() => touchSchema.parse(invalidData)).toThrowError(
        genericRequiredMessage
      );
    });

    test("should throw error if card_qty is not a multiple of 50", () => {
      const invalidData = createTouchData({
        touch_qty: 1,
        touch_pos: TouchPosEnum.enum.EXTERNAL,
        touch_fixing_type: TouchFixingType.enum.WALL,
        card_qty: 75,
      });
      expect(() => touchSchema.parse(invalidData)).toThrowError(
        "Solo multipli di 50"
      );
    });

    test("should throw error if card_qty exceeds 300", () => {
      const invalidData = createTouchData({
        touch_qty: 2,
        touch_fixing_type: TouchFixingType.enum.WALL,
        card_qty: 350,
      });
      expect(() => touchSchema.parse(invalidData)).toThrow();
    });
  });

  describe("Coercion cases for touchSchema", () => {
    test("should coerce card_qty from string to number", () => {
      const validData = createTouchData({
        touch_qty: 1,
        touch_pos: TouchPosEnum.enum.EXTERNAL,
        touch_fixing_type: TouchFixingType.enum.WALL,
        card_qty: "50",
      });
      const parsedData = touchSchema.parse(validData);
      expect(parsedData.card_qty).toBe(50);
    });

    test("should coerce touch_qty from string to number", () => {
      const validData = createTouchData({
        touch_qty: "2",
        touch_fixing_type: TouchFixingType.enum.POST,
        card_qty: 100,
      });
      const parsedData = touchSchema.parse(validData);
      expect(parsedData.touch_qty).toBe(2);
    });
  });
});
