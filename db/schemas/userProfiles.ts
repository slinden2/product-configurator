import { sql } from "drizzle-orm";
import { pgTable, timestamp, unique, uuid, varchar } from "drizzle-orm/pg-core";

export const userProfiles = pgTable("user_profiles", {
  id: uuid()
    .default(sql`auth.uid()`)
    .primaryKey()
    .notNull(),
  created_at: timestamp("created_at", { mode: "date", precision: 3 })
    .notNull()
    .defaultNow(),
  email: varchar().notNull().unique(),
}).enableRLS();
