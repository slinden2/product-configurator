import { SelectOption } from "@/types";
import {
  generateSelectOptionsFromZodEnum,
  genericRequiredMessage,
  mustBeFalse,
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
    id: z.number().optional(),
    type: WaterTankTypeEnum,
    inlet_w_float_qty: z.coerce
      .number({ message: genericRequiredMessage })
      .min(0)
      .max(2),
    inlet_no_float_qty: z.coerce
      .number({ message: genericRequiredMessage })
      .min(0)
      .max(2),
    outlet_w_valve_qty: z.coerce
      .number({ message: genericRequiredMessage })
      .min(0)
      .max(2),
    outlet_no_valve_qty: z.coerce
      .number({ message: genericRequiredMessage })
      .min(0)
      .max(2),
    has_blower: z.boolean().default(false).or(mustBeFalse()),
  })
  .superRefine((data, ctx) => {
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
  z.object({ configuration_id: z.number() })
);
export type UpdateWaterTankSchema = z.infer<typeof updateWaterTankSchema>;
