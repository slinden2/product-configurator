import { sql } from "drizzle-orm";
import {
  pgPolicy,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { authenticatedRole } from "drizzle-orm/supabase";

export type UserProfile = typeof userProfiles.$inferSelect;
export type NewUserProfile = typeof userProfiles.$inferInsert;

export const userProfiles = pgTable(
  "user_profiles",
  {
    id: uuid()
      .default(sql`auth.uid()`)
      .primaryKey()
      .notNull(),
    created_at: timestamp("created_at", { mode: "date", precision: 3 })
      .notNull()
      .defaultNow(),
    email: varchar().notNull().unique(),
  },
  () => [
    pgPolicy("Enable all operations for authenticated users only", {
      as: "permissive",
      to: authenticatedRole,
      for: "all",
      withCheck: sql`true`,
    }),
  ]
);
