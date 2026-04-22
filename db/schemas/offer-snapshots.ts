import {
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { configurations } from "@/db/schemas/configurations";
import { userProfiles } from "@/db/schemas/user-profiles";
import { OfferSources } from "@/types";

export const offerSourceEnum = pgEnum("offer_source", OfferSources);

export type OfferSnapshot = typeof offerSnapshots.$inferSelect;
export type NewOfferSnapshot = typeof offerSnapshots.$inferInsert;

export const offerSnapshots = pgTable("offer_snapshots", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  configuration_id: integer("configuration_id")
    .references(() => configurations.id, { onDelete: "cascade" })
    .unique()
    .notNull(),
  source: offerSourceEnum("source").notNull(),
  generated_at: timestamp("generated_at", { mode: "date", precision: 3 })
    .notNull()
    .defaultNow(),
  generated_by: uuid("generated_by").references(() => userProfiles.id, {
    onDelete: "set null",
  }),
  discount_pct: numeric("discount_pct", { precision: 5, scale: 2 })
    .notNull()
    .default("0"),
  items: jsonb("items").notNull(),
  total_list_price: numeric("total_list_price", {
    precision: 12,
    scale: 2,
  }).notNull(),
  bom_rules_version: varchar("bom_rules_version", { length: 20 }).notNull(),
  updated_at: timestamp("updated_at", { mode: "date", precision: 3 })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
}).enableRLS();
