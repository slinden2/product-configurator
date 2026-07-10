import type { z } from "zod";
import { db } from "@/db";
import {
  type DatabaseType,
  getConfigurationWithTanksAndBays,
  type TransactionType,
  type UserData,
} from "@/db/queries";
import { transformDbNullToUndefined } from "@/db/transformations";
import type { ConfigOrigin, ConfigurationStatusType } from "@/types";
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
  /** DB-only lifecycle discriminator (STANDALONE vs OFFER), drives editability. */
  origin: ConfigOrigin;
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
 *
 * Pass `txOrDb` to read inside a transaction — required when the snapshot must
 * be consistent with a lock already held (e.g. the acceptance as-sold freeze).
 */
export async function loadValidatedConfiguration(
  id: number,
  user: NonNullable<UserData>,
  txOrDb: DatabaseType | TransactionType = db,
): Promise<ValidatedConfiguration | null> {
  const configurationData = await getConfigurationWithTanksAndBays(
    id,
    user,
    txOrDb,
  );
  if (!configurationData) return null;

  const { water_tanks, wash_bays, ...configuration } = configurationData;

  const validatedConfiguration = parseOrRaw(
    updateConfigSchema,
    transformDbNullToUndefined(configuration),
  );
  const waterTanks = water_tanks.map((wt) =>
    parseOrRaw(updateWaterTankSchema, transformDbNullToUndefined(wt)),
  );
  const washBays = wash_bays.map((wb) =>
    parseOrRaw(updateWashBaySchema, transformDbNullToUndefined(wb)),
  );

  return {
    configuration: validatedConfiguration,
    status: configuration.status,
    origin: configuration.origin,
    waterTanks,
    washBays,
  };
}

/**
 * Parses `raw` with `schema`, falling back to the raw value (cast to the schema
 * type) when validation fails. This makes the fallback policy explicit and
 * single-source: stale enum values / removed fields are surfaced as-is rather
 * than crashing the page.
 */
function parseOrRaw<T>(schema: z.ZodType<T>, raw: unknown): T {
  const result = schema.safeParse(raw);
  return result.success ? result.data : (raw as T);
}
