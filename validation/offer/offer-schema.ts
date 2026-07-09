import { z } from "zod";

/**
 * Offer header — the stable spine of a commercial deal. Lifecycle, pricing and commercial
 * terms live on its revisions (see `db/schemas/` and `.claude/rules/workflow.md`), never here.
 * Customer info is kept as pragmatic v1 plain fields (no separate customers table).
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

/**
 * Create-form input — customer header fields only. The offer number is generated
 * server-side (OFF-{year}-{NNNN}), so the form never supplies it. Optional fields
 * accept the form's empty strings (blank email/address); the server coerces those
 * to null on insert.
 */
export const offerHeaderInputSchema = z.object({
  customer_name: offerSchema.shape.customer_name,
  customer_address: z.string().optional(),
  customer_email: z
    .union([z.literal(""), z.email("Email non valida.")])
    .optional(),
});
export type OfferHeaderInput = z.infer<typeof offerHeaderInputSchema>;
