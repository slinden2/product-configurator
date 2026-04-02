"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { DatabaseError } from "pg";
import { db } from "@/db";
import { getUserData, logActivity, QueryError } from "@/db/queries";
import { userProfiles } from "@/db/schemas";
import { MSG } from "@/lib/messages";
import { createClient } from "@/utils/supabase/server";
import {
  changeRoleSchema,
  sendPasswordResetSchema,
} from "@/validation/user-schema";

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
    await db
      .update(userProfiles)
      .set({ role: newRole })
      .where(eq(userProfiles.id, userId));

    await logActivity({
      userId: user.id,
      action: "ROLE_CHANGE",
      targetEntity: "user_profile",
      targetId: userId,
      metadata: { from_role: targetUser.role, to_role: newRole },
    });

    revalidatePath("/utenti");
    return { success: true as const };
  } catch (err) {
    console.error("Failed to change user role:", err);
    if (err instanceof QueryError) {
      return { success: false as const, error: err.message };
    }
    if (err instanceof DatabaseError) {
      return { success: false as const, error: MSG.db.error };
    }
    return { success: false as const, error: MSG.db.unknown };
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

    await logActivity({
      userId: user.id,
      action: "PASSWORD_RESET",
      targetEntity: "user_profile",
      targetId: userId,
    });

    return { success: true as const };
  } catch (err) {
    console.error("Failed to send password reset:", err);
    if (err instanceof QueryError) {
      return { success: false as const, error: err.message };
    }
    if (err instanceof DatabaseError) {
      return { success: false as const, error: MSG.db.error };
    }
    return { success: false as const, error: MSG.db.unknown };
  }
}
