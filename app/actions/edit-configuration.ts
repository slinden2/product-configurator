"use server";

import {
  getOneConfiguration,
  getUserData,
  QueryError,
  updateConfiguration,
} from "@/db/queries";
import { differenceInTwoArrays } from "@/lib/utils";
import { configSchema } from "@/validation/config-schema";
import { DatabaseError } from "pg";

export const editConfiguration = async (formData: unknown) => {
  const validation = configSchema.safeParse(formData);

  if (!validation.success) {
    throw new Error(validation.error?.message);
  }

  const user = await getUserData();

  if (!user) {
    throw new Error("User not found.");
  }

  if (user.id !== validation.data.user_id && user.role !== "ADMIN") {
    throw new Error("Unauthorized.");
  }

  const { water_tanks, wash_bays, ...configurationData } = validation.data;

  const configuration = await getOneConfiguration(validation.data.id);

  if (!configuration) {
    throw new Error("Configuration not found.");
  }

  const waterTankData = differenceInTwoArrays(
    configuration.water_tanks,
    validation.data.water_tanks
  );

  const washBayData = differenceInTwoArrays(
    configuration.wash_bays,
    validation.data.wash_bays
  );

  try {
    // await updateConfiguration(configurationData, waterTankData, washBayData);
  } catch (err) {
    if (err instanceof QueryError || err instanceof DatabaseError) {
      throw new Error(err.message);
    }

    throw new Error("Unknown Error.");
  }
};
