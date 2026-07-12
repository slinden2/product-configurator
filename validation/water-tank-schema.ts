import { z } from "zod";
import { type SelectOption, WaterTankTypes } from "@/types";
import {
  generateSelectOptionsFromZodEnum,
  genericRequiredMessage,
} from "@/validation/common";

export const WaterTankTypeEnum = z.enum(WaterTankTypes, {
  error: genericRequiredMessage,
});

export const waterTankOpts: SelectOption[] = generateSelectOptionsFromZodEnum(
  WaterTankTypeEnum,
  {
    L2000: "2000L",
    L2000_JOLLY: "2000L Jolly",
    L2500: "2500L",
    L3000: "3000L",
    L4500: "4500L",
    L5000: "5000L",
    L7000: "7000L",
    L9000: "9000L",
  },
);

export const waterTankSchema = z
  .object({
    type: WaterTankTypeEnum.optional(),
    inlet_w_float_qty: z
      .number({ error: genericRequiredMessage })
      .min(0)
      .max(2)
      .default(0),
    inlet_no_float_qty: z
      .number({ error: genericRequiredMessage })
      .min(0)
      .max(1)
      .default(0),
    outlet_w_valve_qty: z
      .number({ error: genericRequiredMessage })
      .min(0)
      .max(3)
      .default(0),
    outlet_no_valve_qty: z
      .number({ error: genericRequiredMessage })
      .min(0)
      .max(2)
      .default(0),
    has_blower: z.boolean().default(false),
    has_electric_float_for_purifier: z.boolean().default(false),
  })
  .superRefine((data, ctx) => {
    if (data.type === undefined) {
      ctx.addIssue({
        code: "custom",
        message: genericRequiredMessage,
        path: ["type"],
      });
    }

    if (data.outlet_no_valve_qty + data.outlet_w_valve_qty < 1) {
      Object.keys(data)
        .filter((field) => field.startsWith("outlet"))
        .forEach((outlet) => {
          ctx.addIssue({
            code: "custom",
            message: "Inserisci almeno una uscita.",
            path: [outlet],
          });
        });
    }
  });

export type WaterTankSchema = z.infer<typeof waterTankSchema>;

export const updateWaterTankSchema = waterTankSchema.and(
  z.object({ id: z.number(), configuration_id: z.number() }),
);
export type UpdateWaterTankSchema = z.infer<typeof updateWaterTankSchema>;

export const waterTankDefaults: WaterTankSchema = {
  type: undefined,
  inlet_w_float_qty: 0,
  inlet_no_float_qty: 0,
  outlet_w_valve_qty: 0,
  outlet_no_valve_qty: 0,
  has_blower: false,
  has_electric_float_for_purifier: false,
};
