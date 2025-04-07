"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function redirectTo(path: string) {
  if (!path.startsWith("/")) {
    return { message: "Invalid path" };
  }

  revalidatePath(path);
  redirect(path);
}
