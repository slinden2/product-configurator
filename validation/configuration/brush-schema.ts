import { z } from "zod";
import { SelectOption } from "@/types";
import {
  mustBeUndefined,
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

export const brushSchema = z
  .object({
    brush_qty: z.coerce.number({ invalid_type_error: genericRequiredMessage }),
  })
  .passthrough()
  .pipe(
    z.discriminatedUnion("brush_qty", [
      z.object({
        brush_qty: z.literal(0),
        brush_type: mustBeUndefined(),
        brush_color: mustBeUndefined(),
      }),
      z.object({
        brush_qty: z.literal(2),
        brush_type: BrushTypeEnum,
        brush_color: BrushColorEnum,
      }),
      z.object({
        brush_qty: z.literal(3),
        brush_type: BrushTypeEnum,
        brush_color: BrushColorEnum,
      }),
    ])
  );
