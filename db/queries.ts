import {
  and,
  asc,
  countDistinct,
  desc,
  eq,
  ilike,
  inArray,
  max,
  or,
  sql,
} from "drizzle-orm";
import { db } from "@/db";
import {
  activityLogs,
  bomLines,
  type ConfigurationWithWaterTanksAndWashBays,
  configurations,
  engineeringBomItems,
  type NewConfiguration,
  type NewEngineeringBomItem,
  type NewWashBay,
  type NewWaterTank,
  type OfferSnapshot,
  offerSnapshots,
  partNumbers,
  priceCoefficients,
  userProfiles,
  washBays,
  waterTanks,
} from "@/db/schemas";
import { BOM } from "@/lib/BOM";
import { MSG } from "@/lib/messages";
import type {
  ActivityAction,
  CoefficientSource,
  ConfigurationStatusType,
  Role,
} from "@/types";
import { createClient } from "@/utils/supabase/server";
import type {
  ConfigSchema,
  UpdateConfigSchema,
} from "@/validation/config-schema";
import type { ConfigStatusSchema } from "@/validation/config-status-schema";
import type { OfferSnapshotItem } from "@/validation/offer-schema";
import type { WashBaySchema } from "@/validation/wash-bay-schema";
import type { WaterTankSchema } from "@/validation/water-tank-schema";
import {
  transformConfigToDbInsert,
  transformConfigToDbUpdate,
  transformWashBaySchemaToDbData,
  transformWaterTankSchemaToDbData,
} from "./transformations";

export type DatabaseType = typeof db;
export type TransactionType = Parameters<
  Parameters<DatabaseType["transaction"]>[0]
>[0];

export type AllConfigurations = Awaited<
  ReturnType<typeof getUserConfigurations>
>["data"];

export type UserData = Awaited<ReturnType<typeof getUserData>>;

export class QueryError extends Error {
  errorCode: number;

  constructor(message: string, errorCode: number) {
    super(message);
    this.name = "QueryError";
    this.errorCode = errorCode;

    Object.setPrototypeOf(this, QueryError.prototype);
  }
}

export const getUserData = async () => {
  const supabase = await createClient();
  const { error, data } = await supabase.auth.getUser();

  if (error) {
    return null;
  }

  if (!data.user) {
    return null;
  }

  const userProfile = await db.query.userProfiles.findFirst({
    where: eq(userProfiles.id, data.user.id),
    columns: { role: true, initials: true },
  });

  if (!userProfile) {
    return null;
  }

  return {
    id: data.user.id,
    role: userProfile.role,
    initials: userProfile.initials,
  };
};

// Gets all configurations for the user if the role is SALES.
// For ENGINEER and ADMIN, gets all configurations
export async function getUserConfigurations(
  user: NonNullable<UserData>,
  page: number = 1,
  pageSize: number = 20,
) {
  const whereClause =
    user.role === "SALES" ? eq(configurations.user_id, user.id) : undefined;

  const [data, countResult] = await Promise.all([
    db.query.configurations.findMany({
      where: whereClause,
      columns: {
        id: true,
        status: true,
        name: true,
        description: true,
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

  return { data, totalCount: Number(countResult[0].count) };
}

export async function getConfigurationWithTanksAndBays(
  id: number,
  user: NonNullable<UserData>,
) {
  const response = await db.query.configurations.findFirst({
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

  // SALES users can only view/edit their own configurations
  if (user.role === "SALES") {
    if (response?.user_id !== user.id) {
      return null;
    }
  }

  return response;
}

export async function getConfiguration(id: number) {
  const response = await db.query.configurations.findFirst({
    where: eq(configurations.id, id),
  });
  return response;
}

export async function getWashBaysByConfigId(configId: number) {
  return db.query.washBays.findMany({
    where: eq(washBays.configuration_id, configId),
    columns: { id: true, has_gantry: true, energy_chain_width: true },
  });
}

export const insertConfiguration = async (
  newConfiguration: ConfigSchema,
  userId: string,
) => {
  const dbData = transformConfigToDbInsert(newConfiguration, userId);

  const [insertedConfiguration] = await db
    .insert(configurations)
    .values(dbData)
    .returning({ id: configurations.id });

  if (!insertedConfiguration) {
    throw new QueryError(MSG.config.createFailed, 500);
  }

  return insertedConfiguration;
};

export const duplicateConfigurationRecord = async (
  source: ConfigurationWithWaterTanksAndWashBays,
  newUserId: string,
): Promise<{ id: number }> => {
  return db.transaction(async (tx) => {
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
      user_id: newUserId,
      status: "DRAFT",
      name: `Copia di ${source.name}`.slice(0, 255),
    };

    const [newConfig] = await tx
      .insert(configurations)
      .values(newConfigValues)
      .returning({ id: configurations.id });

    if (!newConfig) {
      throw new QueryError(MSG.config.duplicateFailed, 500);
    }

    if (source.water_tanks.length > 0) {
      const newTanks: NewWaterTank[] = source.water_tanks.map(
        ({
          id: _id,
          created_at: _ca,
          updated_at: _ua,
          configuration_id: _cid,
          ...t
        }) => ({
          ...t,
          configuration_id: newConfig.id,
        }),
      );
      await tx.insert(waterTanks).values(newTanks);
    }

    if (source.wash_bays.length > 0) {
      const newBays: NewWashBay[] = source.wash_bays.map(
        ({
          id: _id,
          created_at: _ca,
          updated_at: _ua,
          configuration_id: _cid,
          ...b
        }) => ({
          ...b,
          configuration_id: newConfig.id,
        }),
      );
      await tx.insert(washBays).values(newBays);
    }

    return newConfig;
  });
};

export const deleteConfiguration = async (id: number) => {
  await db.delete(configurations).where(eq(configurations.id, id));
};

export const updateConfiguration = async (
  confId: number,
  configurationData: UpdateConfigSchema,
  txOrDb: DatabaseType | TransactionType = db,
): Promise<{ id: number }> => {
  const setData = transformConfigToDbUpdate(configurationData);

  const [updatedConfiguration] = await txOrDb
    .update(configurations)
    .set(setData)
    .where(eq(configurations.id, confId))
    .returning({ id: configurations.id });

  if (!updatedConfiguration) {
    throw new QueryError(MSG.config.notFound, 404);
  }

  return updatedConfiguration;
};

export const touchConfigurationUpdatedAt = async (
  confId: number,
  txOrDb: DatabaseType | TransactionType = db,
) => {
  await txOrDb
    .update(configurations)
    .set({ updated_at: new Date() })
    .where(eq(configurations.id, confId));
};

function canTransition(
  role: Role,
  from: ConfigurationStatusType,
  to: ConfigurationStatusType,
): boolean {
  if (from === to) return true;
  if (role === "ADMIN") return true;

  // SALES (Area Manager): Only their own DRAFT <-> SUBMITTED
  if (role === "SALES") {
    return (
      (from === "DRAFT" && to === "SUBMITTED") ||
      (from === "SUBMITTED" && to === "DRAFT")
    );
  }

  // ENGINEER (Technical Office): Can take into review and approve
  if (role === "ENGINEER") {
    const allowedTransitions = [
      { from: "DRAFT", to: "SUBMITTED" },
      { from: "SUBMITTED", to: "DRAFT" },
      { from: "SUBMITTED", to: "IN_REVIEW" },
      { from: "IN_REVIEW", to: "SUBMITTED" },
      { from: "IN_REVIEW", to: "APPROVED" },
      { from: "APPROVED", to: "IN_REVIEW" },
    ];

    return allowedTransitions.some((t) => t.from === from && t.to === to);
  }

  return false;
}

export const updateConfigStatus = async (
  confId: number,
  user: NonNullable<UserData>,
  statusData: ConfigStatusSchema,
) => {
  const configuration = await getConfiguration(confId);

  if (!configuration) {
    throw new QueryError(MSG.config.notFound, 404);
  }

  if (configuration.status === statusData.status) {
    throw new QueryError(MSG.config.statusAlreadyUpdated, 400);
  }

  if (user.role === "SALES" && user.id !== configuration.user_id) {
    throw new QueryError(MSG.auth.userUnauthorized, 403);
  }

  if (!canTransition(user.role, configuration.status, statusData.status)) {
    throw new QueryError(MSG.config.statusUnauthorized, 403);
  }

  if (statusData.status === "APPROVED") {
    const bomExists = await hasEngineeringBom(confId);
    if (!bomExists) {
      throw new QueryError(MSG.config.approvedRequiresBom, 400);
    }
  }

  // Cross-entity validation: ENERGY_CHAIN requires at least one wash bay with gantry + width
  const forwardStatuses: ConfigurationStatusType[] = [
    "SUBMITTED",
    "IN_REVIEW",
    "APPROVED",
    "CLOSED",
  ];
  if (
    configuration.supply_type === "ENERGY_CHAIN" &&
    forwardStatuses.indexOf(statusData.status) >
      forwardStatuses.indexOf(configuration.status as ConfigurationStatusType)
  ) {
    const bays = await getWashBaysByConfigId(confId);
    const hasValidBay = bays.some(
      (wb) => wb.has_gantry && wb.energy_chain_width,
    );
    if (!hasValidBay) {
      throw new QueryError(MSG.config.energyChainRequiresGantry, 400);
    }
  }

  const [response] = await db
    .update(configurations)
    .set({ status: statusData.status })
    .where(eq(configurations.id, confId))
    .returning({ id: configurations.id });

  if (!response) {
    throw new QueryError(MSG.config.updateNotFoundOrUnauthorized, 404);
  }

  return response;
};

export const insertWaterTank = async (
  confId: number,
  newWaterTank: WaterTankSchema,
  txOrDb: DatabaseType | TransactionType = db,
) => {
  const dbData = transformWaterTankSchemaToDbData(newWaterTank);

  const [id] = await txOrDb
    .insert(waterTanks)
    .values({ ...dbData, configuration_id: confId })
    .returning({ id: waterTanks.id });

  return { success: true, id };
};

export const updateWaterTank = async (
  confId: number,
  waterTankId: number,
  waterTank: WaterTankSchema,
  txOrDb: DatabaseType | TransactionType = db,
) => {
  const dbData = transformWaterTankSchemaToDbData(waterTank);

  const [id] = await txOrDb
    .update(waterTanks)
    .set(dbData)
    .where(
      and(
        eq(waterTanks.id, waterTankId),
        eq(waterTanks.configuration_id, confId),
      ),
    )
    .returning({ id: waterTanks.id });

  return { success: true, id };
};

export const deleteWaterTank = async (
  confId: number,
  waterTankId: number,
  txOrDb: DatabaseType | TransactionType = db,
) => {
  const [id] = await txOrDb
    .delete(waterTanks)
    .where(
      and(
        eq(waterTanks.id, waterTankId),
        eq(waterTanks.configuration_id, confId),
      ),
    )
    .returning({ id: waterTanks.id });

  return { success: true, id };
};

export const insertWashBay = async (
  confId: number,
  newWashBay: WashBaySchema,
  txOrDb: DatabaseType | TransactionType = db,
) => {
  const dbData = transformWashBaySchemaToDbData(newWashBay);

  const [id] = await txOrDb
    .insert(washBays)
    .values({ ...dbData, configuration_id: confId })
    .returning({ id: washBays.id });

  return { success: true, id };
};

export const updateWashBay = async (
  confId: number,
  washBayId: number,
  washBay: WashBaySchema,
  txOrDb: DatabaseType | TransactionType = db,
) => {
  const dbData = transformWashBaySchemaToDbData(washBay);

  const [id] = await txOrDb
    .update(washBays)
    .set(dbData)
    .where(
      and(eq(washBays.id, washBayId), eq(washBays.configuration_id, confId)),
    )
    .returning({ id: washBays.id });

  return { success: true, id };
};

export const deleteWashBay = async (
  confId: number,
  washBayId: number,
  txOrDb: DatabaseType | TransactionType = db,
) => {
  const [id] = await txOrDb
    .delete(washBays)
    .where(
      and(eq(washBays.id, washBayId), eq(washBays.configuration_id, confId)),
    )
    .returning({ id: washBays.id });

  return {
    success: true,
    id,
  };
};

export async function getBOM(id: number, user: NonNullable<UserData>) {
  const configuration = await getConfigurationWithTanksAndBays(id, user);
  if (configuration) {
    const bom = BOM.init(configuration);
    return bom;
  }
}

export async function getPartNumbersByArray(array: string[]) {
  const response = await db.query.partNumbers.findMany({
    where: inArray(partNumbers.pn, array),
  });
  return response;
}

// --- Engineering BOM ---

export async function getEngineeringBomItems(confId: number) {
  return db
    .select({
      id: engineeringBomItems.id,
      configuration_id: engineeringBomItems.configuration_id,
      category: engineeringBomItems.category,
      category_index: engineeringBomItems.category_index,
      pn: engineeringBomItems.pn,
      is_custom: engineeringBomItems.is_custom,
      description: engineeringBomItems.description,
      qty: engineeringBomItems.qty,
      original_qty: engineeringBomItems.original_qty,
      is_deleted: engineeringBomItems.is_deleted,
      is_added: engineeringBomItems.is_added,
      sort_order: engineeringBomItems.sort_order,
      tag: engineeringBomItems.tag,
      bom_rules_version: engineeringBomItems.bom_rules_version,
      created_at: engineeringBomItems.created_at,
      updated_at: engineeringBomItems.updated_at,
      pn_type: partNumbers.pn_type,
      is_phantom: partNumbers.is_phantom,
    })
    .from(engineeringBomItems)
    .leftJoin(partNumbers, eq(engineeringBomItems.pn, partNumbers.pn))
    .where(eq(engineeringBomItems.configuration_id, confId))
    .orderBy(
      asc(engineeringBomItems.category),
      asc(engineeringBomItems.category_index),
      asc(engineeringBomItems.sort_order),
    );
}

export type EngineeringBomItemWithPart = Awaited<
  ReturnType<typeof getEngineeringBomItems>
>[number];

export async function getAssemblyChildren(parentPn: string) {
  const rows = await db.query.bomLines.findMany({
    where: eq(bomLines.parent_pn, parentPn),
    orderBy: [asc(bomLines.sort_order)],
    with: {
      child: {
        columns: {
          pn: true,
          description: true,
          pn_type: true,
          is_phantom: true,
        },
      },
    },
  });

  return rows.flatMap((r) => {
    if (!r.child) return [];
    return [
      {
        pn: r.child.pn,
        description: r.child.description,
        qty: Number(r.qty),
        sort_order: r.sort_order,
        pn_type: r.child.pn_type,
        is_phantom: r.child.is_phantom,
      },
    ];
  });
}

export type AssemblyChild = Awaited<
  ReturnType<typeof getAssemblyChildren>
>[number];

export async function hasEngineeringBom(
  confId: number,
  txOrDb: DatabaseType | TransactionType = db,
) {
  const row = await txOrDb.query.engineeringBomItems.findFirst({
    where: eq(engineeringBomItems.configuration_id, confId),
    columns: { id: true },
  });
  return row !== undefined;
}

export async function hasOfferSnapshot(
  confId: number,
  txOrDb: DatabaseType | TransactionType = db,
) {
  const row = await txOrDb.query.offerSnapshots.findFirst({
    where: eq(offerSnapshots.configuration_id, confId),
    columns: { id: true },
  });
  return row !== undefined;
}

export async function insertEngineeringBomItems(
  items: NewEngineeringBomItem[],
) {
  if (items.length === 0) return;
  await db.insert(engineeringBomItems).values(items);
}

/**
 * Hard-deletes all engineering BOM items for a configuration.
 * Used during BOM regeneration (full wipe + reinsert).
 *
 * Individual item removal uses soft delete (is_deleted toggle) so the UI
 * can display removed items with visual distinction and allow restoration.
 */
export async function deleteAllEngineeringBomItems(
  confId: number,
  txOrDb: DatabaseType | TransactionType = db,
) {
  await txOrDb
    .delete(engineeringBomItems)
    .where(eq(engineeringBomItems.configuration_id, confId));
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

export async function getConfigurationStatusCounts() {
  const user = await getUserData();
  if (!user) return null;

  const whereClause =
    user.role === "SALES" ? eq(configurations.user_id, user.id) : undefined;

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

export type UserWithStats = {
  id: string;
  email: string;
  role: "ADMIN" | "ENGINEER" | "SALES";
  initials: string | null;
  last_login_at: Date | null;
  configCount: number;
  lastActivity: Date | null;
};

export async function getAllUsersWithStats(): Promise<UserWithStats[]> {
  const result = await db
    .select({
      id: userProfiles.id,
      email: userProfiles.email,
      role: userProfiles.role,
      initials: userProfiles.initials,
      last_login_at: userProfiles.last_login_at,
      configCount: countDistinct(configurations.id),
      lastActivity: max(activityLogs.created_at),
    })
    .from(userProfiles)
    .leftJoin(configurations, eq(configurations.user_id, userProfiles.id))
    .leftJoin(activityLogs, eq(activityLogs.user_id, userProfiles.id))
    .groupBy(
      userProfiles.id,
      userProfiles.email,
      userProfiles.role,
      userProfiles.initials,
      userProfiles.last_login_at,
    )
    .orderBy(asc(userProfiles.email));

  return result.map((r) => ({
    ...r,
    configCount: Number(r.configCount),
    lastActivity: r.lastActivity ?? null,
  }));
}

export async function getUserProfileById(userId: string) {
  return db.query.userProfiles.findFirst({
    where: eq(userProfiles.id, userId),
  });
}

export type ActivityLogEntry = typeof activityLogs.$inferSelect;

export async function getUserActivityLog(
  userId: string,
  page: number = 1,
  pageSize: number = 20,
) {
  const [data, countResult] = await Promise.all([
    db.query.activityLogs.findMany({
      where: eq(activityLogs.user_id, userId),
      orderBy: [desc(activityLogs.created_at)],
      limit: pageSize,
      offset: (page - 1) * pageSize,
    }),
    db
      .select({ count: sql<number>`count(*)` })
      .from(activityLogs)
      .where(eq(activityLogs.user_id, userId)),
  ]);

  return { data, totalCount: Number(countResult[0].count) };
}

export async function logActivity(params: {
  userId: string;
  action: ActivityAction;
  targetEntity: string;
  targetId: string;
  metadata?: Record<string, unknown>;
}) {
  try {
    await db.insert(activityLogs).values({
      user_id: params.userId,
      action: params.action,
      target_entity: params.targetEntity,
      target_id: params.targetId,
      metadata: params.metadata ?? null,
    });
  } catch (err) {
    console.error("[logActivity] Failed to log activity:", err);
  }
}

export async function searchPartNumbers(query: string, limit = 20) {
  const pattern = query.includes("%") ? query : `%${query}%`;
  return db.query.partNumbers.findMany({
    where: or(
      ilike(partNumbers.pn, pattern),
      ilike(partNumbers.description, pattern),
    ),
    limit,
    orderBy: [asc(partNumbers.pn)],
  });
}

// ── Price coefficients ──────────────────────────────────────────────────────

export type PriceCoefficientWithUpdater = {
  id: number;
  pn: string;
  coefficient: string;
  source: CoefficientSource;
  is_custom: boolean;
  updated_by: string | null;
  updaterEmail: string | null;
  updaterInitials: string | null;
  created_at: Date;
  updated_at: Date;
};

export async function getAllPriceCoefficients(): Promise<
  PriceCoefficientWithUpdater[]
> {
  return db
    .select({
      id: priceCoefficients.id,
      pn: priceCoefficients.pn,
      coefficient: priceCoefficients.coefficient,
      source: priceCoefficients.source,
      is_custom: priceCoefficients.is_custom,
      updated_by: priceCoefficients.updated_by,
      updaterEmail: userProfiles.email,
      updaterInitials: userProfiles.initials,
      created_at: priceCoefficients.created_at,
      updated_at: priceCoefficients.updated_at,
    })
    .from(priceCoefficients)
    .leftJoin(userProfiles, eq(priceCoefficients.updated_by, userProfiles.id))
    .orderBy(asc(priceCoefficients.pn));
}

export async function getPriceCoefficientsByArray(
  pns: string[],
): Promise<{ pn: string; coefficient: string }[]> {
  if (pns.length === 0) return [];
  return db
    .select({
      pn: priceCoefficients.pn,
      coefficient: priceCoefficients.coefficient,
    })
    .from(priceCoefficients)
    .where(inArray(priceCoefficients.pn, pns));
}

export async function getFullPriceCoefficientByPn(pn: string): Promise<
  | {
      pn: string;
      coefficient: string;
      source: CoefficientSource;
      is_custom: boolean;
    }
  | undefined
> {
  const [row] = await db
    .select({
      pn: priceCoefficients.pn,
      coefficient: priceCoefficients.coefficient,
      source: priceCoefficients.source,
      is_custom: priceCoefficients.is_custom,
    })
    .from(priceCoefficients)
    .where(eq(priceCoefficients.pn, pn));
  return row;
}

export async function createPriceCoefficient(data: {
  pn: string;
  coefficient: string;
  source: CoefficientSource;
  is_custom: boolean;
  updated_by: string | null;
}): Promise<{ id: number; pn: string }> {
  const [row] = await db
    .insert(priceCoefficients)
    .values(data)
    .returning({ id: priceCoefficients.id, pn: priceCoefficients.pn });
  return row;
}

export async function updatePriceCoefficientByPn(data: {
  pn: string;
  coefficient: string;
  is_custom: boolean;
  updated_by: string | null;
}): Promise<{ pn: string } | undefined> {
  const [row] = await db
    .update(priceCoefficients)
    .set({
      coefficient: data.coefficient,
      is_custom: data.is_custom,
      updated_by: data.updated_by,
      updated_at: new Date(),
    })
    .where(eq(priceCoefficients.pn, data.pn))
    .returning({ pn: priceCoefficients.pn });
  return row;
}

export async function deletePriceCoefficientByPn(
  pn: string,
): Promise<{ pn: string } | undefined> {
  const [row] = await db
    .delete(priceCoefficients)
    .where(eq(priceCoefficients.pn, pn))
    .returning({ pn: priceCoefficients.pn });
  return row;
}

export async function insertMissingMaxBomCoefficients(
  pns: string[],
  defaultCoefficient: string,
): Promise<number> {
  if (pns.length === 0) return 0;
  const rows = await db
    .insert(priceCoefficients)
    .values(
      pns.map((pn) => ({
        pn,
        coefficient: defaultCoefficient,
        source: "MAXBOM" as const,
        is_custom: false,
      })),
    )
    .onConflictDoNothing({ target: priceCoefficients.pn })
    .returning({ pn: priceCoefficients.pn });
  return rows.length;
}

// --- Offer Snapshots ---

export type OfferSnapshotWithGenerator = OfferSnapshot & {
  generator: { id: string; email: string | null } | null;
};

export async function getOfferSnapshotByConfigurationId(
  confId: number,
): Promise<OfferSnapshotWithGenerator | null> {
  const [row] = await db
    .select({
      id: offerSnapshots.id,
      configuration_id: offerSnapshots.configuration_id,
      source: offerSnapshots.source,
      generated_at: offerSnapshots.generated_at,
      generated_by: offerSnapshots.generated_by,
      discount_pct: offerSnapshots.discount_pct,
      items: offerSnapshots.items,
      total_list_price: offerSnapshots.total_list_price,
      bom_rules_version: offerSnapshots.bom_rules_version,
      updated_at: offerSnapshots.updated_at,
      generator: {
        id: userProfiles.id,
        email: userProfiles.email,
      },
    })
    .from(offerSnapshots)
    .leftJoin(userProfiles, eq(offerSnapshots.generated_by, userProfiles.id))
    .where(eq(offerSnapshots.configuration_id, confId));
  return row ?? null;
}

export async function upsertOfferSnapshot(data: {
  configuration_id: number;
  source: "EBOM" | "LIVE";
  generated_by: string;
  items: OfferSnapshotItem[];
  total_list_price: string;
  bom_rules_version: string;
}): Promise<OfferSnapshot> {
  const now = new Date();
  const { configuration_id, ...fields } = data;
  const [row] = await db
    .insert(offerSnapshots)
    .values({ configuration_id, ...fields, generated_at: now, updated_at: now })
    .onConflictDoUpdate({
      target: offerSnapshots.configuration_id,
      set: { ...fields, generated_at: now, updated_at: now },
    })
    .returning();
  return row;
}

export async function updateOfferDiscount(
  confId: number,
  discount_pct: string,
): Promise<OfferSnapshot | undefined> {
  const [row] = await db
    .update(offerSnapshots)
    .set({ discount_pct, updated_at: new Date() })
    .where(eq(offerSnapshots.configuration_id, confId))
    .returning();
  return row;
}

export async function deleteOfferSnapshotByConfigurationId(
  confId: number,
  txOrDb: DatabaseType | TransactionType = db,
): Promise<void> {
  await txOrDb
    .delete(offerSnapshots)
    .where(eq(offerSnapshots.configuration_id, confId));
}

export async function getEbomMaxUpdatedAt(
  confId: number,
): Promise<Date | null> {
  const [row] = await db
    .select({ maxUpdatedAt: max(engineeringBomItems.updated_at) })
    .from(engineeringBomItems)
    .where(eq(engineeringBomItems.configuration_id, confId));
  return row?.maxUpdatedAt ?? null;
}
