"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { db } from "@/db";
import {
  assignManagerWithAudit,
  changeUserRoleWithAudit,
  getUserData,
  logActivity,
} from "@/db/queries";
import { userProfiles } from "@/db/schemas";
import { MSG } from "@/lib/messages";
import { createClient } from "@/utils/supabase/server";
import {
  assignManagerSchema,
  changeRoleSchema,
  sendPasswordResetSchema,
} from "@/validation/user-schema";
import { mapActionError } from "./lib/map-action-error";

export async function changeUserRoleAction(formData: unknown) {
  const validation = changeRoleSchema.safeParse(formData);
  if (!validation.success) {
    return { success: false as const, error: MSG.auth.invalidData };
  }

  const { userId, newRole } = validation.data;

  const user = await getUserData();
  if (!user) {
    return { success: false as const, error: MSG.auth.userNotAuthenticated };
  }

  if (user.role !== "ADMIN") {
    return { success: false as const, error: MSG.auth.unauthorized };
  }

  if (userId === user.id) {
    return { success: false as const, error: MSG.users.cannotChangeOwnRole };
  }

  if (newRole === "ADMIN") {
    return { success: false as const, error: MSG.users.cannotPromoteToAdmin };
  }

  const targetUser = await db.query.userProfiles.findFirst({
    where: eq(userProfiles.id, userId),
    columns: { id: true, role: true },
  });

  if (!targetUser) {
    return { success: false as const, error: MSG.users.notFound };
  }

  try {
    await changeUserRoleWithAudit({
      userId,
      newRole,
      changedBy: user.id,
    });

    revalidatePath("/gestione/utenti");
    return { success: true as const };
  } catch (err) {
    return mapActionError(err, "Failed to change user role:");
  }
}

export async function assignManagerAction(formData: unknown) {
  const validation = assignManagerSchema.safeParse(formData);
  if (!validation.success) {
    return { success: false as const, error: MSG.auth.invalidData };
  }

  const { userId, managerId } = validation.data;

  const user = await getUserData();
  if (!user) {
    return { success: false as const, error: MSG.auth.userNotAuthenticated };
  }

  if (user.role !== "ADMIN") {
    return { success: false as const, error: MSG.auth.unauthorized };
  }

  if (managerId === userId) {
    return { success: false as const, error: MSG.users.invalidManager };
  }

  const targetUser = await db.query.userProfiles.findFirst({
    where: eq(userProfiles.id, userId),
    columns: { id: true, role: true },
  });
  if (!targetUser) {
    return { success: false as const, error: MSG.users.notFound };
  }

  // Only SALES agents report to a manager. Guard server-side so a manager_id
  // cannot be set on an ENGINEER/ADMIN/SALES_MANAGER/SALES_DIRECTOR and leak
  // their configs into a manager's scope.
  if (targetUser.role !== "SALES") {
    return { success: false as const, error: MSG.users.invalidManager };
  }

  // A manager must exist and actually be a SALES_MANAGER.
  if (managerId !== null) {
    const manager = await db.query.userProfiles.findFirst({
      where: eq(userProfiles.id, managerId),
      columns: { id: true, role: true },
    });
    if (!manager || manager.role !== "SALES_MANAGER") {
      return { success: false as const, error: MSG.users.invalidManager };
    }
  }

  try {
    await assignManagerWithAudit({ userId, managerId, changedBy: user.id });

    revalidatePath("/gestione/utenti");
    return { success: true as const };
  } catch (err) {
    return mapActionError(err, "Failed to assign manager:");
  }
}

export async function sendPasswordResetAction(formData: unknown) {
  const validation = sendPasswordResetSchema.safeParse(formData);
  if (!validation.success) {
    return { success: false as const, error: MSG.auth.invalidData };
  }

  const { userId } = validation.data;

  const user = await getUserData();
  if (!user) {
    return { success: false as const, error: MSG.auth.userNotAuthenticated };
  }

  if (user.role !== "ADMIN") {
    return { success: false as const, error: MSG.auth.unauthorized };
  }

  const targetUser = await db.query.userProfiles.findFirst({
    where: eq(userProfiles.id, userId),
    columns: { id: true, email: true },
  });

  if (!targetUser) {
    return { success: false as const, error: MSG.users.notFound };
  }

  try {
    const supabase = await createClient();
    const origin = (await headers()).get("origin");

    const { error } = await supabase.auth.resetPasswordForEmail(
      targetUser.email,
      { redirectTo: `${origin}/resetta-password` },
    );

    if (error) {
      return { success: false as const, error: MSG.auth.genericError };
    }

    // Best-effort: the Supabase email side effect cannot be rolled back by a
    // DB transaction, so audit failure must not surface as an error to the
    // operator after the email has already been dispatched.
    await logActivity({
      userId: user.id,
      action: "PASSWORD_RESET",
      targetEntity: "user_profile",
      targetId: userId,
    });

    return { success: true as const };
  } catch (err) {
    return mapActionError(err, "Failed to send password reset:");
  }
}
