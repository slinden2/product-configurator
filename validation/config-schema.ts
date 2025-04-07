import { zodEnums } from "@/validation/configuration";
import { brushSchema } from "@/validation/configuration/brush-schema";
import { chemPumpSchema } from "@/validation/configuration/chem-pump-schema";
import { hpPumpSchema } from "@/validation/configuration/hp-pump-schema";
import { touchSchema } from "@/validation/configuration/touch-schema";
import { railSchema } from "@/validation/configuration/rail-schema";
import { supplyTypeSchema } from "@/validation/configuration/supply-type-schema";
import { washBaySchema } from "@/validation/configuration/wash-bay-schema";
import { waterSupplySchema } from "@/validation/configuration/water-supply-schema";
import { waterTankSchema } from "@/validation/configuration/water-tank-schema";
import { z } from "zod";
import { createSchemaFactory } from "drizzle-zod";
import { configurations, washBays, waterTanks } from "@/db/schemas";

export const baseSchema = z.object({
  id: z.number().optional(),
  name: z.string().min(3, "Il nome è obbligatorio (min. 3 caratteri)."),
  description: z.string().nullish(),
});

// export const configSchema = baseSchema
//   .and(brushSchema)
//   .and(waterSupplySchema)
//   .and(chemPumpSchema)
//   .and(supplyTypeSchema)
//   .and(railSchema)
//   .and(hpPumpSchema)
//   .and(touchSchema)
//   .and(waterTankSchema)
//   .and(washBaySchema)
//   .superRefine((data, ctx) => {
//     // Limit rail length to 25 if cable chain width is set
//     if (data.energy_chain_width && data.rail_length < 25) {
//       ctx.addIssue({
//         code: z.ZodIssueCode.custom,
//         message:
//           "Con la catena portacavi le rotaie devono essere almeno 25 metri.",
//         path: ["rail_length"],
//       });
//     }

//     // Limit rail length to 7 if is_fast is set
//     if (data.is_fast && data.rail_length > 7) {
//       ctx.addIssue({
//         code: z.ZodIssueCode.custom,
//         message: "Per un portale fast le rotaie devono essere da 7 metri.",
//         path: ["rail_length"],
//       });
//     }
//   });

const { createInsertSchema, createSelectSchema } = createSchemaFactory({
  coerce: {
    number: true,
  },
});

export const insertConfigSchema = createInsertSchema(configurations);
export const selectConfigSchema = createSelectSchema(configurations);

export const selectWaterTankSchema = createSelectSchema(waterTanks);
export const selectWashBaysSchema = createSelectSchema(washBays);

export const configSchema = selectConfigSchema.extend({
  water_tanks: z.array(selectWaterTankSchema),
  wash_bays: z.array(selectWashBaysSchema),
});
