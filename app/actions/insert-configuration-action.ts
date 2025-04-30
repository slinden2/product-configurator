"use server";

import { getUserData, insertConfiguration, QueryError } from "@/db/queries";
import { configSchema } from "@/validation/config-schema";
import { revalidatePath } from "next/cache";
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
    const newConfig = await insertConfiguration(validation.data);
    revalidatePath("/configurations");
    return { success: true, id: newConfig.id };
  } catch (err) {
    if (err instanceof QueryError || err instanceof DatabaseError) {
      throw err;
    }

    throw new Error("Unknown Error.");
  }
};
