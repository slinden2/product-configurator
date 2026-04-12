import {
  boolean,
  integer,
  pgEnum,
  pgTable,
  timestamp,
} from "drizzle-orm/pg-core";
import { configurations } from "@/db/schemas/configurations";
import { EnergyChainWidths, PressureWashers } from "@/types";

export const energyChainWidthEnum = pgEnum(
  "energy_chain_width",
  EnergyChainWidths,
);

export type WashBay = typeof washBays.$inferSelect;
export type NewWashBay = typeof washBays.$inferInsert;

export const pressureWasherTypeEnum = pgEnum(
  "pressure_washer_type",
  PressureWashers,
);

export const washBays = pgTable("wash_bays", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  hp_lance_qty: integer().notNull(),
  det_lance_qty: integer().notNull(),
  hose_reel_qty: integer().notNull(),
  pressure_washer_type: pressureWasherTypeEnum("pressure_washer_type"),
  pressure_washer_qty: integer(),
  has_gantry: boolean().notNull(),
  energy_chain_width: energyChainWidthEnum("energy_chain_width"),
  has_shelf_extension: boolean().notNull().default(false),
  ec_signal_cable_qty: integer(),
  ec_profinet_cable_qty: integer(),
  ec_water_1_tube_qty: integer(),
  ec_water_34_tube_qty: integer(),
  ec_r1_1_tube_qty: integer(),
  ec_r2_1_tube_qty: integer(),
  ec_r2_34_inox_tube_qty: integer(),
  ec_air_tube_qty: integer(),
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
