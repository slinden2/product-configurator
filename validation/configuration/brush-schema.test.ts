import { BrushColorType, BrushType } from "@/types";
import { brushSchema } from "@/validation/configuration/brush-schema";
import { describe, test, expect } from "vitest";

function createBrushObject(
  brushQty: number | undefined,
  brushType: BrushType | undefined,
  brushColor: BrushColorType | undefined,
) {
  return {
    brush_qty: brushQty,
    brush_type: brushType,
    brush_color: brushColor,
  };
}

describe("brushSchema", () => {
  describe("General schema tests", () => {
    test("should validate successfully with all fields correctly set", () => {
      const validData = createBrushObject(2, "THREAD", "GREEN_SILVER");
      expect(() => brushSchema.parse(validData)).not.toThrow();
    });

    test("should validate successfully with all fields correctly set with 0 brushes", () => {
      const validData = createBrushObject(0, undefined, undefined);
      expect(() => brushSchema.parse(validData)).not.toThrow();
    });

    test("should validate successfully with 3 brushes", () => {
      const validData = createBrushObject(3, "MIXED", "BLUE_SILVER");
      expect(() => brushSchema.parse(validData)).not.toThrow();
    });
  });

  describe("Invalid brush_qty values", () => {
    test("should fail when brush_qty is 1 (only 0, 2, 3 are valid)", () => {
      const invalidData = createBrushObject(1, "THREAD", "BLUE_SILVER");
      expect(() => brushSchema.parse(invalidData)).toThrow(
        "Numero di spazzole deve essere 0, 2 o 3.",
      );
    });

    test("should fail when brush_qty is 4", () => {
      const invalidData = createBrushObject(4, "THREAD", "BLUE_SILVER");
      expect(() => brushSchema.parse(invalidData)).toThrow(
        "Numero di spazzole deve essere 0, 2 o 3.",
      );
    });

    test("should fail when brush_qty is undefined", () => {
      const invalidData = createBrushObject(undefined, undefined, undefined);
      expect(() => brushSchema.parse(invalidData)).toThrow();
    });
  });

  describe("Type and color requirements when brushes are selected", () => {
    test("should fail when brush_qty is 2 but brush_type is missing", () => {
      const invalidData = createBrushObject(2, undefined, "BLUE_SILVER");
      const result = brushSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        const typeError = result.error.issues.find(
          (issue) => issue.path[0] === "brush_type",
        );
        expect(typeError).toBeDefined();
      }
    });

    test("should fail when brush_qty is 2 but brush_color is missing", () => {
      const invalidData = createBrushObject(2, "THREAD", undefined);
      const result = brushSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        const colorError = result.error.issues.find(
          (issue) => issue.path[0] === "brush_color",
        );
        expect(colorError).toBeDefined();
      }
    });

    test("should fail when brush_qty is 3 but both type and color are missing", () => {
      const invalidData = createBrushObject(3, undefined, undefined);
      expect(() => brushSchema.parse(invalidData)).toThrow();
    });
  });

  describe("Transform: brush_qty 0 clears type and color", () => {
    test("should clear brush_type and brush_color when brush_qty is 0", () => {
      const data = createBrushObject(0, "THREAD", "BLUE_SILVER");
      const result = brushSchema.parse(data);
      expect(result.brush_type).toBeUndefined();
      expect(result.brush_color).toBeUndefined();
    });
  });
});
