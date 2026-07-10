"use server";

import { getUserData, insertConfiguration, logActivity } from "@/db/queries";
import { canManageStandaloneConfigs } from "@/lib/access";
import { MSG } from "@/lib/messages";
import { configSchema } from "@/validation/config-schema";
import { firstZodIssueMessage } from "./lib/first-zod-issue-message";
import { mapActionError } from "./lib/map-action-error";
import { revalidateConfigurationRoutes } from "./lib/revalidate-config-routes";

export const insertConfigurationAction = async (formData: unknown) => {
  const validation = configSchema.safeParse(formData);

  if (!validation.success) {
    return {
      success: false as const,
      error: firstZodIssueMessage(validation.error, MSG.db.unknown),
    };
  }

  const user = await getUserData();

  if (!user) {
    return { success: false as const, error: MSG.auth.userNotAuthenticated };
  }

  // This flow creates standalone (origin=STANDALONE, the DB default) technical
  // configs, which are Engineer/Admin only. Sales create configs from offers.
  if (!canManageStandaloneConfigs(user.role)) {
    return { success: false as const, error: MSG.auth.unauthorized };
  }

  try {
    const newConfig = await insertConfiguration(validation.data, user.id);
    await logActivity({
      userId: user.id,
      action: "CONFIG_CREATE",
      targetEntity: "configuration",
      targetId: newConfig.id.toString(),
    });
    // This flow only creates STANDALONE configs (see the role gate above).
    revalidateConfigurationRoutes(newConfig.id, "STANDALONE");
    return { success: true as const, id: newConfig.id };
  } catch (err) {
    return mapActionError(err, "Failed to insert configuration:");
  }
};
