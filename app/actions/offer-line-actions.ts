"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import {
  addOfferLine,
  getOfferWorkingRevision,
  getUserData,
  removeOfferLine,
} from "@/db/queries";
import { canViewOffer } from "@/lib/access";
import { MSG } from "@/lib/messages";
import { repriceOfferLine } from "@/lib/offer-revision-pricing";
import { configSchema } from "@/validation/config-schema";
import { firstZodIssueMessage } from "./lib/first-zod-issue-message";
import { mapActionError } from "./lib/map-action-error";

/**
 * Adds a new machine configuration line to an offer's revision 1. The config is
 * created with origin=OFFER (owned by the offer owner) and a line row at the next
 * position with placeholder pricing. Returns the new configuration id so the UI
 * can land on its edit page (where tanks/bays become editable).
 */
export const addOfferLineAction = async (
  offerId: number,
  formData: unknown,
) => {
  const validation = configSchema.safeParse(formData);

  if (!validation.success) {
    return {
      success: false as const,
      error: firstZodIssueMessage(validation.error, MSG.db.unknown),
    };
  }

  const user = await getUserData();

  if (!user) {
    return { success: false as const, error: MSG.auth.userNotAuthenticated };
  }

  if (!canViewOffer(user.role)) {
    return { success: false as const, error: MSG.offer.unauthorized };
  }

  // Existence + scope (returns null when out of the user's offer scope). The
  // revision-DRAFT gate lives in addOfferLine, so the working revision's status is not
  // needed here — only that the offer is reachable.
  const working = await getOfferWorkingRevision(offerId, user);
  if (!working) {
    return { success: false as const, error: MSG.offer.notFound };
  }

  try {
    // The revision-DRAFT gate lives in addOfferLine (throws QueryError otherwise).
    // Price the new line from its live BOM in the same transaction; the
    // OFFER_LINE_ADD log already records the creation, so skip the reprice audit.
    const id = await db.transaction(async (tx) => {
      const { id: configId } = await addOfferLine(
        offerId,
        validation.data,
        user.id,
        tx,
      );
      await repriceOfferLine(configId, user.id, tx, { audit: false });
      return configId;
    });
    revalidatePath(`/offerte/${offerId}`);
    return { success: true as const, id };
  } catch (err) {
    return mapActionError(err, "Failed to add offer line:");
  }
};

/**
 * Removes a configuration line from an offer's working revision, deleting the line
 * row and its configuration. Gated on the revision being DRAFT.
 */
export const removeOfferLineAction = async (
  offerId: number,
  configId: number,
) => {
  const user = await getUserData();

  if (!user) {
    return { success: false as const, error: MSG.auth.userNotAuthenticated };
  }

  if (!canViewOffer(user.role)) {
    return { success: false as const, error: MSG.offer.unauthorized };
  }

  const working = await getOfferWorkingRevision(offerId, user);
  if (!working) {
    return { success: false as const, error: MSG.offer.notFound };
  }

  try {
    await removeOfferLine(offerId, configId, user.id);
    revalidatePath(`/offerte/${offerId}`);
    return { success: true as const };
  } catch (err) {
    return mapActionError(err, "Failed to remove offer line:");
  }
};
