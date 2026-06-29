import { z } from "zod";
import { OfferStatus, TransportModes } from "@/types";
import {
  offerDiscountSchema,
  offerInstallationItemsSchema,
} from "@/validation/offer-schema";

/**
 * Offer revision — carries the offer lifecycle (`status`) and the deal's commercial header:
 * one deal-level discount %, transport, installation, validity and notes. Per-line pricing is
 * derived from these and stored on {@link offerRevisionLineSchema}. Each revision is approved
 * and sent independently of the others.
 */
export const offerRevisionSchema = z.object({
  revision_no: z.number().int().positive(),
  status: z.enum(OfferStatus),
  // Reuse the 0–40% / 0.5%-step rule that governs the legacy offer discount.
  discount_pct: offerDiscountSchema.shape.discount_pct,
  transport_amount: z
    .number()
    .min(0, "L'importo del trasporto non può essere negativo."),
  transport_mode: z.enum(TransportModes),
  installation_mode: z.enum(TransportModes),
  installation_items: offerInstallationItemsSchema.refine(
    (items) => new Set(items.map((i) => i.kind)).size === items.length,
    { message: "Voci di installazione duplicate." },
  ),
  show_net_total_only: z.boolean(),
  valid_until: z.date().nullable(),
  notes: z.string().nullable(),
});

export type OfferRevisionSchema = z.infer<typeof offerRevisionSchema>;
