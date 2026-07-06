"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import {
  getUserData,
  insertActivityLog,
  updateConfigStatus,
} from "@/db/queries";
import { MSG } from "@/lib/messages";
import { configStatusSchema } from "@/validation/config-status-schema";
import { mapActionError } from "./lib/map-action-error";

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
    const { id: updatedId } = await db.transaction(async (tx) => {
      const result = await updateConfigStatus(
        confId,
        user,
        validation.data,
        tx,
      );
      await insertActivityLog(
        {
          userId: user.id,
          action: "CONFIG_STATUS_CHANGE",
          targetEntity: "configuration",
          targetId: confId.toString(),
          metadata: { from: result.fromStatus, to: validation.data.status },
        },
        tx,
      );

      return result;
    });
    revalidatePath(`/configurazioni/modifica/${updatedId}`);
    // The read-only view also renders status-dependent UI (edit button,
    // transition list) and the StatusForm, so it must be revalidated too.
    revalidatePath(`/configurazioni/visualizza/${updatedId}`);
    // The BOM page gates Snapshot/Regenerate on editable = isEditable(status, …),
    // so freezing transitions must invalidate it too.
    revalidatePath(`/configurazioni/bom/${updatedId}`);
    return { success: true as const, id: updatedId };
  } catch (err) {
    return mapActionError(err, "Failed to update configuration status:");
  }
};
