import { SelectOption } from "@/types";
import {
  generateSelectOptionsFromZodEnum,
  genericRequiredMessage,
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

export const washBaySchema = z
  .object({
    hp_lance_qty: z
      .number({ message: genericRequiredMessage })
      .refine((val) => val === 0 || val === 2, {
        message: lanceErrMsg,
      })
      .optional(),
    det_lance_qty: z
      .number({ message: genericRequiredMessage })
      .refine((val) => val === 0 || val === 2, {
        message: lanceErrMsg,
      })
      .optional(),
    hose_reel_qty: z
      .number({ message: genericRequiredMessage })
      .min(0)
      .max(2)
      .optional(),
    pressure_washer_type: PressureWasherTypeEnum.optional(),
    pressure_washer_qty: z
      .number({ message: genericRequiredMessage })
      .min(0)
      .max(2)
      .optional(),
    has_gantry: z.boolean().default(false),
    is_first_bay: z.boolean().default(false),
    has_bay_dividers: z.boolean().default(false),
  })
  .superRefine((data, ctx) => {
    if (data.hp_lance_qty === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: genericRequiredMessage,
        path: ["hp_lance_qty"],
      });
    }

    if (data.det_lance_qty === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: genericRequiredMessage,
        path: ["det_lance_qty"],
      });
    }

    if (data.hose_reel_qty === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: genericRequiredMessage,
        path: ["hose_reel_qty"],
      });
    }

    if (
      data.pressure_washer_type !== undefined &&
      data.pressure_washer_qty === 0
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: genericRequiredMessage,
        path: ["pressure_washer_qty"],
      });
    }
  });

export type WashBaySchema = z.infer<typeof washBaySchema>;

export const updateWashBaySchema = washBaySchema.and(
  z.object({ id: z.number(), configuration_id: z.number() })
);
export type UpdateWashBaySchema = z.infer<typeof updateWashBaySchema>;

export const washBayDefaults: WashBaySchema = {
  hp_lance_qty: undefined,
  det_lance_qty: undefined,
  hose_reel_qty: undefined,
  pressure_washer_type: undefined,
  pressure_washer_qty: undefined,
  has_gantry: false,
  is_first_bay: false,
  has_bay_dividers: false,
};
