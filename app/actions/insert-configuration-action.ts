"use server";

import { getUserData, insertConfiguration, QueryError } from "@/db/queries";
import { configSchema } from "@/validation/config-schema";
import { revalidatePath } from "next/cache";
import { DatabaseError } from "pg";

export const insertConfigurationAction = async (formData: unknown) => {
  const validation = configSchema.safeParse(formData);

  if (!validation.success) {
    return { success: false as const, error: validation.error.message };
  }

  const user = await getUserData();

  if (!user) {
    return { success: false as const, error: "Utente non trovato." };
  }

  try {
    const newConfig = await insertConfiguration(validation.data);
    revalidatePath("/configurations");
    return { success: true as const, id: newConfig.id };
  } catch (err) {
    if (err instanceof QueryError || err instanceof DatabaseError) {
      return { success: false as const, error: err.message };
    }

    return { success: false as const, error: "Errore sconosciuto." };
  }
};
