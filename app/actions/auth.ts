"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { provisionUserProfileOnLogin } from "@/db/queries";
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
    const profile = await provisionUserProfileOnLogin(
      data.user.id,
      credentials.email,
    );

    if (!profile.is_active) {
      await supabase.auth.signOut();
      // deactivated_at distinguishes an admin-deactivated account from a
      // profile still waiting for its first activation (freshly provisioned
      // profiles come back with deactivated_at null → pending activation).
      return {
        success: false as const,
        error: profile.deactivated_at
          ? MSG.auth.accountDeactivated
          : MSG.auth.accountPendingActivation,
      };
    }
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
    const msg =
      error.status === 429 ? MSG.auth.rateLimitExceeded : MSG.auth.genericError;
    return { success: false as const, error: msg };
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
