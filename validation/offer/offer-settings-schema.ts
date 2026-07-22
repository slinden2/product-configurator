import { z } from "zod";
import {
  InstallationItemKinds,
  TransportModes,
  WarrantyMonthsOptions,
} from "@/types";

export const offerDiscountSchema = z.object({
  discount_pct: z
    .number()
    .min(0, "Lo sconto non può essere negativo.")
    .max(40, "Lo sconto massimo consentito è 40%.")
    .refine((v) => Number.isInteger(v * 2), {
      error: "Lo sconto deve essere un multiplo di 0,5%.",
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
    { error: "Voci di installazione duplicate." },
  ),
  // Supply conditions (#274). Empty text fields mean "not set" — the display
  // layer resolves the fallbacks ("Da definire" / customer address).
  delivery_date: z.date({ error: "Data di consegna non valida." }).nullable(),
  delivery_destination: z
    .string()
    .trim()
    .max(500, "La destinazione non può superare 500 caratteri."),
  payment_terms: z
    .string()
    .trim()
    .max(500, "Le modalità di pagamento non possono superare 500 caratteri."),
  warranty_months: z.literal(WarrantyMonthsOptions, {
    error: "La garanzia deve essere di 12 o 24 mesi.",
  }),
});
export type OfferSettings = z.infer<typeof offerSettingsSchema>;
