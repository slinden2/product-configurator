"use server";

import {
  getConfigurationWithTanksAndBays,
  getUserData,
  QueryError,
  updateConfiguration,
} from "@/db/queries";
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
    return { success: false as const, error: "Utente non trovato." };
  }

  const configuration = await getConfigurationWithTanksAndBays(confId);

  if (!configuration) {
    return { success: false as const, error: "Configurazione non trovata." };
  }

  // Authorization: owner, INTERNAL, or ADMIN
  if (
    user.id !== ownerId &&
    user.role !== "ADMIN" &&
    user.role !== "INTERNAL"
  ) {
    return { success: false as const, error: "Non autorizzato." };
  }

  // Status protection: enforce editable rules per role
  if (!isEditable(configuration.status, user.role)) {
    return {
      success: false as const,
      error: "Non è possibile modificare una configurazione in questo stato.",
    };
  }

  try {
    await updateConfiguration(confId, { ...validation.data, user_id: ownerId });
    revalidatePath(`/configurations/edit/${confId}`);
    return { success: true as const };
  } catch (err) {
    if (err instanceof QueryError || err instanceof DatabaseError) {
      return { success: false as const, error: err.message };
    }

    return { success: false as const, error: "Errore sconosciuto." };
  }
};
