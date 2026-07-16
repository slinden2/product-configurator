"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { db } from "@/db";
import {
  activateUserWithAudit,
  assignManagerWithAudit,
  changeUserRoleWithAudit,
  deactivateUserWithAudit,
  logActivity,
} from "@/db/queries";
import { userProfiles } from "@/db/schemas";
import { MSG } from "@/lib/messages";
import { createClient } from "@/utils/supabase/server";
import {
  activateUserSchema,
  assignManagerSchema,
  changeRoleSchema,
  deactivateUserSchema,
  sendPasswordResetSchema,
} from "@/validation/user-schema";
import { authorizeAdmin } from "./lib/authorize";
import { mapActionError } from "./lib/map-action-error";

export async function changeUserRoleAction(formData: unknown) {
  const validation = changeRoleSchema.safeParse(formData);
  if (!validation.success) {
    return { success: false as const, error: MSG.auth.invalidData };
  }

  const { userId, newRole } = validation.data;

  const auth = await authorizeAdmin();
  if (!auth.success) return { success: false as const, error: auth.error };
  const { user } = auth;

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

  // Symmetric with the promotion block above: ADMIN roles are immutable via
  // the UI, so the admin count can never silently decrease.
  if (targetUser.role === "ADMIN") {
    return { success: false as const, error: MSG.users.cannotChangeAdminRole };
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

  const auth = await authorizeAdmin();
  if (!auth.success) return { success: false as const, error: auth.error };
  const { user } = auth;

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

  // A manager must exist and actually be an active SALES_MANAGER.
  if (managerId !== null) {
    const manager = await db.query.userProfiles.findFirst({
      where: eq(userProfiles.id, managerId),
      columns: { id: true, role: true, is_active: true },
    });
    if (!manager || manager.role !== "SALES_MANAGER" || !manager.is_active) {
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

export async function activateUserAction(formData: unknown) {
  const validation = activateUserSchema.safeParse(formData);
  if (!validation.success) {
    return { success: false as const, error: MSG.auth.invalidData };
  }

  const { userId } = validation.data;

  const auth = await authorizeAdmin();
  if (!auth.success) return { success: false as const, error: auth.error };
  const { user } = auth;

  try {
    // Existence and already-active guards run inside the locked transaction.
    await activateUserWithAudit({ userId, activatedBy: user.id });

    revalidatePath("/gestione/utenti");
    return { success: true as const };
  } catch (err) {
    return mapActionError(err, "Failed to activate user:");
  }
}

export async function deactivateUserAction(formData: unknown) {
  const validation = deactivateUserSchema.safeParse(formData);
  if (!validation.success) {
    return { success: false as const, error: MSG.auth.invalidData };
  }

  const { userId } = validation.data;

  const auth = await authorizeAdmin();
  if (!auth.success) return { success: false as const, error: auth.error };
  const { user } = auth;

  if (userId === user.id) {
    return { success: false as const, error: MSG.users.cannotDeactivateSelf };
  }

  const targetUser = await db.query.userProfiles.findFirst({
    where: eq(userProfiles.id, userId),
    columns: { id: true, role: true },
  });

  if (!targetUser) {
    return { success: false as const, error: MSG.users.notFound };
  }

  // ADMIN accounts are immutable via the UI (same stance as role changes), so
  // the admin count can never silently decrease.
  if (targetUser.role === "ADMIN") {
    return { success: false as const, error: MSG.users.cannotDeactivateAdmin };
  }

  try {
    // Already-inactive and role guards re-run inside the locked transaction.
    await deactivateUserWithAudit({ userId, deactivatedBy: user.id });

    revalidatePath("/gestione/utenti");
    return { success: true as const };
  } catch (err) {
    return mapActionError(err, "Failed to deactivate user:");
  }
}

export async function sendPasswordResetAction(formData: unknown) {
  const validation = sendPasswordResetSchema.safeParse(formData);
  if (!validation.success) {
    return { success: false as const, error: MSG.auth.invalidData };
  }

  const { userId } = validation.data;

  const auth = await authorizeAdmin();
  if (!auth.success) return { success: false as const, error: auth.error };
  const { user } = auth;

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
      { redirectTo: `${origin}/reimposta-password` },
    );

    if (error) {
      const msg =
        error.status === 429
          ? MSG.auth.rateLimitExceeded
          : MSG.auth.genericError;
      return { success: false as const, error: msg };
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
