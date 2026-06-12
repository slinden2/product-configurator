import { z } from "zod";
import { InstallationItemKinds } from "@/types";

export const installationItemSettingsSchema = z.object({
  kind: z.enum(InstallationItemKinds),
  price: z.coerce
    .number({ message: "Prezzo non valido." })
    .min(0, { message: "Il prezzo non può essere negativo." })
    .transform((v) => v.toFixed(2)),
});

export type InstallationItemSettingsSchema = z.infer<
  typeof installationItemSettingsSchema
>;
