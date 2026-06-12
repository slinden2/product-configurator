import {
  integer,
  numeric,
  pgEnum,
  pgTable,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { userProfiles } from "@/db/schemas/user-profiles";
import { InstallationItemKinds } from "@/types";

export type InstallationItemSetting =
  typeof installationItemSettings.$inferSelect;
export type NewInstallationItemSetting =
  typeof installationItemSettings.$inferInsert;

export const installationItemKindEnum = pgEnum(
  "installation_item_kind",
  InstallationItemKinds,
);

export const installationItemSettings = pgTable("installation_item_settings", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  kind: installationItemKindEnum("kind").unique().notNull(),
  price: numeric({ precision: 10, scale: 2 }).notNull().default("0.00"),
  updated_by: uuid("updated_by").references(() => userProfiles.id, {
    onDelete: "set null",
  }),
  created_at: timestamp("created_at", { mode: "date", precision: 3 })
    .notNull()
    .defaultNow(),
  updated_at: timestamp("updated_at", { mode: "date", precision: 3 })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
}).enableRLS();
