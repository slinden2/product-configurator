import { SelectOption } from "@/types";
import {
  generateSelectOptionsFromZodEnum,
  genericRequiredMessage,
  mustBeZero,
} from "@/validation/common";
import { z } from "zod";

export const PressureWasherTypeEnum = z.enum(["L21_150BAR", "L21_200BAR"], {
  message: genericRequiredMessage,
});

export const pressureWasherOpts: SelectOption[] =
  generateSelectOptionsFromZodEnum(PressureWasherTypeEnum, [
    "21 l/min 150 bar",
    "21 l/min 200 bar",
  ]);

const lanceErrMsg = "La quantità di lance deve essere 0 o 2.";

export const washBaySchema = z.object({
  wash_bays: z
    .array(
      z.object({
        id: z.number().optional(),
        hp_lance_qty: z.coerce
          .number({ message: genericRequiredMessage })
          .refine((val) => val === 0 || val === 2, {
            message: lanceErrMsg,
          }),
        det_lance_qty: z.coerce
          .number({ message: genericRequiredMessage })
          .refine((val) => val === 0 || val === 2, {
            message: lanceErrMsg,
          }),
        hose_reel_qty: z.coerce
          .number({ message: genericRequiredMessage })
          .min(0)
          .max(2),
        pressure_washer_type: PressureWasherTypeEnum.nullable(),
        pressure_washer_qty: z.coerce
          .number({ message: genericRequiredMessage })
          .min(0)
          .max(2)
          .or(mustBeZero()),
        has_gantry: z.boolean().default(false),
        is_first_bay: z.boolean().default(false),
        has_bay_dividers: z.boolean().default(false),
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
