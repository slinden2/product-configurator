"use server";

import { revalidatePath } from "next/cache";
import { DatabaseError } from "pg";
import { isEditable } from "@/app/actions/lib/auth-checks";
import { db } from "@/db";
import {
  canAccessConfiguration,
  getConfigurationWithTanksAndBays,
  getInstallationItemSettings,
  getOfferSnapshotByConfigurationId,
  getSurchargeSettings,
  getUserData,
  insertActivityLog,
  QueryError,
  updateOfferDiscountWithAudit,
  updateOfferSettingsWithAudit,
  upsertOfferSnapshot,
} from "@/db/queries";
import { canViewOffer } from "@/lib/access";
import { BOM_RULES_VERSION } from "@/lib/BOM/max-bom";
import { MSG } from "@/lib/messages";
import {
  appendSurchargesToOfferItems,
  buildOfferItemsFromLive,
  computeOfferTotals,
  isOfferFrozen,
  sumSurchargeTotal,
} from "@/lib/offer";
import { buildDefaultInstallationItems } from "@/lib/offer-installation";
import { resolveOfferSurcharges } from "@/lib/offer-surcharges";
import { STANDARD_MACHINE_HEIGHT_MM } from "@/types";
import {
  type OfferSettings,
  offerDiscountSchema,
  offerSettingsSchema,
} from "@/validation/offer-schema";

function revalidateOfferPaths(confId: number) {
  revalidatePath(`/configurazioni/offerta/${confId}`);
  revalidatePath(`/configurazioni`);
}

async function authorizeOfferAction(confId: number) {
  const user = await getUserData();
  if (!user)
    return { success: false as const, error: MSG.auth.userNotAuthenticated };

  if (!canViewOffer(user.role)) {
    return { success: false as const, error: MSG.offer.unauthorized };
  }

  const configuration = await getConfigurationWithTanksAndBays(confId, user);
  if (!configuration)
    return { success: false as const, error: MSG.config.notFound };

  if (!(await canAccessConfiguration(user, configuration))) {
    return { success: false as const, error: MSG.auth.unauthorized };
  }

  if (!isEditable(configuration.status, user.role, configuration.origin)) {
    return { success: false as const, error: MSG.offer.cannotEdit };
  }

  return { success: true as const, user, configuration };
}

export async function generateOfferAction(confId: number) {
  const auth = await authorizeOfferAction(confId);
  if (!auth.success) return auth;
  const { user, configuration } = auth;

  try {
    const [existingSnapshot, surchargeSettings, installationRows] =
      await Promise.all([
        getOfferSnapshotByConfigurationId(confId),
        getSurchargeSettings(),
        getInstallationItemSettings(),
      ]);

    // A frozen offer is the immutable as-sold record. isEditable already blocks
    // SALES_APPROVED/TECH_APPROVED/CLOSED, so this guards the IN_TECH_REVIEW
    // window where the config is editable but the offer must stay frozen.
    if (isOfferFrozen(existingSnapshot)) {
      return {
        success: false as const,
        error: MSG.offer.frozenCannotRegenerate,
      };
    }

    const isRegenerate = existingSnapshot !== null;

    // Offers always price from live config; the EBOM (engineering cost) never
    // re-prices the client-accepted offer.
    const bomItems = await buildOfferItemsFromLive(configuration);

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

    const source = "LIVE" as const;
    const action = isRegenerate
      ? ("OFFER_REGENERATE" as const)
      : ("OFFER_GENERATE" as const);
    await db.transaction(async (tx) => {
      await upsertOfferSnapshot(
        {
          configuration_id: confId,
          source,
          generated_by: user.id,
          items,
          total_list_price: total_list_price.toFixed(2),
          bom_rules_version: BOM_RULES_VERSION,
          installation_items: buildDefaultInstallationItems(installationRows),
        },
        tx,
      );
      await insertActivityLog(
        {
          userId: user.id,
          action,
          targetEntity: "offer_snapshot",
          targetId: confId.toString(),
          metadata: { source },
        },
        tx,
      );
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
    // A frozen offer is the immutable as-sold commitment: its commercial terms
    // (discount/transport/installation) are part of what the client accepted and
    // cannot be changed, even by an engineer/admin in IN_TECH_REVIEW.
    if (isOfferFrozen(existing)) {
      return { success: false as const, error: MSG.offer.frozenCannotEdit };
    }

    await updateOfferDiscountWithAudit({
      confId,
      discount_pct: parsed.data.discount_pct.toFixed(2),
      updated_by: user.id,
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

export async function setOfferSettingsAction(
  confId: number,
  settings: OfferSettings,
) {
  const parsed = offerSettingsSchema.safeParse(settings);
  if (!parsed.success) {
    return {
      success: false as const,
      error: parsed.error.issues[0]?.message ?? MSG.offer.invalidSettings,
    };
  }

  const auth = await authorizeOfferAction(confId);
  if (!auth.success) return auth;
  const { user } = auth;

  try {
    const existing = await getOfferSnapshotByConfigurationId(confId);
    if (!existing) {
      return { success: false as const, error: MSG.offer.notFound };
    }
    // A frozen offer is the immutable as-sold commitment: its commercial terms
    // are part of what the client accepted and cannot be changed.
    if (isOfferFrozen(existing)) {
      return { success: false as const, error: MSG.offer.frozenCannotEdit };
    }

    const { transport_amount, ...rest } = parsed.data;
    await updateOfferSettingsWithAudit({
      confId,
      settings: { ...rest, transport_amount: transport_amount.toFixed(2) },
      updated_by: user.id,
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
