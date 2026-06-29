"use server";

import { revalidatePath } from "next/cache";
import { DatabaseError } from "pg";
import { isEditable } from "@/app/actions/lib/auth-checks";
import { db } from "@/db";
import {
  canAccessConfiguration,
  deleteAllEngineeringBomItems,
  getConfigurationWithTanksAndBays,
  getUserData,
  hasEngineeringBom,
  insertActivityLog,
  offerRevisionStatusFor,
  QueryError,
  resetWashBayEnergyChainFields,
  resetWashBayNonEnergyChainFields,
  updateConfiguration,
} from "@/db/queries";
import { MSG } from "@/lib/messages";
import { repriceOfferLine } from "@/lib/offer-revision-pricing";
import {
  configSchema,
  hasBomRelevantChanges,
} from "@/validation/config-schema";

export const editConfigurationAction = async (
  confId: number,
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

  const configuration = await getConfigurationWithTanksAndBays(confId, user);

  if (!configuration) {
    return { success: false as const, error: MSG.config.notFound };
  }

  // Authorization: owner, in-scope manager, ENGINEER, ADMIN, or SALES_DIRECTOR
  if (!(await canAccessConfiguration(user, configuration))) {
    return { success: false as const, error: MSG.auth.unauthorized };
  }

  // Status protection: enforce editable rules per role, origin, and — for an
  // OFFER config pre-handoff — the owning revision's status (editable only while
  // the revision is DRAFT).
  const offerRevisionStatus = await offerRevisionStatusFor(configuration);
  if (
    !isEditable(
      configuration.status,
      user.role,
      configuration.origin,
      offerRevisionStatus,
    )
  ) {
    return {
      success: false as const,
      error: MSG.config.cannotEdit,
    };
  }

  try {
    const supplyTypeChangedFromEC =
      configuration.supply_type === "ENERGY_CHAIN" &&
      validation.data.supply_type !== "ENERGY_CHAIN";

    const becameEcWall =
      !(
        configuration.supply_type === "ENERGY_CHAIN" &&
        configuration.supply_fixing_type === "WALL"
      ) &&
      validation.data.supply_type === "ENERGY_CHAIN" &&
      validation.data.supply_fixing_type === "WALL";

    await db.transaction(async (tx) => {
      await updateConfiguration(
        confId,
        { ...validation.data, user_id: configuration.user_id },
        tx,
      );

      if (supplyTypeChangedFromEC) {
        await resetWashBayEnergyChainFields(confId, tx);
      }

      if (becameEcWall) {
        await resetWashBayNonEnergyChainFields(confId, tx);
      }

      // Invalidate the engineering BOM when BOM-relevant fields changed. The offer's
      // commercial figures live on the offer revision line and are recomputed by the
      // reprice below (while the revision is DRAFT) or already frozen on a sent/accepted
      // revision — there is no separate offer snapshot to invalidate.
      if (hasBomRelevantChanges(configuration, validation.data)) {
        const ebomExists = await hasEngineeringBom(confId, tx);
        if (ebomExists) {
          await deleteAllEngineeringBomItems(confId, tx);
        }
      }

      // An OFFER line's price tracks its config. Re-price unconditionally (not
      // gated on hasBomRelevantChanges) because the surcharge drivers total_height
      // and has_omz_paint are BOM-exempt — a BOM-relevance gate would miss them.
      // No-op for STANDALONE configs and non-DRAFT revisions.
      if (configuration.origin === "OFFER") {
        await repriceOfferLine(confId, user.id, tx);
      }

      await insertActivityLog(
        {
          userId: user.id,
          action: "CONFIG_EDIT",
          targetEntity: "configuration",
          targetId: confId.toString(),
        },
        tx,
      );
    });
    revalidatePath(`/configurazioni/modifica/${confId}`);
    revalidatePath(`/configurazioni/bom/${confId}`);
    revalidatePath(`/configurazioni/marginalita/${confId}`);
    // An OFFER line config surfaces on its offer detail page too.
    if (configuration.origin === "OFFER") {
      revalidatePath("/offerte/[id]", "page");
    }
    return { success: true as const };
  } catch (err) {
    console.error("Failed to edit configuration:", err);
    if (err instanceof QueryError) {
      return { success: false as const, error: err.message };
    }
    if (err instanceof DatabaseError) {
      return { success: false as const, error: MSG.db.error };
    }
    return { success: false as const, error: MSG.db.unknown };
  }
};
