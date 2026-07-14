import { z } from "zod";

/**
 * Offer header — the stable spine of a commercial deal. Lifecycle, pricing and commercial
 * terms live on its revisions (see `db/schemas/` and `.claude/rules/workflow.md`), never here.
 * Customer info is kept as pragmatic v1 plain fields (no separate customers table).
 */
export const offerSchema = z.object({
  offer_number: z.string().min(1, "Il numero offerta è obbligatorio."),
  // The 3-char minimum is not cosmetic: `customer_name` is copied into
  // `configurations.name` for every OFFER config (the shadow), and `configSchema`
  // requires min 3 there. A shorter name would make those configs fail validation
  // on a field their form hides — a dead save button with no visible error.
  // Max lengths mirror the varchar caps in `db/schemas/offers.ts`, so an
  // over-long value fails as a field message instead of a raw pg 22001.
  customer_name: z
    .string()
    .min(3, "Il nome cliente è obbligatorio (min. 3 caratteri).")
    .max(255, "Il nome cliente è troppo lungo (max. 255 caratteri)."),
  customer_address: z
    .string()
    .max(500, "L'indirizzo è troppo lungo (max. 500 caratteri).")
    .optional(),
  customer_email: z
    .email("Email non valida.")
    .max(255, "L'email è troppo lunga (max. 255 caratteri).")
    .optional(),
});

export type OfferSchema = z.infer<typeof offerSchema>;

/**
 * Customer header fields as the forms submit them — shared by the create form
 * (`app/offerte/nuova/offer-form.tsx`) and the header edit dialog
 * (`app/offerte/[id]/edit-offer-header-button.tsx`). The offer number is generated
 * server-side (OFF-{year}-{NNNN}), so no form supplies it. Optional fields accept
 * the form's empty strings (blank email/address); the server coerces those to null
 * on insert and on update.
 */
export const offerHeaderInputSchema = z.object({
  customer_name: offerSchema.shape.customer_name,
  customer_address: offerSchema.shape.customer_address,
  customer_email: z
    .union([
      z.literal(""),
      z
        .email("Email non valida.")
        .max(255, "L'email è troppo lunga (max. 255 caratteri)."),
    ])
    .optional(),
});
export type OfferHeaderInput = z.infer<typeof offerHeaderInputSchema>;
