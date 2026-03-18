"use server";

import { getUserData, QueryError, updateConfigStatus } from "@/db/queries";
import { configStatusSchema } from "@/validation/config-status.schema";
import { revalidatePath } from "next/cache";
import { DatabaseError } from "pg";

export const updateConfigStatusAction = async (
  confId: number,
  formData: unknown
) => {
  const validation = configStatusSchema.safeParse(formData);

  if (!validation.success) {
    return { success: false as const, error: validation.error.message };
  }

  const user = await getUserData();

  if (!user) {
    return {
      success: false as const,
      error: "Utente non trovato o non autenticato.",
    };
  }

  try {
    const updatedConf = await updateConfigStatus(confId, user, validation.data);
    revalidatePath(`/configurations/edit/${updatedConf.id}`);
    return { success: true as const, id: updatedConf.id };
  } catch (err) {
    if (err instanceof QueryError || err instanceof DatabaseError) {
      return { success: false as const, error: err.message };
    }

    return { success: false as const, error: "Errore sconosciuto." };
  }
};
