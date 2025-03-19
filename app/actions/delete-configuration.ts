"use server";

import { db } from "@/db";
import { getUserData } from "@/db/queries";
import { configurations } from "@/db/schemas";
import { eq } from "drizzle-orm";

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
