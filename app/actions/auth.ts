"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { logActivity } from "@/db/queries";
import { userProfiles } from "@/db/schemas";
import { MSG } from "@/lib/messages";
import { createClient } from "@/utils/supabase/server";
import type {
  AuthSchema,
  LoginSchema,
  NewPasswordSchema,
  SignupSchema,
} from "@/validation/auth-schema";
import {
  authSchema,
  loginSchema,
  newPasswordSchema,
  signupSchema,
} from "@/validation/auth-schema";

export async function getUserSession() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    return { success: false as const, error: MSG.auth.genericError };
  }

  return {
    success: true as const,
    data: { user: data.user },
  };
}

export async function signUp(formData: SignupSchema) {
  const parsed = signupSchema.safeParse(formData);
  if (!parsed.success) {
    return { success: false as const, error: MSG.auth.invalidData };
  }

  const supabase = await createClient();

  const credentials = {
    email: parsed.data.email,
    password: parsed.data.password,
  };

  const { error, data } = await supabase.auth.signUp(credentials);

  if (error) {
    console.error(error);
    return { success: false as const, error: MSG.auth.genericError };
  }

  // NOTE: when the address is already registered, Supabase returns a fake user
  // with an empty identities array. Do NOT branch on it — the response must be
  // indistinguishable from a real signup to prevent account enumeration.

  revalidatePath("/", "layout");

  return { success: true as const, data: { user: data.user } };
}

export async function signIn(formData: LoginSchema) {
  const parsed = loginSchema.safeParse(formData);
  if (!parsed.success) {
    return { success: false as const, error: MSG.auth.invalidData };
  }

  const supabase = await createClient();

  const credentials = {
    email: parsed.data.email,
    password: parsed.data.password,
  };

  const { error, data } = await supabase.auth.signInWithPassword(credentials);

  if (error) {
    return { success: false as const, error: MSG.auth.genericError };
  }

  try {
    const existingUser = await db.query.userProfiles.findFirst({
      where: eq(userProfiles.email, credentials.email),
    });

    if (!existingUser) {
      // First login: provision an inactive profile. The user gets no session
      // until an ADMIN activates the account from the user management area.
      await db.insert(userProfiles).values({
        id: data.user.id,
        email: credentials.email,
        role: "SALES",
        is_active: false,
      });
      await logActivity({
        userId: data.user.id,
        action: "USER_PROFILE_CREATE",
        targetEntity: "user_profile",
        targetId: data.user.id,
        metadata: { email: credentials.email, initial_role: "SALES" },
      });
      await supabase.auth.signOut();
      return {
        success: false as const,
        error: MSG.auth.accountPendingActivation,
      };
    }

    if (!existingUser.is_active) {
      await supabase.auth.signOut();
      // deactivated_at distinguishes an admin-deactivated account from a
      // profile still waiting for its first activation.
      return {
        success: false as const,
        error: existingUser.deactivated_at
          ? MSG.auth.accountDeactivated
          : MSG.auth.accountPendingActivation,
      };
    }

    await db
      .update(userProfiles)
      .set({ last_login_at: new Date() })
      .where(eq(userProfiles.id, data.user.id));
  } catch (err) {
    console.error(err);
    return { success: false as const, error: MSG.db.error };
  }

  revalidatePath("/", "layout");

  return { success: true as const, data: { user: data.user } };
}

export async function signOut() {
  const supabase = await createClient();

  const { error } = await supabase.auth.signOut();

  if (error) {
    redirect("/errore");
  }

  revalidatePath("/", "layout");
  redirect("/login");
}

export async function forgotPassword(formData: AuthSchema) {
  const parsed = authSchema.safeParse(formData);
  if (!parsed.success) {
    return { success: false as const, error: MSG.auth.invalidData };
  }

  const supabase = await createClient();
  const origin = (await headers()).get("origin");

  const { error } = await supabase.auth.resetPasswordForEmail(
    parsed.data.email,
    {
      redirectTo: `${origin}/reimposta-password`,
    },
  );

  if (error) {
    return { success: false as const, error: MSG.auth.genericError };
  }

  return { success: true as const };
}

export async function resetPassword(
  formData: NewPasswordSchema,
  code: string | null,
) {
  if (!code) {
    return { success: false as const, error: MSG.auth.missingResetCode };
  }

  const parsed = newPasswordSchema.safeParse(formData);
  if (!parsed.success) {
    return { success: false as const, error: MSG.auth.invalidData };
  }

  const supabase = await createClient();
  const { error: codeError } = await supabase.auth.exchangeCodeForSession(code);

  if (codeError) {
    return { success: false as const, error: MSG.auth.genericError };
  }

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (error) {
    return { success: false as const, error: MSG.auth.genericError };
  }

  // exchangeCodeForSession above left the user authenticated. Drop that session
  // so the "/login" redirect on the client is honest: the user re-authenticates
  // with the new password instead of silently landing logged-in at home.
  await supabase.auth.signOut();

  return { success: true as const };
}
