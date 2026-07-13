import { sql } from "drizzle-orm";
import {
  type AnyPgColumn,
  boolean,
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
    // First-login profiles start inactive and must be activated by an ADMIN
    // before the user can access the app.
    is_active: boolean().notNull().default(true),
    // Set when an ADMIN deactivates the user, cleared on (re)activation; null
    // for pending profiles. Non-null implies is_active = false and
    // distinguishes "deactivated" from "never activated".
    deactivated_at: timestamp("deactivated_at", { mode: "date", precision: 3 }),
    initials: varchar({ length: 3 }),
    last_login_at: timestamp("last_login_at", { mode: "date", precision: 3 }),
    // Self-referential link to the SALES_MANAGER a SALES user reports to.
    manager_id: uuid().references((): AnyPgColumn => userProfiles.id, {
      onDelete: "set null",
    }),
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
    // No UPDATE policy: with RLS enabled and no permissive policy, every write
    // through the Supabase API roles is denied. Server Actions are unaffected —
    // Drizzle connects as `postgres`, which owns the table and bypasses RLS.
    //
    // A "users may update their own profile" policy used to live here. It let
    // any authenticated user PATCH their own row through the public PostgREST
    // endpoint (the URL and anon key ship to the browser), so a deactivated user
    // holding a still-valid JWT could set `is_active` back to true and clear
    // `deactivated_at` — self-reactivation — and any user could promote
    // themselves to ADMIN. Administrative columns are writable only via the
    // audited Server Actions in `app/actions/user-actions.ts`.
  ],
).enableRLS();
