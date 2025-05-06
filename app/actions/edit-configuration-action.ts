"use server";

import {
  getConfigurationWithTanksAndBays,
  getUserData,
  QueryError,
  updateConfiguration,
} from "@/db/queries";
import { configSchema } from "@/validation/config-schema";
import { DatabaseError } from "pg";

export const editConfigurationAction = async (
  confId: number,
  userId: string,
  formData: unknown
) => {
  const validation = configSchema.safeParse(formData);

  if (!validation.success) {
    throw new Error(validation.error?.message);
  }

  const user = await getUserData();

  if (!user) {
    throw new Error("User not found.");
  }

  if (user.id !== userId || user.role !== "ADMIN") {
    throw new Error("Unauthorized.");
  }

  const configuration = await getConfigurationWithTanksAndBays(confId);

  if (!configuration) {
    throw new Error("Configuration not found.");
  }

  try {
    await updateConfiguration(confId, { ...validation.data, user_id: userId });
  } catch (err) {
    if (err instanceof QueryError || err instanceof DatabaseError) {
      throw new Error(err.message);
    }

    throw new Error("Unknown Error.");
  }
};
