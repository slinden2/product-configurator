import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { activityLogs } from "@/db/schemas";
import type { ActivityAction } from "@/types";
import type { DatabaseType, TransactionType } from "./errors";

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
