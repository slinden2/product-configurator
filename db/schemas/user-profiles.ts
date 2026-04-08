import { sql } from "drizzle-orm";
import {
  pgEnum,
  pgPolicy,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { authenticatedRole, authUsers } from "drizzle-orm/supabase";
import { Roles } from "@/types";

export type UserProfile = typeof userProfiles.$inferSelect;
export type NewUserProfile = typeof userProfiles.$inferInsert;

export const roleEnum = pgEnum("role", Roles);

export const userProfiles = pgTable(
  "user_profiles",
  {
    id: uuid()
      .default(sql`auth.uid()`)
      .primaryKey()
      .references(() => authUsers.id, { onDelete: "cascade" })
      .notNull(),
    created_at: timestamp("created_at", { mode: "date", precision: 3 })
      .notNull()
      .defaultNow(),
    email: varchar().notNull().unique(),
    role: roleEnum().notNull(),
    initials: varchar({ length: 3 }),
    last_login_at: timestamp("last_login_at", { mode: "date", precision: 3 }),
  },
  () => [
    pgPolicy("Allow authenticated users to select all profiles", {
      as: "permissive",
      to: authenticatedRole,
      for: "select",
      using: sql`true`,
    }),
    pgPolicy("Allow ADMIN to insert profiles", {
      as: "permissive",
      to: authenticatedRole,
      for: "insert",
      withCheck: sql`(SELECT role FROM user_profiles WHERE id = auth.uid()) = 'ADMIN'`,
    }),
    pgPolicy("Allow users to update own profile or ADMIN to update any", {
      as: "permissive",
      to: authenticatedRole,
      for: "update",
      using: sql`auth.uid() = id OR (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'ADMIN'`,
      withCheck: sql`auth.uid() = id OR (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'ADMIN'`,
    }),
    pgPolicy("Allow only ADMIN to delete profiles", {
      as: "permissive",
      to: authenticatedRole,
      for: "delete",
      using: sql`(SELECT role FROM user_profiles WHERE id = auth.uid()) = 'ADMIN'`,
    }),
  ],
).enableRLS();

