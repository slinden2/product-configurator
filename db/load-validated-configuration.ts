import { getConfigurationWithTanksAndBays, type UserData } from "@/db/queries";
import { transformDbNullToUndefined } from "@/db/transformations";
import type { ConfigurationStatusType } from "@/types";
import {
  type UpdateConfigSchema,
  updateConfigSchema,
} from "@/validation/config-schema";
import {
  type UpdateWashBaySchema,
  updateWashBaySchema,
} from "@/validation/wash-bay-schema";
import {
  type UpdateWaterTankSchema,
  updateWaterTankSchema,
} from "@/validation/water-tank-schema";

export interface ValidatedConfiguration {
  configuration: UpdateConfigSchema;
  /** DB-only lifecycle status (not part of the validated config schema). */
  status: ConfigurationStatusType;
  waterTanks: UpdateWaterTankSchema[];
  washBays: UpdateWashBaySchema[];
}

/**
 * Loads a configuration with its sub-records and parses everything through the
 * Zod schemas. Uses `safeParse` so stale enum values or removed fields don't
 * crash the page — invalid data passes through as-is (the edit form flags it in
 * red on mount; the read-only view simply renders the raw value).
 *
 * Shared by the edit page and the read-only view page so the parsing/fallback
 * behaviour stays identical across both surfaces. Returns null when the config
 * is not found or not accessible to the user (RLS).
 */
export async function loadValidatedConfiguration(
  id: number,
  user: NonNullable<UserData>,
): Promise<ValidatedConfiguration | null> {
  const configurationData = await getConfigurationWithTanksAndBays(id, user);
  if (!configurationData) return null;

  const { water_tanks, wash_bays, ...configuration } = configurationData;

  const transformedConfiguration = transformDbNullToUndefined(configuration);
  const parsedConfig = updateConfigSchema.safeParse(transformedConfiguration);
  const validatedConfiguration: UpdateConfigSchema = parsedConfig.success
    ? parsedConfig.data
    : (transformedConfiguration as unknown as UpdateConfigSchema);

  const waterTanks: UpdateWaterTankSchema[] = water_tanks.map((wt) => {
    const raw = transformDbNullToUndefined(wt);
    const parsed = updateWaterTankSchema.safeParse(raw);
    return parsed.success
      ? parsed.data
      : (raw as unknown as UpdateWaterTankSchema);
  });

  const washBays: UpdateWashBaySchema[] = wash_bays.map((wb) => {
    const raw = transformDbNullToUndefined(wb);
    const parsed = updateWashBaySchema.safeParse(raw);
    return parsed.success
      ? parsed.data
      : (raw as unknown as UpdateWashBaySchema);
  });

  return {
    configuration: validatedConfiguration,
    status: configuration.status,
    waterTanks,
    washBays,
  };
}
