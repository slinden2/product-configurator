import { configurations } from "@/db/schemas/configurations";
import { relations } from "drizzle-orm";
import {
  boolean,
  integer,
  pgEnum,
  pgTable,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

export const ebomCategoryEnum = pgEnum("ebom_category", [
  "GENERAL",
  "WATER_TANK",
  "WASH_BAY",
]);

export const ebomTagEnum = pgEnum("ebom_tag", [
  "FRAME",
  "BRUSHES",
  "RINSE_BARS",
  "PREWASH_BARS",
  "ACID_BARS",
  "DOSING_PUMPS",
  "FAST",
  "ELECTRICAL",
  "HP_PUMPS",
  "RAILS",
  "SUPPLY",
  "WATER_SUPPLY",
  "MISC",
]);

export type EngineeringBomItem = typeof engineeringBomItems.$inferSelect;
export type NewEngineeringBomItem = typeof engineeringBomItems.$inferInsert;

export const engineeringBomItems = pgTable("engineering_bom_items", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  configuration_id: integer("configuration_id")
    .references(() => configurations.id, { onDelete: "cascade" })
    .notNull(),
  category: ebomCategoryEnum("category").notNull(),
  category_index: integer("category_index").notNull(),
  pn: varchar("pn", { length: 25 }).notNull(),
  is_custom: boolean("is_custom").notNull().default(false),
  description: varchar("description", { length: 255 }).notNull(),
  qty: integer("qty").notNull(),
  original_qty: integer("original_qty"),
  is_deleted: boolean("is_deleted").notNull().default(false),
  is_added: boolean("is_added").notNull().default(false),
  sort_order: integer("sort_order").notNull(),
  tag: ebomTagEnum("tag"),
  bom_rules_version: varchar("bom_rules_version", { length: 20 }),
  created_at: timestamp("created_at", { mode: "date", precision: 3 })
    .notNull()
    .defaultNow(),
  updated_at: timestamp("updated_at", { mode: "date", precision: 3 })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
}).enableRLS();

export const engineeringBomItemsRelations = relations(
  engineeringBomItems,
  ({ one }) => ({
    configuration: one(configurations, {
      fields: [engineeringBomItems.configuration_id],
      references: [configurations.id],
    }),
  })
);
