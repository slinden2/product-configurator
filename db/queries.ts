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
  configurations,
  engineeringBomItems,
  type NewEngineeringBomItem,
  partNumbers,
  userProfiles,
  washBays,
  waterTanks,
} from "@/db/schemas";
import { BOM } from "@/lib/BOM";
import { MSG } from "@/lib/messages";
import type { ActivityAction, ConfigurationStatusType, Role } from "@/types";
import { createClient } from "@/utils/supabase/server";
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

export async function getUserData() {
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
}

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
  return db.query.engineeringBomItems.findMany({
    where: eq(engineeringBomItems.configuration_id, confId),
    orderBy: [
      asc(engineeringBomItems.category),
      asc(engineeringBomItems.category_index),
      asc(engineeringBomItems.sort_order),
    ],
  });
}

export async function hasEngineeringBom(
  confId: number,
  txOrDb: DatabaseType | TransactionType = db,
) {
  const result = await txOrDb
    .select({ count: sql<number>`count(*)::int` })
    .from(engineeringBomItems)
    .where(eq(engineeringBomItems.configuration_id, confId));
  return (result[0]?.count ?? 0) > 0;
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
