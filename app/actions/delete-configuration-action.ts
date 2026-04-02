"use server";

import { revalidatePath } from "next/cache";
import { DatabaseError } from "pg";
import { isEditable } from "@/app/actions/lib/auth-checks";
import { logActivity } from "@/db/queries";
import {
  deleteConfiguration,
  getConfiguration,
  getUserData,
  QueryError,
} from "@/db/queries";
import { MSG } from "@/lib/messages";

export const deleteConfigurationAction = async (id: number, userId: string) => {
  const user = await getUserData();

  if (!user) {
    return { success: false as const, error: MSG.auth.userNotAuthenticated };
  }

  if (user.id !== userId && user.role !== "ADMIN") {
    return { success: false as const, error: MSG.auth.unauthorized };
  }

  const configuration = await getConfiguration(id);

  if (!configuration) {
    return { success: false as const, error: MSG.config.notFound };
  }

  // Status protection: only allow deletion if user can edit this status
  if (!isEditable(configuration.status, user.role)) {
    return {
      success: false as const,
      error: MSG.config.cannotDelete,
    };
  }

  try {
    await deleteConfiguration(id);
    await logActivity({
      userId: user.id,
      action: "CONFIG_DELETE",
      targetEntity: "configuration",
      targetId: id.toString(),
    });
    revalidatePath("/configurations");
    revalidatePath("/");
    return { success: true as const };
  } catch (err) {
    console.error("Failed to delete configuration:", err);
    if (err instanceof QueryError) {
      return { success: false as const, error: err.message };
    }
    if (err instanceof DatabaseError) {
      return { success: false as const, error: MSG.db.error };
    }
    return { success: false as const, error: MSG.db.unknown };
  }
};
