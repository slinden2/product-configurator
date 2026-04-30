import { z } from "zod";
import { SurchargeKinds } from "@/types";

export const surchargeSettingsSchema = z.object({
  kind: z.enum(SurchargeKinds),
  price: z.coerce
    .number({ message: "Prezzo non valido." })
    .positive({ message: "Il prezzo deve essere maggiore di zero." })
    .transform((v) => v.toFixed(2)),
});

export type SurchargeSettingsSchema = z.infer<typeof surchargeSettingsSchema>;
