import { emptyStringOrUndefined } from "@/validation/common";
import { z } from "zod";

export const inverterPumpSchema = z.object({
  has_inv_pump_outlet_gantry: z
    .boolean()
    .default(false)
    .or(emptyStringOrUndefined().transform((val) => Boolean(val))),
  has_inv_pump_outlet_dosatron1: z
    .boolean()
    .default(false)
    .or(emptyStringOrUndefined().transform((val) => Boolean(val))),
  has_inv_pump_outlet_dosatron2: z
    .boolean()
    .default(false)
    .or(emptyStringOrUndefined().transform((val) => Boolean(val))),
  has_inv_pump_outlet_pw1: z
    .boolean()
    .default(false)
    .or(emptyStringOrUndefined().transform((val) => Boolean(val))),
  has_inv_pump_outlet_pw2: z
    .boolean()
    .default(false)
    .or(emptyStringOrUndefined().transform((val) => Boolean(val))),
});
