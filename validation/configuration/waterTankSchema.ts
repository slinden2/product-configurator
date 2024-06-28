import { SelectOption } from "@/types";
import {
  emptyStringOrUndefined,
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

export const waterTankSchema = z.object({
  water_tanks: z.array(
    z
      .object({
        type: WaterTankTypeEnum,
        inlet_w_float_qty: z
          .string()
          .min(1, { message: genericRequiredMessage }),
        inlet_no_float_qty: z
          .string()
          .min(1, { message: genericRequiredMessage }),
        outlet_w_valve_qty: z
          .string()
          .min(1, { message: genericRequiredMessage }),
        outlet_no_valve_qty: z
          .string()
          .min(1, { message: genericRequiredMessage }),
        has_blower: z
          .boolean()
          .or(emptyStringOrUndefined().transform((val) => Boolean(val))),
      })
      .superRefine((data, ctx) => {
        if (
          parseInt(data.outlet_no_valve_qty, 10) +
            parseInt(data.outlet_w_valve_qty, 10) <
          1
        ) {
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
      })
  ),
});
