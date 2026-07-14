import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { activityLogs, userProfiles } from "@/db/schemas";
import type { ActivityAction } from "@/types";
import type { DatabaseType, TransactionType } from "./errors";

export type ActivityLogEntry = typeof activityLogs.$inferSelect;

export type ActivityLogEntryWithUser = ActivityLogEntry & {
  user_email: string;
};

export type ActivityLogFilters = {
  action?: ActivityAction;
  userId?: string;
};

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

/**
 * Cross-user activity log for the admin audit page (/gestione/attivita).
 * Newest first; the optional filters are AND'd together, and an omitted filter
 * simply drops out of the WHERE clause.
 */
export async function getActivityLog(
  filters: ActivityLogFilters = {},
  page: number = 1,
  pageSize: number = 20,
): Promise<{ data: ActivityLogEntryWithUser[]; totalCount: number }> {
  const where = and(
    filters.action ? eq(activityLogs.action, filters.action) : undefined,
    filters.userId ? eq(activityLogs.user_id, filters.userId) : undefined,
  );

  const [data, countResult] = await Promise.all([
    db
      .select({
        id: activityLogs.id,
        user_id: activityLogs.user_id,
        action: activityLogs.action,
        target_entity: activityLogs.target_entity,
        target_id: activityLogs.target_id,
        metadata: activityLogs.metadata,
        created_at: activityLogs.created_at,
        user_email: userProfiles.email,
      })
      .from(activityLogs)
      // inner join: user_id is NOT NULL and ON DELETE RESTRICT, so the actor
      // profile always exists.
      .innerJoin(userProfiles, eq(userProfiles.id, activityLogs.user_id))
      .where(where)
      .orderBy(desc(activityLogs.created_at))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db.select({ count: sql<number>`count(*)` }).from(activityLogs).where(where),
  ]);

  return { data, totalCount: Number(countResult[0].count) };
}

type ActivityLogParams = {
  userId: string;
  action: ActivityAction;
  targetEntity: string;
  targetId: string;
  metadata?: Record<string, unknown>;
};

export async function insertActivityLog(
  params: ActivityLogParams,
  txOrDb: DatabaseType | TransactionType = db,
) {
  await txOrDb.insert(activityLogs).values({
    user_id: params.userId,
    action: params.action,
    target_entity: params.targetEntity,
    target_id: params.targetId,
    metadata: params.metadata ?? null,
  });
}

export async function logActivity(params: ActivityLogParams) {
  try {
    await insertActivityLog(params);
  } catch (err) {
    console.error("[logActivity] Failed to log activity:", err);
  }
}
