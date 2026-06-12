"use server";

import { revalidatePath } from "next/cache";
import { DatabaseError } from "pg";
import {
  getUserData,
  QueryError,
  updateInstallationItemSettingWithAudit,
} from "@/db/queries";
import { MSG } from "@/lib/messages";
import type { InstallationItemKind } from "@/types";
import { installationItemSettingsSchema } from "@/validation/installation-item-settings-schema";

const REVALIDATE_PATH = "/gestione/installazione";

async function authorizeAdmin() {
  const user = await getUserData();
  if (!user)
    return { success: false as const, error: MSG.auth.userNotAuthenticated };
  if (user.role !== "ADMIN")
    return { success: false as const, error: MSG.installation.adminOnly };
  return { success: true as const, user };
}

export async function updateInstallationItemSettingAction(formData: {
  kind: InstallationItemKind;
  price: number | string;
}) {
  const parsed = installationItemSettingsSchema.safeParse(formData);
  if (!parsed.success) {
    return {
      success: false as const,
      error: parsed.error.issues[0]?.message ?? MSG.db.unknown,
    };
  }

  const auth = await authorizeAdmin();
  if (!auth.success) return { success: false as const, error: auth.error };

  const { kind, price } = parsed.data;

  try {
    await updateInstallationItemSettingWithAudit({
      kind,
      price,
      updated_by: auth.user.id,
    });

    revalidatePath(REVALIDATE_PATH);
    return { success: true as const };
  } catch (err) {
    if (err instanceof QueryError)
      return { success: false as const, error: err.message };
    if (err instanceof DatabaseError)
      return { success: false as const, error: MSG.db.error };
    return { success: false as const, error: MSG.db.unknown };
  }
}
