"use server";

import { db } from "@/db";
import { getConfiguration, getUserData, QueryError } from "@/db/queries";
import { DatabaseError } from "pg";
import { configurations } from "@/db/schemas";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { isEditable } from "@/app/actions/lib/auth-checks";

export const deleteConfigurationAction = async (id: number, userId: string) => {
  const user = await getUserData();

  if (!user) {
    return { success: false as const, error: "Utente non trovato." };
  }

  if (user.id !== userId && user.role !== "ADMIN") {
    return { success: false as const, error: "Non autorizzato." };
  }

  const configuration = await getConfiguration(id);

  if (!configuration) {
    return { success: false as const, error: "Configurazione non trovata." };
  }

  // Status protection: only allow deletion if user can edit this status
  if (!isEditable(configuration.status, user.role)) {
    return {
      success: false as const,
      error: "Non è possibile eliminare una configurazione in questo stato.",
    };
  }

  try {
    await db.delete(configurations).where(eq(configurations.id, id));
    revalidatePath("/configurations");
    return { success: true as const };
  } catch (err) {
    console.error("Failed to delete configuration:", err);
    if (err instanceof QueryError) {
      return { success: false as const, error: err.message };
    }
    if (err instanceof DatabaseError) {
      return { success: false as const, error: "Errore del database." };
    }
    return { success: false as const, error: "Errore sconosciuto." };
  }
};
