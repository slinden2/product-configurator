import { SelectOption } from "@/types";
import { mustBeUndefined } from "@/validation/common";
import { z } from "zod";

export const inverterPumpOutletOpts: SelectOption[] = [
  { value: "0", label: "0" },
  { value: "1", label: "1" },
  { value: "2", label: "2" },
];

export const inverterPumpSchema = z.object({
  inv_pump_outlet_dosatron_qty: z
    .string()
    .refine((val) => !isNaN(parseInt(val, 10)), {
      message: "Devi inserire un numero.",
    })
    .or(mustBeUndefined()),
  inv_pump_outlet_pw_qty: z
    .string()
    .refine((val) => !isNaN(parseInt(val, 10)), {
      message: "Devi inserire un numero.",
    })
    .or(mustBeUndefined()),
});
