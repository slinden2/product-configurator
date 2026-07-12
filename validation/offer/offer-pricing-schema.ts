import { z } from "zod";
import { BomLineCategories, BomTags, SurchargeKinds } from "@/types";

export const offerBomLineItemSchema = z.object({
  pn: z.string(),
  description: z.string(),
  qty: z.number(),
  coefficient: z.number(),
  list_price: z.number(),
  line_total: z.number(),
  tag: z.enum(BomTags).nullable(),
  category: z.enum(BomLineCategories),
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
