"use server";

import { z } from "zod";
import { getConfigurationWithTanksAndBays, getUserData } from "@/db/queries";
import { transformDbNullToUndefined } from "@/db/transformations";
import { MSG } from "@/lib/messages";
import { configSchema } from "@/validation/config-schema";
import { washBaySchema } from "@/validation/wash-bay-schema";
import { waterTankSchema } from "@/validation/water-tank-schema";

export const checkConfigurationValidityAction = async (sourceId: unknown) => {
  // 1. Input validation
  const parsed = z.number().int().positive().safeParse(sourceId);
  if (!parsed.success) {
    return { success: false as const, error: MSG.config.notFound };
  }

  // 2. Auth
  const user = await getUserData();
  if (!user) {
    return { success: false as const, error: MSG.auth.userNotAuthenticated };
  }

  // 3. Fetch source — enforces SALES-sees-own read permission (same as duplicate action)
  const source = await getConfigurationWithTanksAndBays(parsed.data, user);
  if (!source) {
    return { success: false as const, error: MSG.config.notFound };
  }

  // 4. Validate each artifact exactly as the edit page does per-form.
  //    safeParse never throws — returns a discriminated union.
  const { water_tanks, wash_bays, ...config } = source;

  const configValid = configSchema.safeParse(
    transformDbNullToUndefined(config),
  ).success;
  const tanksValid = water_tanks.every(
    (t) => waterTankSchema.safeParse(transformDbNullToUndefined(t)).success,
  );
  const baysValid = wash_bays.every(
    (b) => washBaySchema.safeParse(transformDbNullToUndefined(b)).success,
  );

  return {
    success: true as const,
    hasValidationIssues: !configValid || !tanksValid || !baysValid,
  };
};
