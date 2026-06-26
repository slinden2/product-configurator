"use server";

import { revalidatePath } from "next/cache";
import { DatabaseError } from "pg";
import {
  getOfferWithRevisionAndLines,
  getUserData,
  QueryError,
  updateRevisionDiscountWithAudit,
  updateRevisionSettingsWithAudit,
} from "@/db/queries";
import { canViewOffer } from "@/lib/access";
import { MSG } from "@/lib/messages";
import {
  type OfferSettings,
  offerDiscountSchema,
  offerSettingsSchema,
} from "@/validation/offer-schema";

/**
 * Shared gate for revision header mutations: offer access (ENGINEER excluded),
 * ownership/scope, and the pre-handoff edit window (revision 1 must be DRAFT — once
 * it advances the commercial terms freeze with the offer).
 */
async function authorizeRevisionAction(offerId: number) {
  const user = await getUserData();
  if (!user)
    return { success: false as const, error: MSG.auth.userNotAuthenticated };

  if (!canViewOffer(user.role)) {
    return { success: false as const, error: MSG.offer.unauthorized };
  }

  const offer = await getOfferWithRevisionAndLines(offerId, user);
  if (!offer) return { success: false as const, error: MSG.offer.notFound };

  const revision = offer.revisions[0];
  if (!revision) return { success: false as const, error: MSG.offer.notFound };
  if (revision.status !== "DRAFT") {
    return { success: false as const, error: MSG.offer.lineCannotEdit };
  }

  return { success: true as const, user, revision };
}

export async function setRevisionDiscountAction(
  offerId: number,
  discount_pct: number,
) {
  const parsed = offerDiscountSchema.safeParse({ discount_pct });
  if (!parsed.success) {
    return { success: false as const, error: MSG.offer.invalidDiscount };
  }

  const auth = await authorizeRevisionAction(offerId);
  if (!auth.success) return auth;
  const { user, revision } = auth;

  try {
    await updateRevisionDiscountWithAudit({
      revisionId: revision.id,
      discount_pct: parsed.data.discount_pct.toFixed(2),
      updated_by: user.id,
    });

    revalidatePath(`/offerte/${offerId}`);
    return { success: true as const };
  } catch (err) {
    if (err instanceof QueryError) {
      return { success: false as const, error: err.message };
    }
    if (err instanceof DatabaseError) {
      return { success: false as const, error: MSG.db.error };
    }
    return { success: false as const, error: MSG.db.unknown };
  }
}

export async function setRevisionSettingsAction(
  offerId: number,
  settings: OfferSettings,
) {
  const parsed = offerSettingsSchema.safeParse(settings);
  if (!parsed.success) {
    return {
      success: false as const,
      error: parsed.error.issues[0]?.message ?? MSG.offer.invalidSettings,
    };
  }

  const auth = await authorizeRevisionAction(offerId);
  if (!auth.success) return auth;
  const { user, revision } = auth;

  try {
    const { transport_amount, ...rest } = parsed.data;
    await updateRevisionSettingsWithAudit({
      revisionId: revision.id,
      settings: { ...rest, transport_amount: transport_amount.toFixed(2) },
      updated_by: user.id,
    });

    revalidatePath(`/offerte/${offerId}`);
    return { success: true as const };
  } catch (err) {
    if (err instanceof QueryError) {
      return { success: false as const, error: err.message };
    }
    if (err instanceof DatabaseError) {
      return { success: false as const, error: MSG.db.error };
    }
    return { success: false as const, error: MSG.db.unknown };
  }
}
