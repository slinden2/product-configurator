import {
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { userProfiles } from "@/db/schemas/user-profiles";
import { ActivityActions } from "@/types";

export type ActivityLog = typeof activityLogs.$inferSelect;
export type NewActivityLog = typeof activityLogs.$inferInsert;

export const activityActionEnum = pgEnum("activity_action", ActivityActions);

export const activityLogs = pgTable(
  "activity_logs",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    // restrict: the audit trail must survive user deletion.
    user_id: uuid()
      .notNull()
      .references(() => userProfiles.id, { onDelete: "restrict" }),
    action: activityActionEnum().notNull(),
    target_entity: varchar({ length: 100 }).notNull(),
    target_id: varchar({ length: 100 }).notNull(),
    metadata: jsonb().$type<Record<string, unknown>>(),
    created_at: timestamp("created_at", { mode: "date", precision: 3 })
      .notNull()
      .defaultNow(),
  },
  // Postgres does not auto-index FK columns; the table grows unboundedly and
  // is joined per user in getAllUsersWithStats. The created_at index serves the
  // global audit page, which pages the whole table ordered by created_at DESC
  // (a plain btree scans backwards, so no explicit DESC ordering is needed).
  // The action/user filters deliberately get no index of their own: they either
  // ride this scan or the user_id index above.
  (t) => [
    index("activity_logs_user_id_idx").on(t.user_id),
    index("activity_logs_created_at_idx").on(t.created_at),
  ],
).enableRLS();
