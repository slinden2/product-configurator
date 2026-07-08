"use server";

import { db } from "@/db";
import {
  getUserData,
  insertActivityLog,
  updateConfigStatus,
} from "@/db/queries";
import { MSG } from "@/lib/messages";
import { configStatusSchema } from "@/validation/config-status-schema";
import { firstZodIssueMessage } from "./lib/first-zod-issue-message";
import { mapActionError } from "./lib/map-action-error";
import { revalidateConfigurationRoutes } from "./lib/revalidate-config-routes";

export const updateConfigStatusAction = async (
  confId: number,
  formData: unknown,
) => {
  const validation = configStatusSchema.safeParse(formData);

  if (!validation.success) {
    return {
      success: false as const,
      error: firstZodIssueMessage(validation.error, MSG.db.unknown),
    };
  }

  const user = await getUserData();

  if (!user) {
    return {
      success: false as const,
      error: MSG.auth.userNotAuthenticated,
    };
  }

  try {
    const { id: updatedId, origin } = await db.transaction(async (tx) => {
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
    revalidateConfigurationRoutes(updatedId, origin);
    return { success: true as const, id: updatedId };
  } catch (err) {
    return mapActionError(err, "Failed to update configuration status:");
  }
};
