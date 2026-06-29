"use server";

import { revalidatePath } from "next/cache";
import { DatabaseError } from "pg";
import {
  getUserData,
  insertOffer,
  logActivity,
  QueryError,
} from "@/db/queries";
import { canViewOffer } from "@/lib/access";
import { MSG } from "@/lib/messages";
import { offerHeaderInputSchema } from "@/validation/offer/offer-schema";

export const insertOfferAction = async (formData: unknown) => {
  const validation = offerHeaderInputSchema.safeParse(formData);

  if (!validation.success) {
    return { success: false as const, error: validation.error.message };
  }

  const user = await getUserData();

  if (!user) {
    return { success: false as const, error: MSG.auth.userNotAuthenticated };
  }

  // Offers are a sales-and-admin workspace; ENGINEER has no offer access.
  if (!canViewOffer(user.role)) {
    return { success: false as const, error: MSG.offer.unauthorized };
  }

  try {
    const offer = await insertOffer(validation.data, user.id);
    await logActivity({
      userId: user.id,
      action: "OFFER_CREATE",
      targetEntity: "offer",
      targetId: offer.id.toString(),
    });
    revalidatePath("/offerte");
    return { success: true as const, id: offer.id };
  } catch (err) {
    console.error("Failed to create offer:", err);
    if (err instanceof QueryError) {
      return { success: false as const, error: err.message };
    }
    if (err instanceof DatabaseError) {
      // Concurrent create collided on the generated offer_number — ask to retry.
      if (err.code === "23505") {
        return { success: false as const, error: MSG.offer.numberRetry };
      }
      return { success: false as const, error: MSG.db.error };
    }
    return { success: false as const, error: MSG.db.unknown };
  }
};
