"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/utils/supabase/server";
import { headers } from "next/headers";
import {
  AuthFormData,
  LoginFormData,
  NewPassWordFormData,
  SignupFormData,
} from "@/validation/authSchema";
import { db } from "@/db";
import { eq } from "drizzle-orm";
import { userProfiles } from "@/db/schemas";

export async function getUserSession() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    return null;
  }

  return {
    status: "success",
    user: data?.user,
  };
}

export async function signUp(formData: SignupFormData) {
  const supabase = await createClient();

  const credentials = {
    email: formData.email,
    password: formData.password,
  };

  const { error, data } = await supabase.auth.signUp(credentials);

  if (error) {
    console.error(error);
    return {
      status: error.message,
      user: null,
    };
  } else if (data.user?.identities?.length === 0) {
    return {
      status:
        "Utente con questo indirizzo email già registrato. Effettua il login per proseguire.",
      user: null,
    };
  }

  revalidatePath("/", "layout");

  return {
    status: "success",
    user: data.user,
  };
}

export async function signIn(formData: LoginFormData) {
  const supabase = await createClient();

  const credentials = {
    email: formData.email,
    password: formData.password,
  };

  const { error, data } = await supabase.auth.signInWithPassword(credentials);

  if (error) {
    return {
      status: error.message,
      user: null,
    };
  }

  try {
    const existingUser = await db.query.userProfiles.findFirst({
      where: eq(userProfiles.email, credentials.email),
    });

    if (!existingUser) {
      await db.insert(userProfiles).values({
        id: data.user.id,
        email: credentials.email,
        role: "EXTERNAL",
      });
    }
  } catch (err) {
    console.error(err);
    if (err instanceof Error) {
      return {
        status: err.message,
        user: null,
      };
    }
  }

  revalidatePath("/", "layout");

  return {
    status: "success",
    user: data.user,
  };
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

export async function forgotPassword(formData: AuthFormData) {
  const supabase = await createClient();
  const origin = (await headers()).get("origin");

  const { error } = await supabase.auth.resetPasswordForEmail(formData.email, {
    redirectTo: `${origin}/resetta-password`,
  });

  if (error) {
    return {
      status: error.message,
      user: null,
    };
  }

  return {
    status: "success",
  };
}

export async function resetPassword(
  formData: NewPassWordFormData,
  code: string | null
) {
  if (!code) {
    return {
      status: "Codice mancante",
    };
  }

  const supabase = await createClient();
  const { error: codeError } = await supabase.auth.exchangeCodeForSession(code);

  if (codeError) {
    return {
      status: codeError.message,
    };
  }

  const { error } = await supabase.auth.updateUser({
    password: formData.password,
  });

  if (error) {
    return {
      status: error.message,
    };
  }

  return { status: "success" };
}
