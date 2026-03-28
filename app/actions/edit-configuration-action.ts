"use server";

import { db } from "@/db";
import {
  deleteAllEngineeringBomItems,
  getConfigurationWithTanksAndBays,
  getUserData,
  hasEngineeringBom,
  QueryError,
  resetWashBayEnergyChainFields,
  updateConfiguration,
} from "@/db/queries";
import { MSG } from "@/lib/messages";
import { configSchema } from "@/validation/config-schema";
import { revalidatePath } from "next/cache";
import { DatabaseError } from "pg";
import { isEditable } from "@/app/actions/lib/auth-checks";

export const editConfigurationAction = async (
  confId: number,
  ownerId: string,
  formData: unknown
) => {
  const validation = configSchema.safeParse(formData);

  if (!validation.success) {
    return { success: false as const, error: validation.error.message };
  }

  const user = await getUserData();

  if (!user) {
    return { success: false as const, error: MSG.auth.userNotFound };
  }

  const configuration = await getConfigurationWithTanksAndBays(confId);

  if (!configuration) {
    return { success: false as const, error: MSG.config.notFound };
  }

  // Authorization: owner, ENGINEER, or ADMIN
  if (
    user.id !== ownerId &&
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

    await db.transaction(async (tx) => {
      await updateConfiguration(confId, { ...validation.data, user_id: ownerId }, tx);

      if (supplyTypeChangedFromEC) {
        await resetWashBayEnergyChainFields(confId, tx);
      }

      // Delete engineering BOM if it exists — config changes invalidate the snapshot
      const ebomExists = await hasEngineeringBom(confId, tx);
      if (ebomExists) {
        await deleteAllEngineeringBomItems(confId, tx);
      }
    });

    revalidatePath(`/configurations/edit/${confId}`);
    revalidatePath(`/configurations/bom/${confId}`);
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
