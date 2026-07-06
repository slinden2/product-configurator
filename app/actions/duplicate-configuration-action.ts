"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  duplicateConfigurationRecord,
  getConfigurationWithTanksAndBays,
  getUserData,
  logActivity,
} from "@/db/queries";
import { MSG } from "@/lib/messages";
import { mapActionError } from "./lib/map-action-error";

export const duplicateConfigurationAction = async (sourceId: unknown) => {
  // 1. Input validation — no configSchema, deliberate bypass (see GH #2)
  const parsed = z.number().int().positive().safeParse(sourceId);
  if (!parsed.success) {
    return { success: false as const, error: MSG.config.notFound };
  }

  // 2. Auth
  const user = await getUserData();
  if (!user) {
    return { success: false as const, error: MSG.auth.userNotAuthenticated };
  }

  // 3. Fetch source — enforces SALES-sees-own read permission
  const source = await getConfigurationWithTanksAndBays(parsed.data, user);
  if (!source) {
    return { success: false as const, error: MSG.config.notFound };
  }

  // 4. No isEditable check — source is not mutated; duplication is non-destructive

  // 5. Execute atomically (config + tanks + bays in one transaction)
  try {
    const newConfig = await duplicateConfigurationRecord(source, user.id);

    // 6. Activity log (outside transaction, mirrors insertConfigurationAction)
    await logActivity({
      userId: user.id,
      action: "CONFIG_DUPLICATE",
      targetEntity: "configuration",
      targetId: newConfig.id.toString(),
      metadata: { source_id: source.id, source_name: source.name },
    });

    // 7. Revalidate list — edit page for new id is a fresh uncached route
    revalidatePath("/configurazioni");

    return { success: true as const, id: newConfig.id };
  } catch (err) {
    return mapActionError(err, "Failed to duplicate configuration:");
  }
};
