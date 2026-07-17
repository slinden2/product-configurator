import { and, asc, desc, eq, inArray, or, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  type ConfigurationWithWaterTanksAndWashBays,
  configurations,
  type NewConfiguration,
  type NewWashBay,
  type NewWaterTank,
  offerRevisionLines,
  offerRevisions,
  offers,
  userProfiles,
  washBays,
  waterTanks,
} from "@/db/schemas";
import { canAccessAllConfigs } from "@/lib/access";
import { BOM } from "@/lib/BOM";
import { hasQualifyingEnergyChainBay } from "@/lib/configuration/energy-chain";
import { MSG } from "@/lib/messages";
import { canTransition, getTransitionDirection } from "@/lib/status-config";
import type { ConfigOrigin, ConfigurationStatusType } from "@/types";
import { HANDED_OFF_STATUSES, PRE_HANDOFF_STATUSES } from "@/types";
import type {
  ConfigSchema,
  UpdateConfigSchema,
} from "@/validation/config-schema";
import type { ConfigStatusSchema } from "@/validation/config-status-schema";
import type { WashBaySchema } from "@/validation/wash-bay-schema";
import type { WaterTankSchema } from "@/validation/water-tank-schema";
import {
  transformConfigToDbInsert,
  transformConfigToDbUpdate,
  transformWashBaySchemaToDbData,
  transformWaterTankSchemaToDbData,
} from "../transformations";
import { hasEngineeringBom } from "./ebom";
import { type DatabaseType, QueryError, type TransactionType } from "./errors";
import type { UserData } from "./users";

export type AllConfigurations = Awaited<
  ReturnType<typeof getUserConfigurations>
>["data"];

/**
 * Builds the WHERE fragment that scopes a configuration list/count to what the
 * given user may see. Returns `undefined` for "see everything" so it composes
 * with an absent filter.
 * - SALES: own configurations only.
 * - SALES_MANAGER: own + direct reports' configurations.
 * - SALES_DIRECTOR/ENGINEER/ADMIN: all configurations.
 */
export function configScopeWhere(user: NonNullable<UserData>) {
  // All-access roles (ADMIN/ENGINEER/SALES_DIRECTOR) see everything.
  if (canAccessAllConfigs(user.role)) {
    return undefined;
  }

  if (user.role === "SALES") {
    return eq(configurations.user_id, user.id);
  }

  if (user.role === "SALES_MANAGER") {
    return inArray(
      configurations.user_id,
      db
        .select({ id: userProfiles.id })
        .from(userProfiles)
        .where(
          or(
            // Defense-in-depth: a direct report only counts while it is still a
            // SALES profile, so a stale manager_id on a non-SALES user never
            // leaks that user's configs into this manager's scope.
            and(
              eq(userProfiles.manager_id, user.id),
              eq(userProfiles.role, "SALES"),
            ),
            eq(userProfiles.id, user.id),
          ),
        ),
    );
  }

  // Any unrecognized role fails closed: match no rows rather than all rows.
  return sql`false`;
}

/**
 * Single-record access decision used once a configuration row (with its owner's
 * user_id) is in hand. Mirrors {@link configScopeWhere} for one record.
 *
 * Pass `txOrDb` when calling inside a transaction so the SALES_MANAGER report
 * lookup stays on the transaction's connection — a pooled read while the caller
 * holds a row lock risks a pool deadlock under saturation.
 */
export async function canAccessConfiguration(
  user: NonNullable<UserData>,
  config: {
    user_id: string;
    origin: ConfigOrigin;
    status: ConfigurationStatusType;
  },
  txOrDb: DatabaseType | TransactionType = db,
): Promise<boolean> {
  // ENGINEER has no offer access: a pre-handoff OFFER config (DRAFT)
  // belongs to the sales workflow and is invisible to engineers, even by direct URL.
  // Checked before the all-access shortcut since ENGINEER is otherwise all-access.
  // Once handed off (SALES_APPROVED+) the engineer picks it up like any config.
  if (
    user.role === "ENGINEER" &&
    config.origin === "OFFER" &&
    PRE_HANDOFF_STATUSES.includes(config.status)
  ) {
    return false;
  }

  // All-access roles (ADMIN/ENGINEER/SALES_DIRECTOR) see every configuration.
  if (canAccessAllConfigs(user.role)) {
    return true;
  }
  if (config.user_id === user.id) {
    return true;
  }
  // SALES_MANAGER: in scope only if the config owner reports to this manager.
  // Mirrors configScopeWhere — the `role = SALES` filter is the same
  // defense-in-depth guard against a stale manager_id on a non-SALES profile.
  if (user.role === "SALES_MANAGER") {
    const report = await txOrDb.query.userProfiles.findFirst({
      where: and(
        eq(userProfiles.id, config.user_id),
        eq(userProfiles.manager_id, user.id),
        eq(userProfiles.role, "SALES"),
      ),
      columns: { id: true },
    });
    return !!report;
  }
  // SALES (and any unrecognized role) fail closed: own configs only.
  return false;
}

// Builds the engineer/admin "Technical" config queue: every STANDALONE config
// (all statuses) plus OFFER-origin configs that have been handed off to
// engineering (`SALES_APPROVED`+). Pre-handoff offer configs (`DRAFT`)
// stay in the sales workflow and never surface here.
// Visibility is further scoped per role via `configScopeWhere`.
export async function getUserConfigurations(
  user: NonNullable<UserData>,
  page: number = 1,
  pageSize: number = 20,
  statusFilter?: ConfigurationStatusType,
) {
  const scopeWhere = configScopeWhere(user);
  const technicalQueueWhere = or(
    eq(configurations.origin, "STANDALONE"),
    and(
      eq(configurations.origin, "OFFER"),
      inArray(configurations.status, HANDED_OFF_STATUSES),
    ),
  );
  const whereClause = and(
    scopeWhere,
    technicalQueueWhere,
    statusFilter ? eq(configurations.status, statusFilter) : undefined,
  );

  const [rows, countResult] = await Promise.all([
    db.query.configurations.findMany({
      where: whereClause,
      columns: {
        id: true,
        status: true,
        name: true,
        description: true,
        origin: true,
        created_at: true,
        updated_at: true,
      },
      with: {
        user: {
          columns: {
            id: true,
            email: true,
            initials: true,
          },
        },
      },
      orderBy: [desc(configurations.updated_at)],
      limit: pageSize,
      offset: (page - 1) * pageSize,
    }),
    db
      .select({ count: sql<number>`count(*)` })
      .from(configurations)
      .where(whereClause),
  ]);

  const data = await resolveConfigurationClientNames(rows);

  return { data, totalCount: Number(countResult[0].count) };
}

/**
 * Resolves the customer displayed for a configuration. The offer header is the
 * authoritative source for OFFER rows; `configurations.name` remains required
 * and authoritative only for STANDALONE rows. For OFFER rows that column is a
 * compatibility shadow and is never the display source.
 */
export async function resolveConfigurationClientName(
  configuration: { id: number; name: string; origin: ConfigOrigin },
  txOrDb: DatabaseType | TransactionType = db,
): Promise<string> {
  if (configuration.origin !== "OFFER") {
    return configuration.name;
  }

  const [row] = await txOrDb
    .select({ customerName: offers.customer_name })
    .from(offerRevisionLines)
    .innerJoin(
      offerRevisions,
      eq(offerRevisionLines.offer_revision_id, offerRevisions.id),
    )
    .innerJoin(offers, eq(offerRevisions.offer_id, offers.id))
    .where(eq(offerRevisionLines.configuration_id, configuration.id))
    .orderBy(desc(offerRevisions.revision_no))
    .limit(1);

  return row?.customerName ?? configuration.name;
}

/**
 * Batch equivalent of {@link resolveConfigurationClientName} for list loads.
 * Resolves every OFFER row in one query and preserves the input row shape and
 * order. A missing offer line falls back to the compatibility shadow name.
 */
export async function resolveConfigurationClientNames<
  T extends { id: number; name: string; origin: ConfigOrigin },
>(
  configurationsToResolve: T[],
  txOrDb: DatabaseType | TransactionType = db,
): Promise<T[]> {
  const offerConfigurationIds = configurationsToResolve
    .filter((configuration) => configuration.origin === "OFFER")
    .map((configuration) => configuration.id);

  if (offerConfigurationIds.length === 0) {
    return configurationsToResolve;
  }

  const rows = await txOrDb
    .select({
      configurationId: offerRevisionLines.configuration_id,
      customerName: offers.customer_name,
    })
    .from(offerRevisionLines)
    .innerJoin(
      offerRevisions,
      eq(offerRevisionLines.offer_revision_id, offerRevisions.id),
    )
    .innerJoin(offers, eq(offerRevisions.offer_id, offers.id))
    .where(inArray(offerRevisionLines.configuration_id, offerConfigurationIds))
    .orderBy(desc(offerRevisions.revision_no));

  const customerNameByConfigurationId = new Map<number, string>();
  for (const row of rows) {
    if (!customerNameByConfigurationId.has(row.configurationId)) {
      customerNameByConfigurationId.set(row.configurationId, row.customerName);
    }
  }

  return configurationsToResolve.map((configuration) => ({
    ...configuration,
    name:
      customerNameByConfigurationId.get(configuration.id) ?? configuration.name,
  }));
}

export async function getConfigurationWithTanksAndBays(
  id: number,
  user: NonNullable<UserData>,
  txOrDb: DatabaseType | TransactionType = db,
) {
  const response = await txOrDb.query.configurations.findFirst({
    where: eq(configurations.id, id),
    with: {
      water_tanks: {
        orderBy: [asc(waterTanks.id)],
      },
      wash_bays: {
        orderBy: [asc(washBays.id)],
      },
    },
  });

  // Scope check: SALES sees own, SALES_MANAGER sees own + reports, others see all
  if (response && !(await canAccessConfiguration(user, response, txOrDb))) {
    return null;
  }

  return response
    ? {
        ...response,
        name: await resolveConfigurationClientName(response, txOrDb),
      }
    : response;
}

export async function getConfiguration(
  id: number,
  txOrDb: DatabaseType | TransactionType = db,
) {
  const response = await txOrDb.query.configurations.findFirst({
    where: eq(configurations.id, id),
  });
  return response
    ? {
        ...response,
        name: await resolveConfigurationClientName(response, txOrDb),
      }
    : response;
}

export async function getWashBaysByConfigId(
  configId: number,
  txOrDb: DatabaseType | TransactionType = db,
) {
  return txOrDb.query.washBays.findMany({
    where: eq(washBays.configuration_id, configId),
    columns: { id: true, has_gantry: true, energy_chain_width: true },
  });
}

/**
 * Minimal load of configs + bay energy-chain fields for the ENERGY_CHAIN
 * cross-entity invariant check on offer revision submission.
 */
export async function getConfigsForEnergyChainCheck(
  configIds: number[],
  txOrDb: DatabaseType | TransactionType = db,
) {
  if (configIds.length === 0) return [];
  const rows = await txOrDb.query.configurations.findMany({
    where: inArray(configurations.id, configIds),
    columns: { id: true, name: true, origin: true, supply_type: true },
    with: {
      wash_bays: {
        columns: { has_gantry: true, energy_chain_width: true },
      },
    },
  });
  return resolveConfigurationClientNames(rows, txOrDb);
}

export const insertConfiguration = async (
  newConfiguration: ConfigSchema,
  userId: string,
  origin: ConfigOrigin = "STANDALONE",
  txOrDb: DatabaseType | TransactionType = db,
) => {
  const dbData = transformConfigToDbInsert(newConfiguration, userId);

  const [insertedConfiguration] = await txOrDb
    .insert(configurations)
    .values({ ...dbData, origin })
    .returning({ id: configurations.id });

  if (!insertedConfiguration) {
    throw new QueryError(MSG.config.createFailed);
  }

  return insertedConfiguration;
};

/**
 * Strips a configuration child row (water tank / wash bay) of its identity and
 * timestamps and re-points it at `newConfigId`, yielding an insert payload. Every
 * child table goes through this one contract, so the set of dropped columns can't
 * drift between them as new child tables are added.
 */
function repointChildRow<
  TRow extends {
    id: number;
    created_at: Date;
    updated_at: Date;
    configuration_id: number;
  },
>(row: TRow, newConfigId: number) {
  const {
    id: _id,
    created_at: _ca,
    updated_at: _ua,
    configuration_id: _cid,
    ...rest
  } = row;
  return { ...rest, configuration_id: newConfigId };
}

/**
 * Tx-capable deep-clone primitive: copies a configuration row plus all of its
 * water tanks and wash bays into brand-new rows, dropping ids/timestamps and the
 * children's `configuration_id` (re-pointed at the new config via
 * {@link repointChildRow}). The caller supplies the new owner, name and status.
 * Engineering BOM items and offer snapshots are deliberately NOT cloned — a fresh
 * config recomputes its BOM live.
 *
 * Shared by {@link duplicateConfigurationRecord} (user-facing duplicate) and
 * {@link createOfferRevisionFrom} (offer clone-forward).
 */
export const cloneConfigurationRows = async (
  source: ConfigurationWithWaterTanksAndWashBays,
  options: {
    userId: string;
    name: string;
    status: ConfigurationStatusType;
    origin?: ConfigOrigin;
  },
  tx: DatabaseType | TransactionType,
): Promise<{ id: number }> => {
  // `origin` stays in `...rest` only as a fail-safe default; both callers pin it
  // explicitly (clone-forward → OFFER, duplicate → STANDALONE).
  const {
    id: _id,
    created_at: _ca,
    updated_at: _ua,
    user_id: _uid,
    status: _s,
    water_tanks: _wt,
    wash_bays: _wb,
    ...rest
  } = source;

  const newConfigValues: NewConfiguration = {
    ...rest,
    user_id: options.userId,
    status: options.status,
    name: options.name.slice(0, 255),
    ...(options.origin ? { origin: options.origin } : {}),
  };

  const [newConfig] = await tx
    .insert(configurations)
    .values(newConfigValues)
    .returning({ id: configurations.id });

  if (!newConfig) {
    throw new QueryError(MSG.config.duplicateFailed);
  }

  if (source.water_tanks.length > 0) {
    const newTanks: NewWaterTank[] = source.water_tanks.map((t) =>
      repointChildRow(t, newConfig.id),
    );
    await tx.insert(waterTanks).values(newTanks);
  }

  if (source.wash_bays.length > 0) {
    const newBays: NewWashBay[] = source.wash_bays.map((b) =>
      repointChildRow(b, newConfig.id),
    );
    await tx.insert(washBays).values(newBays);
  }

  return newConfig;
};

export const duplicateConfigurationRecord = async (
  source: ConfigurationWithWaterTanksAndWashBays,
  newUserId: string,
): Promise<{ id: number }> => {
  return db.transaction(async (tx) =>
    cloneConfigurationRows(
      source,
      {
        userId: newUserId,
        name: `Copia di ${source.name}`,
        status: "DRAFT",
        // A duplicate is a fresh standalone technical copy, never an orphan
        // OFFER config outside any revision (#243).
        origin: "STANDALONE",
      },
      tx,
    ),
  );
};

export const deleteConfiguration = async (
  id: number,
  expectedStatus: ConfigurationStatusType,
  txOrDb: DatabaseType | TransactionType = db,
) => {
  const [deletedConfiguration] = await txOrDb
    .delete(configurations)
    .where(
      and(eq(configurations.id, id), eq(configurations.status, expectedStatus)),
    )
    .returning({ id: configurations.id });

  // The caller's pre-read already proved existence and scope, so a zero-row
  // delete means the status moved under us — a concurrency conflict (#240).
  if (!deletedConfiguration) {
    throw new QueryError(MSG.config.statusConflict);
  }
};

export const updateConfiguration = async (
  configId: number,
  configurationData: UpdateConfigSchema,
  expectedStatus: ConfigurationStatusType,
  txOrDb: DatabaseType | TransactionType = db,
): Promise<{ id: number }> => {
  const setData = transformConfigToDbUpdate(configurationData);

  const [updatedConfiguration] = await txOrDb
    .update(configurations)
    .set(setData)
    .where(
      and(
        eq(configurations.id, configId),
        eq(configurations.status, expectedStatus),
      ),
    )
    .returning({ id: configurations.id });

  // The caller's pre-read already proved existence and scope, so a zero-row
  // write means the status moved under us — a concurrency conflict, not
  // "not found" (#240).
  if (!updatedConfiguration) {
    throw new QueryError(MSG.config.statusConflict);
  }

  return updatedConfiguration;
};

export const touchConfigurationUpdatedAt = async (
  configId: number,
  expectedStatus: ConfigurationStatusType,
  txOrDb: DatabaseType | TransactionType = db,
) => {
  const [touchedConfiguration] = await txOrDb
    .update(configurations)
    .set({ updated_at: new Date() })
    .where(
      and(
        eq(configurations.id, configId),
        eq(configurations.status, expectedStatus),
      ),
    )
    .returning({ id: configurations.id });

  // Sub-record queryFns only touch child tables, so this conditional touch is
  // the status compare-and-swap for the whole sub-record path (#240).
  if (!touchedConfiguration) {
    throw new QueryError(MSG.config.statusConflict);
  }
};

// In-tx status guard for writes that never touch the configurations table
// (e.g. engineering BOM items) and so cannot compare-and-swap via their own
// WHERE clause. FOR UPDATE serializes against a concurrent updateConfigStatus:
// either its transition committed first (the WHERE misses → 409) or its UPDATE
// blocks on this row lock until our transaction commits (#240).
export const assertConfigurationStatus = async (
  configId: number,
  expectedStatus: ConfigurationStatusType,
  tx: TransactionType,
) => {
  const [row] = await tx
    .select({ id: configurations.id })
    .from(configurations)
    .where(
      and(
        eq(configurations.id, configId),
        eq(configurations.status, expectedStatus),
      ),
    )
    .for("update");

  if (!row) {
    throw new QueryError(MSG.config.statusConflict);
  }
};

export const updateConfigStatus = async (
  configId: number,
  user: NonNullable<UserData>,
  statusData: ConfigStatusSchema,
  txOrDb: DatabaseType | TransactionType = db,
) => {
  const configuration = await getConfiguration(configId, txOrDb);

  if (!configuration) {
    throw new QueryError(MSG.config.notFound);
  }

  // Access must be checked before any state-dependent response, or an
  // out-of-scope caller could probe a config's current status via 400-vs-403.
  if (!(await canAccessConfiguration(user, configuration))) {
    throw new QueryError(MSG.auth.userUnauthorized);
  }

  if (configuration.status === statusData.status) {
    throw new QueryError(MSG.config.statusAlreadyUpdated);
  }

  if (
    !canTransition(
      user.role,
      configuration.status,
      statusData.status,
      configuration.origin,
    )
  ) {
    throw new QueryError(MSG.config.statusUnauthorized);
  }

  if (statusData.status === "TECH_APPROVED") {
    const bomExists = await hasEngineeringBom(configId, txOrDb);
    if (!bomExists) {
      throw new QueryError(MSG.config.approvedRequiresBom);
    }
  }

  // Cross-entity validation: ENERGY_CHAIN requires at least one wash bay with gantry + width
  if (
    configuration.supply_type === "ENERGY_CHAIN" &&
    getTransitionDirection(
      configuration.status as ConfigurationStatusType,
      statusData.status,
    ) === "forward"
  ) {
    const bays = await getWashBaysByConfigId(configId, txOrDb);
    if (!hasQualifyingEnergyChainBay(bays)) {
      throw new QueryError(MSG.config.energyChainRequiresGantry);
    }
  }

  const fromStatus = configuration.status;

  const [response] = await txOrDb
    .update(configurations)
    .set({ status: statusData.status })
    .where(
      and(
        eq(configurations.id, configId),
        eq(configurations.status, fromStatus),
      ),
    )
    .returning({ id: configurations.id });

  // The pre-read already proved the row exists and is authorized, so a zero-row
  // write means the status moved under us — a concurrency conflict, not "not found".
  if (!response) {
    throw new QueryError(MSG.config.statusConflict);
  }

  return { id: response.id, fromStatus, origin: configuration.origin };
};

export const getWaterTankById = async (
  configId: number,
  waterTankId: number,
  txOrDb: DatabaseType | TransactionType = db,
) => {
  const [tank] = await txOrDb
    .select()
    .from(waterTanks)
    .where(
      and(
        eq(waterTanks.id, waterTankId),
        eq(waterTanks.configuration_id, configId),
      ),
    );

  return tank;
};

export const insertWaterTank = async (
  configId: number,
  newWaterTank: WaterTankSchema,
  txOrDb: DatabaseType | TransactionType = db,
) => {
  const dbData = transformWaterTankSchemaToDbData(newWaterTank);

  const [inserted] = await txOrDb
    .insert(waterTanks)
    .values({ ...dbData, configuration_id: configId })
    .returning({ id: waterTanks.id });

  if (!inserted) {
    throw new QueryError(MSG.db.error);
  }

  return inserted;
};

export const updateWaterTank = async (
  configId: number,
  waterTankId: number,
  waterTank: WaterTankSchema,
  txOrDb: DatabaseType | TransactionType = db,
) => {
  const dbData = transformWaterTankSchemaToDbData(waterTank);

  const [updated] = await txOrDb
    .update(waterTanks)
    .set(dbData)
    .where(
      and(
        eq(waterTanks.id, waterTankId),
        eq(waterTanks.configuration_id, configId),
      ),
    )
    .returning({ id: waterTanks.id });

  if (!updated) {
    throw new QueryError(MSG.config.subRecordNotFound);
  }

  return updated;
};

export const deleteWaterTank = async (
  configId: number,
  waterTankId: number,
  txOrDb: DatabaseType | TransactionType = db,
) => {
  const [deleted] = await txOrDb
    .delete(waterTanks)
    .where(
      and(
        eq(waterTanks.id, waterTankId),
        eq(waterTanks.configuration_id, configId),
      ),
    )
    .returning({ id: waterTanks.id });

  if (!deleted) {
    throw new QueryError(MSG.config.subRecordNotFound);
  }

  return deleted;
};

export const getWashBayById = async (
  configId: number,
  washBayId: number,
  txOrDb: DatabaseType | TransactionType = db,
) => {
  const [bay] = await txOrDb
    .select()
    .from(washBays)
    .where(
      and(eq(washBays.id, washBayId), eq(washBays.configuration_id, configId)),
    );

  return bay;
};

export const insertWashBay = async (
  configId: number,
  newWashBay: WashBaySchema,
  txOrDb: DatabaseType | TransactionType = db,
) => {
  const dbData = transformWashBaySchemaToDbData(newWashBay);

  const [inserted] = await txOrDb
    .insert(washBays)
    .values({ ...dbData, configuration_id: configId })
    .returning({ id: washBays.id });

  if (!inserted) {
    throw new QueryError(MSG.db.error);
  }

  return inserted;
};

export const updateWashBay = async (
  configId: number,
  washBayId: number,
  washBay: WashBaySchema,
  txOrDb: DatabaseType | TransactionType = db,
) => {
  const dbData = transformWashBaySchemaToDbData(washBay);

  const [updated] = await txOrDb
    .update(washBays)
    .set(dbData)
    .where(
      and(eq(washBays.id, washBayId), eq(washBays.configuration_id, configId)),
    )
    .returning({ id: washBays.id });

  if (!updated) {
    throw new QueryError(MSG.config.subRecordNotFound);
  }

  return updated;
};

export const deleteWashBay = async (
  configId: number,
  washBayId: number,
  txOrDb: DatabaseType | TransactionType = db,
) => {
  const [deleted] = await txOrDb
    .delete(washBays)
    .where(
      and(eq(washBays.id, washBayId), eq(washBays.configuration_id, configId)),
    )
    .returning({ id: washBays.id });

  if (!deleted) {
    throw new QueryError(MSG.config.subRecordNotFound);
  }

  return deleted;
};

export async function getBOM(id: number, user: NonNullable<UserData>) {
  const configuration = await getConfigurationWithTanksAndBays(id, user);
  if (!configuration) return null;
  return BOM.init(configuration);
}

export async function resetWashBayEnergyChainFields(
  configurationId: number,
  txOrDb: DatabaseType | TransactionType = db,
) {
  await txOrDb
    .update(washBays)
    .set({
      energy_chain_width: null,
      has_shelf_extension: false,
      ec_signal_cable_qty: null,
      ec_profinet_cable_qty: null,
      ec_water_1_tube_qty: null,
      ec_water_34_tube_qty: null,
      ec_r1_1_tube_qty: null,
      ec_r2_1_tube_qty: null,
      ec_r2_34_inox_tube_qty: null,
      ec_air_tube_qty: null,
    })
    .where(eq(washBays.configuration_id, configurationId));
}

export async function resetWashBayNonEnergyChainFields(
  configurationId: number,
  txOrDb: DatabaseType | TransactionType = db,
) {
  await txOrDb
    .update(washBays)
    .set({
      hp_lance_qty: 0,
      det_lance_qty: 0,
      pressure_washer_type: null,
      pressure_washer_qty: null,
      is_first_bay: false,
      has_bay_dividers: false,
      has_weeping_lances: false,
      hose_reel_hp_with_post_qty: 0,
      hose_reel_hp_without_post_qty: 0,
      hose_reel_det_with_post_qty: 0,
      hose_reel_det_without_post_qty: 0,
      hose_reel_hp_det_with_post_qty: 0,
    })
    .where(eq(washBays.configuration_id, configurationId));
}

export async function getConfigurationStatusCounts(
  user: NonNullable<UserData>,
) {
  const whereClause = configScopeWhere(user);

  const result = await db
    .select({
      status: configurations.status,
      count: sql<number>`count(*)::int`,
    })
    .from(configurations)
    .where(whereClause)
    .groupBy(configurations.status);

  return result;
}

export async function getConfigIntakeCount(
  user: NonNullable<UserData>,
): Promise<{ count: number; oldestDate: Date | null }> {
  const scopeWhere = configScopeWhere(user);
  const whereClause = and(
    scopeWhere,
    eq(configurations.origin, "OFFER"),
    eq(configurations.status, "SALES_APPROVED"),
  );

  const [row] = await db
    .select({
      count: sql<number>`count(*)::int`,
      oldestDate: sql<Date | null>`min(${configurations.updated_at})`,
    })
    .from(configurations)
    .where(whereClause);

  return { count: row.count, oldestDate: row.oldestDate };
}

export async function getConfigTechnicalQueueCounts(
  user: NonNullable<UserData>,
) {
  const scopeWhere = configScopeWhere(user);
  const technicalQueueWhere = or(
    eq(configurations.origin, "STANDALONE"),
    and(
      eq(configurations.origin, "OFFER"),
      inArray(configurations.status, HANDED_OFF_STATUSES),
    ),
  );
  const whereClause = and(scopeWhere, technicalQueueWhere);

  return db
    .select({
      status: configurations.status,
      count: sql<number>`count(*)::int`,
    })
    .from(configurations)
    .where(whereClause)
    .groupBy(configurations.status);
}
