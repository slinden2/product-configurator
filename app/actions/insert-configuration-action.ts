"use server";

import {
  getConfigurationWithTanksAndBays,
  getUserData,
  insertConfiguration,
  QueryError,
  updateConfiguration,
} from "@/db/queries";
import { configSchema } from "@/validation/config-schema";
import { DatabaseError } from "pg";

export const insertConfigurationAction = async (formData: unknown) => {
  const validation = configSchema.safeParse(formData);

  if (!validation.success) {
    throw new Error(validation.error?.message);
  }

  const user = await getUserData();

  if (!user) {
    throw new Error("User not found.");
  }

  try {
    await insertConfiguration(validation.data);
  } catch (err) {
    if (err instanceof QueryError || err instanceof DatabaseError) {
      throw new Error(err.message);
    }

    throw new Error("Unknown Error.");
  }
};
