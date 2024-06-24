import { zodEnums } from "@/validation/configuration";
import { brushSchema } from "@/validation/configuration/brushSchema";
import { chemPumpSchema } from "@/validation/configuration/chemPumpSchema";
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
  .and(panelSchema)
  .and(railSchema)
  .superRefine((data, ctx) => {
    if (
      data.chemical_num &&
      data.chemical_num === "2" &&
      data.chemical_pump_pos === zodEnums.ChemicalPumpPosEnum.enum.ABOARD &&
      data.has_acid_pump &&
      data.acid_pump_pos === zodEnums.ChemicalPumpPosEnum.enum.ABOARD
    ) {
      const fieldNames: Array<keyof typeof data> = [
        "chemical_pump_pos",
        "acid_pump_pos",
      ];
      fieldNames.forEach((field) => {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "A bordo impianto si possono montare solo due pompe di prelavaggio.",
          path: [field],
        });
      });
    }
  });
