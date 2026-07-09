"use server";

import { revalidatePath } from "next/cache";
import { updateInstallationItemSettingWithAudit } from "@/db/queries";
import { MSG } from "@/lib/messages";
import type { InstallationItemKind } from "@/types";
import { installationItemSettingsSchema } from "@/validation/installation-item-settings-schema";
import { authorizeAdmin } from "./lib/authorize";
import { firstZodIssueMessage } from "./lib/first-zod-issue-message";
import { mapActionError } from "./lib/map-action-error";

const REVALIDATE_PATH = "/gestione/installazione";

export async function updateInstallationItemSettingAction(formData: {
  kind: InstallationItemKind;
  price: number | string;
}) {
  const parsed = installationItemSettingsSchema.safeParse(formData);
  if (!parsed.success) {
    return {
      success: false as const,
      error: firstZodIssueMessage(parsed.error, MSG.db.unknown),
    };
  }

  const auth = await authorizeAdmin(MSG.installation.adminOnly);
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
    return mapActionError(err, "Failed to update installation item setting:");
  }
}
