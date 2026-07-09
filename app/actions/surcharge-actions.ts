"use server";

import { revalidatePath } from "next/cache";
import { updateSurchargeSettingWithAudit } from "@/db/queries";
import { MSG } from "@/lib/messages";
import type { SurchargeKind } from "@/types";
import { surchargeSettingsSchema } from "@/validation/surcharge-settings-schema";
import { authorizeAdmin } from "./lib/authorize";
import { firstZodIssueMessage } from "./lib/first-zod-issue-message";
import { mapActionError } from "./lib/map-action-error";

const REVALIDATE_PATH = "/gestione/maggiorazioni";

export async function updateSurchargeSettingAction(formData: {
  kind: SurchargeKind;
  price: number | string;
}) {
  const parsed = surchargeSettingsSchema.safeParse(formData);
  if (!parsed.success) {
    return {
      success: false as const,
      error: firstZodIssueMessage(parsed.error, MSG.db.unknown),
    };
  }

  const auth = await authorizeAdmin(MSG.surcharge.adminOnly);
  if (!auth.success) return { success: false as const, error: auth.error };

  const { kind, price } = parsed.data;

  try {
    await updateSurchargeSettingWithAudit({
      kind,
      price,
      updated_by: auth.user.id,
    });

    revalidatePath(REVALIDATE_PATH);
    return { success: true as const };
  } catch (err) {
    return mapActionError(err, "Failed to update surcharge setting:");
  }
}
