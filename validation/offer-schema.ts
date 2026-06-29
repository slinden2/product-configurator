import { z } from "zod";
import {
  BomTags,
  InstallationItemKinds,
  SurchargeKinds,
  TransportModes,
} from "@/types";

export const offerBomLineItemSchema = z.object({
  pn: z.string(),
  description: z.string(),
  qty: z.number(),
  coefficient: z.number(),
  list_price: z.number(),
  line_total: z.number(),
  tag: z.enum(BomTags).nullable(),
  category: z.enum(["GENERAL", "WATER_TANK", "WASH_BAY"]),
  category_index: z.number(),
});

export type OfferBomLineItem = z.infer<typeof offerBomLineItemSchema>;

export const offerSurchargeItemSchema = z.object({
  surcharge_kind: z.enum(SurchargeKinds),
  description: z.string(),
  qty: z.literal(1),
  amount: z.number().positive(),
  line_total: z.number(),
});
export type OfferSurchargeItem = z.infer<typeof offerSurchargeItemSchema>;

export const offerLineItemSchema = z.union([
  offerSurchargeItemSchema,
  offerBomLineItemSchema,
]);
export type OfferLineItem = z.infer<typeof offerLineItemSchema>;

export const offerLineItemsSchema = z.array(offerLineItemSchema);

export function isSurchargeItem(
  item: OfferLineItem,
): item is OfferSurchargeItem {
  return "surcharge_kind" in item;
}

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
