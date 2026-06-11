import { z } from "zod";

export const miscSchema = z.object({
  has_chassis_wash_detergent_pump: z.boolean().default(false),
  has_chassis_wash_detergent_manual_antifreeze: z.boolean().default(false),
});
