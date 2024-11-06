import { brushSchema } from "@/validation/configuration/brushSchema";
import { $Enums } from "@prisma/client";
import { describe, test, expect } from "vitest";

function createBrushObject(
  brushQty: number | string | null | undefined,
  brushType: $Enums.BrushType | null | undefined,
  brushColor: $Enums.BrushColor | null | undefined
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
      const validData = createBrushObject(
        "2",
        $Enums.BrushType.THREAD,
        $Enums.BrushColor.GREEN_SILVER
      );
      expect(() => brushSchema.parse(validData)).not.toThrow();
    });

    test("should validate successfully with all fields correctly set with 0 brushes", () => {
      const validData = createBrushObject("0", undefined, undefined);
      expect(() => brushSchema.parse(validData)).not.toThrow();
    });

    test("should throw if brush_qty is 0 and brush_type or brush_color is set", () => {
      const invalidData = createBrushObject(
        "0",
        $Enums.BrushType.THREAD,
        undefined
      );
      expect(() => brushSchema.parse(invalidData)).toThrow();

      const invalidData2 = createBrushObject(
        "0",
        undefined,
        $Enums.BrushColor.GREEN_SILVER
      );
      expect(() => brushSchema.parse(invalidData2)).toThrow();
    });
  });
});
