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
    brush_qty: z.coerce
      .number({ invalid_type_error: genericRequiredMessage })
      .refine((val) => val === 0 || val === 2 || val === 3, {
        message: "Numero di spazzole deve essere 0, 2 o 3.",
      }),
    brush_type: BrushTypeEnum.nullish(),
    brush_color: BrushColorEnum.nullish(),
  })
  .transform((data) => {
    if (data.brush_qty === 0) {
      data.brush_type = null;
      data.brush_color = null;
    }
    return data;
  });
