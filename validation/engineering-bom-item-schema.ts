import { BomTags } from "@/types";
import { z } from "zod";

export const engineeringBomItemSchema = z.object({
  pn: z.string().min(1, "Codice articolo obbligatorio.").max(25),
  qty: z.number().int().min(1, "Quantità minima: 1."),
  description: z.string().max(255).default(""),
  category: z.enum(["GENERAL", "WATER_TANK", "WASH_BAY"]),
  category_index: z.number().int().min(0),
  is_custom: z.boolean().optional().default(false),
  tag: z.enum(BomTags).nullable().optional(),
});

export type EngineeringBomItemFormData = z.infer<
  typeof engineeringBomItemSchema
>;
