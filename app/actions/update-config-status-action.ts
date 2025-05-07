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
    throw new Error(validation.error?.message);
  }

  const user = await getUserData();

  if (!user) {
    throw new Error("Utente non trovato o non autenticato.");
  }

  try {
    const updatedConf = await updateConfigStatus(confId, user, validation.data);
    revalidatePath(`/configurations/edit/${confId}`);
    return { success: true, id: updatedConf.id };
  } catch (err) {
    if (err instanceof QueryError || err instanceof DatabaseError) {
      throw new Error(err.message);
    }

    throw new Error("Unknown Error.");
  }
};
