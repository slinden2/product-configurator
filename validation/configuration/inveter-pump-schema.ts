import { SelectOption } from "@/types";
import { z } from "zod";

export const inverterPumpOutletOpts: SelectOption[] = [
  { value: "0", label: "0" },
  { value: "1", label: "1" },
  { value: "2", label: "2" },
];

export const inverterPumpSchema = z.object({
  inv_pump_outlet_dosatron_qty: z.coerce.number().min(0).max(2).default(0),
  inv_pump_outlet_pw_qty: z.coerce.number().min(0).max(2).default(0),
});
