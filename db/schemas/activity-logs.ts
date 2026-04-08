import {
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

export const activityLogs = pgTable("activity_logs", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  user_id: uuid()
    .notNull()
    .references(() => userProfiles.id, { onDelete: "cascade" }),
  action: activityActionEnum().notNull(),
  target_entity: varchar({ length: 100 }).notNull(),
  target_id: varchar({ length: 100 }).notNull(),
  metadata: jsonb(),
  created_at: timestamp("created_at", { mode: "date", precision: 3 })
    .notNull()
    .defaultNow(),
}).enableRLS();
