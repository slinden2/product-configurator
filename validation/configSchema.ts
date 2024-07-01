import { zodEnums } from "@/validation/configuration";
import { brushSchema } from "@/validation/configuration/brushSchema";
import { chemPumpSchema } from "@/validation/configuration/chemPumpSchema";
import { hpPumpSchema } from "@/validation/configuration/hpPumpSchema";
import { touchSchema } from "@/validation/configuration/touchSchema";
import { railSchema } from "@/validation/configuration/railSchema";
import { supplyTypeSchema } from "@/validation/configuration/supplyTypeSchema";
import { washBaySchema } from "@/validation/configuration/washBaySchema";
import { waterSupplySchema } from "@/validation/configuration/waterSupplySchema";
import { waterTankSchema } from "@/validation/configuration/waterTankSchema";
import { z } from "zod";

export const baseSchema = z.object({
  name: z.string().min(3, "Il nome è obbligatorio (min. 3 caratteri)."),
  description: z.string().optional(),
});

export const configSchema = baseSchema
  .and(brushSchema)
  .and(waterSupplySchema)
  .and(chemPumpSchema)
  .and(supplyTypeSchema)
  .and(railSchema)
  .and(hpPumpSchema)
  .and(touchSchema)
  .and(waterTankSchema)
  .and(washBaySchema)
  .superRefine((data, ctx) => {
    // Limit rail length to 25 if cable chain width is set
    if (data.cable_chain_width && data.rail_length < 25) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Con la catena portacavi le rotaie devono essere almeno 25 metri.",
        path: ["rail_length"],
      });
    }

    // Limit rail length to 7 if is_fast is set
    if (data.is_fast && data.rail_length > 7) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Per un portale fast le rotaie devono essere da 7 metri.",
        path: ["rail_length"],
      });
    }
  });
