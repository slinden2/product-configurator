"use server";

import { db } from "@/db";
import { getConfiguration, getUserData } from "@/db/queries";
import { configurations } from "@/db/schemas";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { isEditable } from "@/app/actions/lib/auth-checks";

export const deleteConfigurationAction = async (id: number, userId: string) => {
  const user = await getUserData();

  if (!user) {
    return { success: false, error: "Utente non trovato." };
  }

  if (user.id !== userId && user.role !== "ADMIN") {
    return { success: false, error: "Non autorizzato." };
  }

  const configuration = await getConfiguration(id);

  if (!configuration) {
    return { success: false, error: "Configurazione non trovata." };
  }

  // Status protection: only allow deletion if user can edit this status
  if (!isEditable(configuration.status, user.role)) {
    return {
      success: false,
      error: "Non è possibile eliminare una configurazione in questo stato.",
    };
  }

  try {
    await db.delete(configurations).where(eq(configurations.id, id));
    revalidatePath("/configurations");
    return { success: true };
  } catch (error) {
    console.error("Failed to delete configuration:", error);
    return {
      success: false,
      error: "Si è verificato un errore durante la eliminazione.",
    };
  }
};
