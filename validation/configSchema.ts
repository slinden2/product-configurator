import { zodEnums } from "@/validation/configuration";
import { brushSchema } from "@/validation/configuration/brushSchema";
import { chemPumpSchema } from "@/validation/configuration/chemPumpSchema";
import { hpPumpSchema } from "@/validation/configuration/hpPumpSchema";
import { panelSchema } from "@/validation/configuration/panelSchema";
import { railSchema } from "@/validation/configuration/railSchema";
import { supplyTypeSchema } from "@/validation/configuration/supplyTypeSchema";
import { waterSupplySchema } from "@/validation/configuration/waterSupplySchema";
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
  .and(panelSchema);
