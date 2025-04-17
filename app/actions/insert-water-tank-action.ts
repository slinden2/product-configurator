"use server";

import { getUserData, insertWaterTank, QueryError } from "@/db/queries";
import { waterTankSchema } from "@/validation/water-tank-schema";
import { DatabaseError } from "pg";

export const insertWaterTankAction = async (
  confId: number,
  formData: unknown
) => {
  const validation = waterTankSchema.safeParse(formData);

  if (!validation.success) {
    throw new Error(validation.error?.message);
  }

  const user = await getUserData();

  if (!user) {
    throw new Error("User not found.");
  }

  try {
    await insertWaterTank(confId, validation.data);
  } catch (err) {
    if (err instanceof QueryError || err instanceof DatabaseError) {
      throw new Error(err.message);
    }

    throw new Error("Unknown Error.");
  }
};
