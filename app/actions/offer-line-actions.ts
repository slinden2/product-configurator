"use server";

import { revalidatePath } from "next/cache";
import { DatabaseError } from "pg";
import {
  addOfferLine,
  getOfferWithRevisionAndLines,
  getUserData,
  QueryError,
  removeOfferLine,
} from "@/db/queries";
import { canViewOffer } from "@/lib/access";
import { MSG } from "@/lib/messages";
import { configSchema } from "@/validation/config-schema";

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
    return { success: false as const, error: validation.error.message };
  }

  const user = await getUserData();

  if (!user) {
    return { success: false as const, error: MSG.auth.userNotAuthenticated };
  }

  if (!canViewOffer(user.role)) {
    return { success: false as const, error: MSG.offer.unauthorized };
  }

  // Existence + scope (returns null when out of the user's offer scope).
  const offer = await getOfferWithRevisionAndLines(offerId, user);
  if (!offer) {
    return { success: false as const, error: MSG.offer.notFound };
  }

  try {
    // The revision-DRAFT gate lives in addOfferLine (throws QueryError otherwise).
    const { id } = await addOfferLine(offerId, validation.data, user.id);
    revalidatePath(`/offerte/${offerId}`);
    return { success: true as const, id };
  } catch (err) {
    console.error("Failed to add offer line:", err);
    if (err instanceof QueryError) {
      return { success: false as const, error: err.message };
    }
    if (err instanceof DatabaseError) {
      return { success: false as const, error: MSG.db.error };
    }
    return { success: false as const, error: MSG.db.unknown };
  }
};

/**
 * Removes a configuration line from an offer's revision 1 by deleting its
 * configuration (the line cascades). Gated on the revision being DRAFT.
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

  const offer = await getOfferWithRevisionAndLines(offerId, user);
  if (!offer) {
    return { success: false as const, error: MSG.offer.notFound };
  }

  try {
    await removeOfferLine(offerId, configId, user.id);
    revalidatePath(`/offerte/${offerId}`);
    return { success: true as const };
  } catch (err) {
    console.error("Failed to remove offer line:", err);
    if (err instanceof QueryError) {
      return { success: false as const, error: err.message };
    }
    if (err instanceof DatabaseError) {
      return { success: false as const, error: MSG.db.error };
    }
    return { success: false as const, error: MSG.db.unknown };
  }
};
