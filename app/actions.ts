"use server";

import { db } from "@/db";
import { getUserData } from "@/db/queries";
import { configurations } from "@/db/schemas";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function redirectTo(path: string) {
  if (!path.startsWith("/")) {
    return { message: "Invalid path" };
  }

  revalidatePath(path);
  redirect(path);
}

async function getUserConfigurations() {
  const { isAuthenticated } = getKindeServerSession();

  if (!(await isAuthenticated())) {
    return null;
  }

  const response = await db.query.configurations.findMany({
    where:
      user.role === "EXTERNAL"
        ? eq(configurations.user_id, user.id)
        : undefined,
    columns: {
      id: true,
      status: true,
      name: true,
      description: true,
      created_at: true,
      updated_at: true,
    },
    with: {
      user: {
        columns: {
          id: true,
          email: true,
          initials: true,
        },
      },
    },
    orderBy: [desc(configurations.updated_at)],
  });

  return response;
}

export const deleteConfiguration = async (id: number, userId: string) => {
  const user = await getUserData();

  if (!user) {
    return { success: false, error: "User not found." };
  }

  if (user.id !== userId && user.role !== "ADMIN") {
    return { success: false, error: "Unauthorized." };
  }

  try {
    await db.delete(configurations).where(eq(configurations.id, id));
    return { success: true };
  } catch (error) {
    console.error("Failed to delete configuration:", error);
    return { success: false, error: "Failed to delete configuration." };
  }
};
