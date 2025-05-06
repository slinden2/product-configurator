import { SelectOption } from "@/types";
import {
  generateSelectOptionsFromZodEnum,
  genericRequiredMessage,
} from "@/validation/common";
import { z } from "zod";

export const WaterTankTypeEnum = z.enum(
  ["L2000", "L2000_JOLLY", "L2500", "L4500"],
  {
    message: genericRequiredMessage,
  }
);

export const waterTankOpts: SelectOption[] = generateSelectOptionsFromZodEnum(
  WaterTankTypeEnum,
  ["2000L", "2000L Jolly", "2500L", "4500L"]
);

export const waterTankSchema = z
  .object({
    type: WaterTankTypeEnum.optional(),
    inlet_w_float_qty: z
      .number({ message: genericRequiredMessage })
      .min(0)
      .max(2)
      .default(0),
    inlet_no_float_qty: z
      .number({ message: genericRequiredMessage })
      .min(0)
      .max(2)
      .default(0),
    outlet_w_valve_qty: z
      .number({ message: genericRequiredMessage })
      .min(0)
      .max(2)
      .default(0),
    outlet_no_valve_qty: z
      .number({ message: genericRequiredMessage })
      .min(0)
      .max(2)
      .default(0),
    has_blower: z.boolean().default(false),
  })
  .superRefine((data, ctx) => {
    if (data.type === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: genericRequiredMessage,
        path: ["type"],
      });
    }

    if (data.outlet_no_valve_qty + data.outlet_w_valve_qty < 1) {
      Object.keys(data)
        .filter((field) => field.startsWith("outlet"))
        .forEach((outlet) => {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Inserisci almeno una uscita.",
            path: [outlet],
          });
        });
    }
  });

export type WaterTankSchema = z.infer<typeof waterTankSchema>;

export const updateWaterTankSchema = waterTankSchema.and(
  z.object({ id: z.number(), configuration_id: z.number() })
);
export type UpdateWaterTankSchema = z.infer<typeof updateWaterTankSchema>;

export const waterTankDefaults: WaterTankSchema = {
  type: undefined,
  inlet_w_float_qty: 0,
  inlet_no_float_qty: 0,
  outlet_w_valve_qty: 0,
  outlet_no_valve_qty: 0,
  has_blower: false,
};
