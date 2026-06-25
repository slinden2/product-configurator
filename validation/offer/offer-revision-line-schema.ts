import { z } from "zod";

/**
 * Offer revision line — one configuration's commercial position within a revision. Commercial
 * pricing lives here, never on `configurations`. `net_price` is derived by allocating the
 * revision's header discount; `line_discount_percent` is a nullable future hook for per-line
 * overrides. `pricing_snapshot` captures the as-sent quote figures when the revision is sent.
 */
export const offerRevisionLineSchema = z.object({
  configuration_id: z.number().int().positive(),
  position: z.number().int().nonnegative(),
  quantity: z.number().int().positive(),
  list_price: z
    .number()
    .min(0, "Il prezzo di listino non può essere negativo."),
  net_price: z.number().min(0, "Il prezzo netto non può essere negativo."),
  line_discount_percent: z.number().min(0).max(100).nullable(),
  pricing_snapshot: z.unknown().nullable(),
});

export type OfferRevisionLineSchema = z.infer<typeof offerRevisionLineSchema>;
