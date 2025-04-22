import { z } from "zod";
import { SelectOption } from "@/types";
import {
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
    value: 0,
    label: "No spazzole",
  },
  {
    value: 2,
    label: "Due spazzole",
  },
  {
    value: 3,
    label: "Tre spazzole",
  },
];

export const brushSchema = z
  .object({
    brush_qty: z
      .number({ invalid_type_error: genericRequiredMessage })
      .refine((val) => val === 0 || val === 2 || val === 3, {
        message: "Numero di spazzole deve essere 0, 2 o 3.",
      })
      .optional(),
    brush_type: BrushTypeEnum.optional(),
    brush_color: BrushColorEnum.optional(),
  })
  .transform((data) => {
    if (data.brush_qty === 0 || data.brush_qty === undefined) {
      data.brush_type = undefined;
      data.brush_color = undefined;
    }
    return data;
  })
  .superRefine((data, ctx) => {
    if (data.brush_qty === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: genericRequiredMessage,
        path: ["brush_qty"],
      });
      return;
    }

    if (data.brush_qty && data.brush_qty > 0) {
      if (!data.brush_type) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: genericRequiredMessage,
          path: ["brush_type"],
        });
      }

      if (!data.brush_color) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: genericRequiredMessage,
          path: ["brush_color"],
        });
      }
    }
  });
