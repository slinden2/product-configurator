"use server";

import { revalidatePath } from "next/cache";
import { DatabaseError } from "pg";
import { db } from "@/db";
import { loadValidatedConfiguration } from "@/db/load-validated-configuration";
import {
  freezeOfferSnapshot,
  getUserData,
  insertActivityLog,
  QueryError,
  thawOfferSnapshot,
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

      // Approval freezes the offer as the immutable as-sold snapshot, capturing
      // the full form-shaped configuration; un-approval thaws it.
      if (result.freezeEvent === "freeze") {
        // Intentionally non-transactional: loadValidatedConfiguration takes a
        // separate pooled connection rather than the open tx. Safe because a
        // status change never mutates the config rows it reads, so the captured
        // as-sold snapshot is accurate. (Trade-off: nesting a second pooled read
        // inside the tx adds minor pool pressure under high concurrency.)
        const loaded = await loadValidatedConfiguration(confId, user);
        if (!loaded) {
          throw new QueryError(MSG.config.notFound, 404);
        }
        await freezeOfferSnapshot(
          confId,
          {
            configuration: loaded.configuration,
            waterTanks: loaded.waterTanks,
            washBays: loaded.washBays,
          },
          user.id,
          tx,
        );
      } else if (result.freezeEvent === "thaw") {
        await thawOfferSnapshot(confId, user.id, tx);
      }

      return result;
    });
    revalidatePath(`/configurazioni/modifica/${updatedId}`);
    // The read-only view also renders status-dependent UI (edit button,
    // transition list) and the StatusForm, so it must be revalidated too.
    revalidatePath(`/configurazioni/visualizza/${updatedId}`);
    // Freeze/thaw changes the offer (frozen marker + as-sold capture).
    revalidatePath(`/configurazioni/offerta/${updatedId}`);
    return { success: true as const, id: updatedId };
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
