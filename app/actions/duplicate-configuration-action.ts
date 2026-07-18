"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  duplicateConfigurationRecord,
  getConfigurationWithTanksAndBays,
  getUserData,
  logActivity,
} from "@/db/queries";
import { canManageStandaloneConfigs } from "@/lib/access";
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

  // 3. Role gate — a duplicate is a standalone technical copy, so only roles
  // that own the standalone area may duplicate, mirroring insertConfigurationAction (#243)
  if (!canManageStandaloneConfigs(user.role)) {
    return { success: false as const, error: MSG.auth.unauthorized };
  }

  // 4. Fetch source — scoped read (canAccessConfiguration inside the query)
  const source = await getConfigurationWithTanksAndBays(parsed.data, user);
  if (!source) {
    return { success: false as const, error: MSG.config.notFound };
  }

  // 5. No isEditable check — source is not mutated; duplication is non-destructive

  // 6. Execute atomically (config + tanks + bays in one transaction)
  try {
    const newConfig = await duplicateConfigurationRecord(source, user.id);

    // 7. Activity log (outside transaction, mirrors insertConfigurationAction)
    await logActivity({
      userId: user.id,
      action: "CONFIG_DUPLICATE",
      targetEntity: "configuration",
      targetId: newConfig.id.toString(),
      metadata: { source_id: source.id, source_name: source.name },
    });

    // 8. Revalidate list — edit page for new id is a fresh uncached route.
    // "/" renders the technical queue counts the duplicate adds to.
    revalidatePath("/configurazioni");
    revalidatePath("/");

    return { success: true as const, id: newConfig.id };
  } catch (err) {
    return mapActionError(err, "Failed to duplicate configuration:");
  }
};
