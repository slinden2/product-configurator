import { SelectOption } from "@/types";
import {
  generateSelectOptionsFromZodEnum,
  genericRequiredMessage,
  mustBeZero,
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
        hp_lance_qty: z.coerce
          .number({ message: genericRequiredMessage })
          .min(1)
          .max(2),
        det_lance_qty: z.coerce
          .number({ message: genericRequiredMessage })
          .min(1)
          .max(2),
        hose_reel_qty: z.coerce
          .number({ message: genericRequiredMessage })
          .min(1)
          .max(2),
        pressure_washer_type: PressureWasherTypeEnum.transform((val) =>
          val === PressureWasherTypeEnum.enum.NO_SELECTION ? undefined : val
        ),
        pressure_washer_qty: z.coerce
          .number({ message: genericRequiredMessage })
          .min(1)
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
