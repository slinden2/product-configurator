import { z } from "zod";

/**
 * Offer header — the stable spine of a commercial deal. Lifecycle, pricing and commercial
 * terms live on its revisions (see {@link offerRevisionSchema}), never here. Customer info is
 * kept as pragmatic v1 plain fields (no separate customers table).
 */
export const offerSchema = z.object({
  offer_number: z.string().min(1, "Il numero offerta è obbligatorio."),
  customer_name: z
    .string()
    .min(2, "Il nome cliente è obbligatorio (min. 2 caratteri)."),
  customer_address: z.string().optional(),
  customer_email: z.email("Email non valida.").optional(),
});

export type OfferSchema = z.infer<typeof offerSchema>;

/** Create shape — same as the base offer; owner is supplied server-side. */
export const createOfferSchema = offerSchema;
export type CreateOfferSchema = z.infer<typeof createOfferSchema>;

/** Update shape — mirrors `updateConfigSchema` by carrying the owner `user_id`. */
export const updateOfferSchema = offerSchema.and(
  z.object({ user_id: z.string() }),
);
export type UpdateOfferSchema = z.infer<typeof updateOfferSchema>;
