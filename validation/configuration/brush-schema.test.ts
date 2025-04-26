import { BrushColorType, BrushType } from "@/types";
import { brushSchema } from "@/validation/configuration/brush-schema";
import { describe, test, expect } from "vitest";

function createBrushObject(
  brushQty: number | undefined,
  brushType: BrushType | undefined,
  brushColor: BrushColorType | undefined
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
  });
});
