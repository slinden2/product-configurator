"use server";

import { revalidatePath } from "next/cache";
import { DatabaseError } from "pg";
import { isEditable } from "@/app/actions/lib/auth-checks";
import { mapActionError } from "@/app/actions/lib/map-action-error";
import { db } from "@/db";
import {
  canAccessConfiguration,
  deleteConfiguration,
  getConfiguration,
  getUserData,
  insertActivityLog,
  offerRevisionStatusFor,
} from "@/db/queries";
import { MSG } from "@/lib/messages";

export const deleteConfigurationAction = async (id: number) => {
  const user = await getUserData();

  if (!user) {
    return { success: false as const, error: MSG.auth.userNotAuthenticated };
  }

  const configuration = await getConfiguration(id);

  if (!configuration) {
    return { success: false as const, error: MSG.config.notFound };
  }

  // Scope: SALES delete own, SALES_MANAGER own + reports, others all
  if (!(await canAccessConfiguration(user, configuration))) {
    return { success: false as const, error: MSG.auth.unauthorized };
  }

  // Status protection: only allow deletion if user can edit this status. For an
  // OFFER config pre-handoff this keys on the owning revision being DRAFT.
  const offerRevisionStatus = await offerRevisionStatusFor(configuration);
  if (
    !isEditable(
      configuration.status,
      user.role,
      configuration.origin,
      offerRevisionStatus,
    )
  ) {
    return {
      success: false as const,
      error: MSG.config.cannotDelete,
    };
  }

  // A defined revision status means an offer_revision_lines row references this
  // config (possibly a frozen accepted line). Lines are removed from the offer page
  // (removeOfferLineAction), never by deleting the config out from under them; the
  // FK is onDelete restrict as backstop.
  if (configuration.origin === "OFFER" && offerRevisionStatus !== undefined) {
    return {
      success: false as const,
      error: MSG.config.cannotDeleteOfferOwned,
    };
  }

  try {
    await db.transaction(async (tx) => {
      await deleteConfiguration(id, configuration.status, tx);
      await insertActivityLog(
        {
          userId: user.id,
          action: "CONFIG_DELETE",
          targetEntity: "configuration",
          targetId: id.toString(),
          metadata: { name: configuration.name, status: configuration.status },
        },
        tx,
      );
    });
    revalidatePath("/configurazioni");
    revalidatePath("/");
    return { success: true as const };
  } catch (err) {
    // FK restrict violation — an offer line still references this config.
    if (err instanceof DatabaseError && err.code === "23503") {
      console.error("Failed to delete configuration:", err);
      return {
        success: false as const,
        error: MSG.config.cannotDeleteOfferOwned,
      };
    }
    return mapActionError(err, "Failed to delete configuration:");
  }
};
