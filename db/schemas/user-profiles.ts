import { configurations } from "@/db/schemas/configurations";
import { Roles } from "@/types";
import { relations, sql } from "drizzle-orm";
import {
  pgEnum,
  pgPolicy,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { authenticatedRole, authUsers } from "drizzle-orm/supabase";

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

export const usersProfilesRelations = relations(userProfiles, ({ many }) => ({
  configurations: many(configurations),
}));
