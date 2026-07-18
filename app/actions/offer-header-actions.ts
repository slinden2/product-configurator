"use server";

import { revalidatePath } from "next/cache";
import { authorizeOfferLifecycleAction } from "@/app/actions/lib/authorize";
import { firstZodIssueMessage } from "@/app/actions/lib/first-zod-issue-message";
import { mapActionError } from "@/app/actions/lib/map-action-error";
import { updateOfferHeaderWithAudit } from "@/db/queries";
import { MSG } from "@/lib/messages";
import { offerHeaderInputSchema } from "@/validation/offer/offer-schema";

/**
 * Corrects the offer header's customer fields (name / address / email).
 *
 * Gated on offer access + scope only (`authorizeOfferLifecycleAction`), never on the
 * working revision's status: the header is the offer's stable spine, so a typo stays
 * fixable after the revision is sent or accepted. Note the trade-off this accepts —
 * exports read the live header (`lib/offer-export.ts`), so re-exporting an already-sent
 * revision after an edit produces a document that differs from the one the customer got.
 * The dialog warns about this once the revision leaves DRAFT.
 */
export async function updateOfferHeaderAction(
  offerId: number,
  formData: unknown,
) {
  const parsed = offerHeaderInputSchema.safeParse(formData);
  if (!parsed.success) {
    return {
      success: false as const,
      error: firstZodIssueMessage(parsed.error, MSG.db.unknown),
    };
  }

  const auth = await authorizeOfferLifecycleAction(offerId);
  if (!auth.success) return auth;
  const { user } = auth;

  try {
    const { configIds } = await updateOfferHeaderWithAudit({
      offerId,
      header: parsed.data,
      updated_by: user.id,
    });

    revalidatePath(`/offerte/${offerId}`);
    revalidatePath("/offerte");
    // "/" renders the offer queue cards and the margin-decisions card.
    revalidatePath("/");

    // A customer rename re-syncs the configs' name shadow, which is what the technical
    // queue and every config detail surface display. Empty unless the name changed.
    if (configIds.length > 0) {
      revalidatePath("/configurazioni");
      for (const configId of configIds) {
        revalidatePath(`/configurazioni/modifica/${configId}`);
        revalidatePath(`/configurazioni/visualizza/${configId}`);
        revalidatePath(`/configurazioni/bom/${configId}`);
        revalidatePath(`/configurazioni/marginalita/${configId}`);
      }
    }

    return { success: true as const };
  } catch (err) {
    return mapActionError(err, "Failed to update offer header:");
  }
}
