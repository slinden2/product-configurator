"use server";

import { revalidatePath } from "next/cache";
import { DatabaseError } from "pg";
import { isEditable } from "@/app/actions/lib/auth-checks";
import { db } from "@/db";
import {
  deleteAllEngineeringBomItems,
  deleteOfferSnapshotByConfigurationId,
  getConfigurationWithTanksAndBays,
  getUserData,
  hasEngineeringBom,
  logActivity,
  QueryError,
  resetWashBayEnergyChainFields,
  resetWashBayNonEnergyChainFields,
  updateConfiguration,
} from "@/db/queries";
import { MSG } from "@/lib/messages";
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

  // Authorization: owner, ENGINEER, or ADMIN
  if (
    user.id !== configuration.user_id &&
    user.role !== "ADMIN" &&
    user.role !== "ENGINEER"
  ) {
    return { success: false as const, error: MSG.auth.unauthorized };
  }

  // Status protection: enforce editable rules per role
  if (!isEditable(configuration.status, user.role)) {
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

      // Delete engineering BOM and offer snapshot if BOM-relevant fields changed
      if (hasBomRelevantChanges(configuration, validation.data)) {
        const ebomExists = await hasEngineeringBom(confId, tx);
        if (ebomExists) {
          await deleteAllEngineeringBomItems(confId, tx);
        }
        await deleteOfferSnapshotByConfigurationId(confId, tx);
      }
    });

    await logActivity({
      userId: user.id,
      action: "CONFIG_EDIT",
      targetEntity: "configuration",
      targetId: confId.toString(),
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
