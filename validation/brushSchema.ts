import { z } from "zod";
import { SelectOption } from "@/types";
import {
  emptyStringOrUndefined,
  generateSelectOptionsFromZodEnum,
  genericRequiredMessage,
} from "@/validation/common";

export const BrushTypeEnum = z.enum(["THREAD", "MIXED", "CARLITE"], {
  message: genericRequiredMessage,
});
export const brushTypes: SelectOption[] = generateSelectOptionsFromZodEnum(
  BrushTypeEnum,
  ["Filo", "Misto", "Carlite"]
);

export const BrushColorEnum = z.enum(
  ["BLUE_SILVER", "GREEN_SILVER", "RED", "GREEN_BLACK"],
  { message: genericRequiredMessage }
);
export const brushColors: SelectOption[] = generateSelectOptionsFromZodEnum(
  BrushColorEnum,
  ["Blu/Argento", "Verde/Argento", "Rosso", "Verde/Nero"]
);

// Number of brushes
export const brushNums: SelectOption[] = [
  {
    value: "0",
    label: "No spazzole",
  },
  {
    value: "2",
    label: "Due spazzole",
  },
  {
    value: "3",
    label: "Tre spazzole",
  },
];

const noBrushSchema = z.object({
  brush_num: z.literal("0"),
  brush_type: emptyStringOrUndefined().transform(() => undefined),
  brush_color: emptyStringOrUndefined().transform(() => undefined),
});

const brushWithColorSchema = z.object({
  brush_type: BrushTypeEnum,
  brush_color: BrushColorEnum,
});

export const brushDiscriminatedUnion = z.discriminatedUnion("brush_num", [
  noBrushSchema,
  z.object({ brush_num: z.literal("2") }).merge(brushWithColorSchema),
  z.object({ brush_num: z.literal("3") }).merge(brushWithColorSchema),
]);
