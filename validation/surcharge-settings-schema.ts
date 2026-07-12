import { z } from "zod";
import { SurchargeKinds } from "@/types";

export const surchargeSettingsSchema = z.object({
  kind: z.enum(SurchargeKinds),
  price: z.coerce
    .number({ error: "Prezzo non valido." })
    .positive({ error: "Il prezzo deve essere maggiore di zero." })
    .transform((v) => v.toFixed(2)),
});

export type SurchargeSettingsSchema = z.infer<typeof surchargeSettingsSchema>;
