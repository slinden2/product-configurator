"use server";

import { revalidatePath } from "next/cache";
import { DatabaseError } from "pg";
import { isEditable } from "@/app/actions/lib/auth-checks";
import {
  getConfigurationWithTanksAndBays,
  getEngineeringBomItems,
  getOfferSnapshotByConfigurationId,
  getSurchargeSettings,
  getUserData,
  logActivity,
  QueryError,
  updateOfferDiscount,
  upsertOfferSnapshot,
} from "@/db/queries";
import { BOM_RULES_VERSION } from "@/lib/BOM/max-bom";
import { MSG } from "@/lib/messages";
import {
  appendSurchargesToOfferItems,
  buildOfferItemsFromEbom,
  buildOfferItemsFromLive,
  computeOfferTotals,
  sumSurchargeTotal,
} from "@/lib/offer";
import { resolveOfferSurcharges } from "@/lib/offer-surcharges";
import { STANDARD_MACHINE_HEIGHT_MM } from "@/types";
import { offerDiscountSchema } from "@/validation/offer-schema";

function revalidateOfferPaths(confId: number) {
  revalidatePath(`/configurazioni/offerta/${confId}`);
  revalidatePath(`/configurazioni`);
}

async function authorizeOfferAction(confId: number) {
  const user = await getUserData();
  if (!user)
    return { success: false as const, error: MSG.auth.userNotAuthenticated };

  if (user.role !== "SALES" && user.role !== "ADMIN") {
    return { success: false as const, error: MSG.offer.unauthorized };
  }

  const configuration = await getConfigurationWithTanksAndBays(confId, user);
  if (!configuration)
    return { success: false as const, error: MSG.config.notFound };

  if (user.role === "SALES" && user.id !== configuration.user_id) {
    return { success: false as const, error: MSG.auth.unauthorized };
  }

  if (!isEditable(configuration.status, user.role)) {
    return { success: false as const, error: MSG.offer.cannotEdit };
  }

  return { success: true as const, user, configuration };
}

export async function generateOfferAction(confId: number) {
  const auth = await authorizeOfferAction(confId);
  if (!auth.success) return auth;
  const { user, configuration } = auth;

  try {
    const [existingSnapshot, ebomRows, surchargeSettings] = await Promise.all([
      getOfferSnapshotByConfigurationId(confId),
      getEngineeringBomItems(confId),
      getSurchargeSettings(),
    ]);

    const isRegenerate = existingSnapshot !== null;
    const hasEbom = ebomRows.length > 0;

    const bomItems = hasEbom
      ? await buildOfferItemsFromEbom(ebomRows)
      : await buildOfferItemsFromLive(configuration);

    const surchargeResult = resolveOfferSurcharges({
      totalHeightMm: configuration.total_height,
      standardHeightMm: STANDARD_MACHINE_HEIGHT_MM,
      hasOmzPaint: configuration.has_omz_paint,
      settings: surchargeSettings,
    });
    if (!surchargeResult.ok) {
      return {
        success: false as const,
        error: MSG.surcharge.priceNotConfigured,
      };
    }
    const { surcharges } = surchargeResult;

    const items = appendSurchargesToOfferItems(bomItems, surcharges);

    const { total_list_price: bomTotal } = computeOfferTotals(bomItems, 0);
    const total_list_price = bomTotal + sumSurchargeTotal(surcharges);

    await upsertOfferSnapshot({
      configuration_id: confId,
      source: hasEbom ? "EBOM" : "LIVE",
      generated_by: user.id,
      items,
      total_list_price: total_list_price.toFixed(2),
      bom_rules_version: BOM_RULES_VERSION,
    });

    await logActivity({
      userId: user.id,
      action: isRegenerate ? "OFFER_REGENERATE" : "OFFER_GENERATE",
      targetEntity: "offer_snapshot",
      targetId: confId.toString(),
      metadata: { source: hasEbom ? "EBOM" : "LIVE" },
    });

    revalidateOfferPaths(confId);
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

export async function setOfferDiscountAction(
  confId: number,
  discount_pct: number,
) {
  const parsed = offerDiscountSchema.safeParse({ discount_pct });
  if (!parsed.success) {
    return { success: false as const, error: MSG.offer.invalidDiscount };
  }

  const auth = await authorizeOfferAction(confId);
  if (!auth.success) return auth;
  const { user } = auth;

  try {
    const existing = await getOfferSnapshotByConfigurationId(confId);
    if (!existing) {
      return { success: false as const, error: MSG.offer.notFound };
    }

    const previousPct = existing.discount_pct;
    await updateOfferDiscount(confId, parsed.data.discount_pct.toFixed(2));

    await logActivity({
      userId: user.id,
      action: "OFFER_DISCOUNT_SET",
      targetEntity: "offer_snapshot",
      targetId: confId.toString(),
      metadata: {
        previous_pct: previousPct,
        new_pct: parsed.data.discount_pct,
      },
    });

    revalidateOfferPaths(confId);
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
