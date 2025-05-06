import { configurations } from "@/db/schemas/configurations";
import { PressureWashers } from "@/types";
import { relations } from "drizzle-orm";
import {
  boolean,
  integer,
  pgEnum,
  pgTable,
  timestamp,
} from "drizzle-orm/pg-core";

export type WashBay = typeof washBays.$inferSelect;
export type NewWashBay = typeof washBays.$inferInsert;

export const pressureWasherTypeEnum = pgEnum(
  "pressure_washer_type",
  PressureWashers
);

export const washBays = pgTable("wash_bays", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  hp_lance_qty: integer().notNull(),
  det_lance_qty: integer().notNull(),
  hose_reel_qty: integer().notNull(),
  pressure_washer_type: pressureWasherTypeEnum("pressure_washer_type"),
  pressure_washer_qty: integer(),
  has_gantry: boolean().notNull(),
  is_first_bay: boolean().notNull(),
  has_bay_dividers: boolean().notNull(),
  created_at: timestamp("created_at", { mode: "date", precision: 3 })
    .notNull()
    .defaultNow(),
  updated_at: timestamp("updated_at", { mode: "date", precision: 3 })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
  configuration_id: integer("configuration_id")
    .references(() => configurations.id, { onDelete: "cascade" })
    .notNull(),
}).enableRLS();

export const washBaysRelations = relations(washBays, ({ one }) => ({
  configuration: one(configurations, {
    fields: [washBays.configuration_id],
    references: [configurations.id],
  }),
}));
