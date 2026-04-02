"use server";

import { revalidatePath } from "next/cache";
import { DatabaseError } from "pg";
import { logActivity } from "@/db/queries";
import {
  getConfiguration,
  getUserData,
  QueryError,
  updateConfigStatus,
} from "@/db/queries";
import { MSG } from "@/lib/messages";
import { configStatusSchema } from "@/validation/config-status-schema";

export const updateConfigStatusAction = async (
  confId: number,
  formData: unknown,
) => {
  const validation = configStatusSchema.safeParse(formData);

  if (!validation.success) {
    return { success: false as const, error: validation.error.message };
  }

  const user = await getUserData();

  if (!user) {
    return {
      success: false as const,
      error: MSG.auth.userNotAuthenticated,
    };
  }

  try {
    const currentConf = await getConfiguration(confId);
    const fromStatus = currentConf?.status;
    const updatedConf = await updateConfigStatus(confId, user, validation.data);
    await logActivity({
      userId: user.id,
      action: "CONFIG_STATUS_CHANGE",
      targetEntity: "configuration",
      targetId: confId.toString(),
      metadata: { from: fromStatus, to: validation.data.status },
    });
    revalidatePath(`/configurations/edit/${updatedConf.id}`);
    return { success: true as const, id: updatedConf.id };
  } catch (err) {
    console.error("Failed to update configuration status:", err);
    if (err instanceof QueryError) {
      return { success: false as const, error: err.message };
    }
    if (err instanceof DatabaseError) {
      return { success: false as const, error: MSG.db.error };
    }
    return { success: false as const, error: MSG.db.unknown };
  }
};
