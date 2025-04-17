"use server";

import { db } from "@/db";
import { getConfiguration, getUserData } from "@/db/queries";
import { waterTanks } from "@/db/schemas";
import { and, eq } from "drizzle-orm";

export const deleteWaterTankAction = async (confId: number, tankId: number) => {
  const user = await getUserData();

  if (!user) {
    return { success: false, error: "User not found." };
  }

  const configuration = await getConfiguration(confId);

  if (!configuration) {
    return { success: false, error: "Configuration not found." };
  }

  if (user.id !== configuration.user_id && user.role !== "ADMIN") {
    return { success: false, error: "Unauthorized." };
  }

  try {
    await db
      .delete(waterTanks)
      .where(
        and(eq(waterTanks.id, tankId), eq(waterTanks.configuration_id, confId))
      );
    return { success: true };
  } catch (error) {
    console.error("Failed to delete water tank:", error);
    return { success: false, error: "Failed to delete water tank." };
  }
};
