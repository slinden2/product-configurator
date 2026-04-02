"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/db";
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
  newPassWordSchema,
  signupSchema,
} from "@/validation/auth-schema";

export async function getUserSession() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    return null;
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

  if (data.user?.identities?.length === 0) {
    return {
      success: false as const,
      error: MSG.auth.emailAlreadyRegistered,
    };
  }

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
      await db.insert(userProfiles).values({
        id: data.user.id,
        email: credentials.email,
        role: "SALES",
        last_login_at: new Date(),
      });
    } else {
      await db
        .update(userProfiles)
        .set({ last_login_at: new Date() })
        .where(eq(userProfiles.id, data.user.id));
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
    redirect("/error");
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
      redirectTo: `${origin}/resetta-password`,
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

  const parsed = newPassWordSchema.safeParse(formData);
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

  return { success: true as const };
}
