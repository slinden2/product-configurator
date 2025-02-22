"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/utils/supabase/server";
import { headers } from "next/headers";
import { LoginFormData, SignupFormData } from "@/validation/authSchema";
import { db } from "@/db";
import { eq } from "drizzle-orm";
import { userProfiles } from "@/db/schemas";

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
      const test = await db
        .insert(userProfiles)
        .values({
          id: data.user.id,
          email: credentials.email,
        })
        .returning({ id: userProfiles.id });
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
