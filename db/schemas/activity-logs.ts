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
    metadata: jsonb(),
    created_at: timestamp("created_at", { mode: "date", precision: 3 })
      .notNull()
      .defaultNow(),
  },
  // Postgres does not auto-index FK columns; the table grows unboundedly and
  // is joined per user in getAllUsersWithStats.
  (t) => [index("activity_logs_user_id_idx").on(t.user_id)],
).enableRLS();
