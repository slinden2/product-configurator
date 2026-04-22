import { z } from "zod";
import { BomTags, OfferSources } from "@/types";

export const offerSnapshotItemSchema = z.object({
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

export type OfferSnapshotItem = z.infer<typeof offerSnapshotItemSchema>;

export const offerSnapshotItemsSchema = z.array(offerSnapshotItemSchema);

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

export const offerSourceSchema = z.enum(OfferSources);
