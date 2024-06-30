import { SelectOption } from "@/types";
import {
  emptyStringOrUndefined,
  generateSelectOptionsFromZodEnum,
  genericRequiredMessage,
} from "@/validation/common";
import { z } from "zod";

export const PressureWasherTypeEnum = z.enum(
  ["NO_SELECTION", "L21_150BAR", "L21_200BAR"],
  { message: genericRequiredMessage }
);

export const pressureWasherOpts: SelectOption[] =
  generateSelectOptionsFromZodEnum(PressureWasherTypeEnum, [
    "Niente",
    "21 l/min 150 bar",
    "21 l/min 200 bar",
  ]);

export const washBaySchema = z.object({
  wash_bays: z
    .array(
      z.object({
        hp_lance_qty: z.string().min(1, { message: genericRequiredMessage }),
        det_lance_qty: z.string().min(1, { message: genericRequiredMessage }),
        hose_reel_qty: z.string().min(1, { message: genericRequiredMessage }),
        pressure_washer_type: PressureWasherTypeEnum,
        pressure_washer_qty: z
          .string()
          .min(1, { message: genericRequiredMessage })
          .or(emptyStringOrUndefined().transform(() => undefined)),
        has_gantry: z.boolean(),
        is_first_bay: z.boolean(),
        has_bay_dividers: z.boolean(),
      })
    )
    .superRefine((data, ctx) => {
      // Check if is_first_bay true in multiple objects.
      const firstBayCount = data.filter((bay) => bay.is_first_bay).length;
      if (firstBayCount > 1) {
        data.forEach((_, index) => {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Solo una pista può essere la prima.",
            path: [index, "is_first_bay"],
          });
        });
      }
    }),
});
