"use server";

import { revalidatePath } from "next/cache";
import { DatabaseError } from "pg";
import { isEditable } from "@/app/actions/lib/auth-checks";
import { db } from "@/db";
import {
  canAccessConfiguration,
  deleteAllEngineeringBomItems,
  deleteOfferSnapshotByConfigurationId,
  getConfigurationWithTanksAndBays,
  getOfferFreezeState,
  getUserData,
  hasEngineeringBom,
  insertActivityLog,
  QueryError,
  resetWashBayEnergyChainFields,
  resetWashBayNonEnergyChainFields,
  updateConfiguration,
} from "@/db/queries";
import { MSG } from "@/lib/messages";
import { isOfferFrozen } from "@/lib/offer";
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

  // Status protection: enforce editable rules per role and origin
  if (!isEditable(configuration.status, user.role, configuration.origin)) {
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

      // Invalidate the engineering BOM and offer snapshot when BOM-relevant
      // fields changed. A frozen offer is the immutable as-sold record, so it
      // must survive edits (an engineer can edit in IN_TECH_REVIEW); only the
      // EBOM cost side is invalidated then.
      if (hasBomRelevantChanges(configuration, validation.data)) {
        const ebomExists = await hasEngineeringBom(confId, tx);
        if (ebomExists) {
          await deleteAllEngineeringBomItems(confId, tx);
        }
        const freeze = await getOfferFreezeState(confId, tx);
        if (!isOfferFrozen(freeze)) {
          await deleteOfferSnapshotByConfigurationId(confId, tx);
        }
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
    revalidatePath(`/configurazioni/offerta/${confId}`);
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
