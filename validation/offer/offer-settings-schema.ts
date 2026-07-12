import { z } from "zod";
import { InstallationItemKinds, TransportModes } from "@/types";

export const offerDiscountSchema = z.object({
  discount_pct: z
    .number()
    .min(0, "Lo sconto non può essere negativo.")
    .max(40, "Lo sconto massimo consentito è 40%.")
    .refine((v) => Number.isInteger(v * 2), {
      message: "Lo sconto deve essere un multiplo di 0,5%.",
    }),
});

export type OfferDiscount = z.infer<typeof offerDiscountSchema>;

/**
 * Input for the margin absorb sign-off (#84). The absorbed margin itself is
 * never client-supplied — the server recomputes the live margin at sign-off.
 */
export const marginAbsorbSchema = z.object({
  note: z
    .string()
    .trim()
    .max(500, "La nota non può superare 500 caratteri.")
    .optional(),
});

export type MarginAbsorbInput = z.infer<typeof marginAbsorbSchema>;

export const offerInstallationItemSchema = z.object({
  kind: z.enum(InstallationItemKinds),
  amount: z.number().min(0, "L'importo non può essere negativo."),
  included: z.boolean(),
});
export type OfferInstallationItem = z.infer<typeof offerInstallationItemSchema>;

export const offerInstallationItemsSchema = z.array(
  offerInstallationItemSchema,
);

export const offerSettingsSchema = z.object({
  show_net_total_only: z.boolean(),
  transport_amount: z
    .number()
    .min(0, "L'importo del trasporto non può essere negativo."),
  transport_mode: z.enum(TransportModes),
  installation_mode: z.enum(TransportModes),
  installation_items: offerInstallationItemsSchema.refine(
    (items) => new Set(items.map((i) => i.kind)).size === items.length,
    { message: "Voci di installazione duplicate." },
  ),
});
export type OfferSettings = z.infer<typeof offerSettingsSchema>;
