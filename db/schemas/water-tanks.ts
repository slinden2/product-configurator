import { configurations } from "@/db/schemas/configurations";
import { WaterTankTypes } from "@/types";
import { relations } from "drizzle-orm";
import {
  boolean,
  integer,
  pgEnum,
  pgTable,
  timestamp,
} from "drizzle-orm/pg-core";

export type WaterTank = typeof waterTanks.$inferSelect;
export type NewWaterTank = typeof waterTanks.$inferInsert;

export const waterTankTypeEnum = pgEnum("water_tank_type", WaterTankTypes);

export const waterTanks = pgTable("water_tanks", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  type: waterTankTypeEnum("water_tank_type").notNull(),
  inlet_w_float_qty: integer().notNull(),
  inlet_no_float_qty: integer().notNull(),
  outlet_w_valve_qty: integer().notNull(),
  outlet_no_valve_qty: integer().notNull(),
  has_blower: boolean().notNull(),
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

export const waterTanksRelations = relations(waterTanks, ({ one }) => ({
  configuration: one(configurations, {
    fields: [waterTanks.configuration_id],
    references: [configurations.id],
  }),
}));
