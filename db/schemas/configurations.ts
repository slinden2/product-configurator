import { userProfiles } from "@/db/schemas/user-profiles";
import { WashBay, washBays } from "@/db/schemas/wash-bays";
import { WaterTank, waterTanks } from "@/db/schemas/water-tanks";
import {
  BrushColors,
  BrushTypes,
  ChemPumpPos,
  ConfigurationStatus,
  EnergyChainWidths,
  HpPump15kwOutlets,
  HpPump30kwOutlets,
  HpPumpOMZkwOutlets,
  RailTypes,
  SupplyFixTypes,
  SupplySides,
  SupplyTypes,
  TouchFixTypes,
  TouchPos,
  Water1Pumps,
  Water2Pumps,
  WaterTypes,
} from "@/types";
import { relations } from "drizzle-orm";
import {
  boolean,
  integer,
  pgEnum,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export type Configuration = typeof configurations.$inferSelect;
export type NewConfiguration = typeof configurations.$inferInsert;
export type ConfigurationWithWaterTanksAndWashBays = Configuration & {
  water_tanks: WaterTank[];
  wash_bays: WashBay[];
};

export const brushTypeEnum = pgEnum("brush_type", BrushTypes);
export const brushColorEnum = pgEnum("brush_color", BrushColors);
export const chemPumpPosEnum = pgEnum("chemical_pump_pos", ChemPumpPos);
export const waterTypeEnum = pgEnum("water_type", WaterTypes);
export const water1PumpTypeEnum = pgEnum("water_1_pump_type", Water1Pumps);
export const water2PumpTypeEnum = pgEnum("water_2_pump_type", Water2Pumps);
export const supplyTypeEnum = pgEnum("supply_type", SupplyTypes);
export const supplySideEnum = pgEnum("supply_side", SupplySides);
export const supplyFixType = pgEnum("supply_fix_type", SupplyFixTypes);
export const energyChainWidthEnum = pgEnum(
  "energy_chain_width",
  EnergyChainWidths
);
export const railTypeEnum = pgEnum("rail_type", RailTypes);
export const touchPosEnum = pgEnum("touch_pos", TouchPos);
export const touchFixTypeEnum = pgEnum("touch_fix_type", TouchFixTypes);
export const hpPump15kwOutletTypeEnum = pgEnum(
  "hp_pump_15kw_outlet_type",
  HpPump15kwOutlets
);
export const hpPump30kwOutletTypeEnum = pgEnum(
  "hp_pump_30kw_outlet_type",
  HpPump30kwOutlets
);
export const hpPumpOMZOutletTypeEnum = pgEnum(
  "hp_pump_omz_outlet_type",
  HpPumpOMZkwOutlets
);
export const configurationStatusEnum = pgEnum(
  "configuration_status",
  ConfigurationStatus
);

export const configurations = pgTable("configurations", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: varchar({ length: 255 }).notNull(),
  description: varchar({ length: 255 }).notNull().default(""),
  brush_qty: integer().notNull(),
  brush_type: brushTypeEnum(),
  brush_color: brushColorEnum("brush_color"),
  has_shampoo_pump: boolean().notNull(),
  has_wax_pump: boolean().notNull(),
  has_chemical_pump: boolean().notNull(),
  chemical_qty: integer(),
  chemical_pump_pos: chemPumpPosEnum("chemical_pump_pos"),
  has_foam: boolean().notNull(),
  has_acid_pump: boolean().notNull(),
  acid_pump_pos: chemPumpPosEnum("acid_pump_pos"),
  water_1_type: waterTypeEnum("water_1_type").notNull(),
  water_1_pump: water1PumpTypeEnum("water_1_pump_type"),
  inv_pump_outlet_dosatron_qty: integer(),
  inv_pump_outlet_pw_qty: integer(),
  water_2_type: waterTypeEnum("water_2_type"),
  water_2_pump: water2PumpTypeEnum("water_2_pump_type"),
  has_antifreeze: boolean().notNull(),
  supply_type: supplyTypeEnum("supply_type").notNull(),
  supply_fixing_type: supplyFixType("supply_fix_type"),
  supply_side: supplySideEnum("supply_side").notNull(),
  has_post_frame: boolean().notNull(),
  energy_chain_width: energyChainWidthEnum("energy_chain_width"),
  has_shelf_extension: boolean().notNull(),
  rail_type: railTypeEnum("rail_type").notNull(),
  rail_length: integer().notNull(),
  rail_guide_qty: integer().notNull(),
  touch_qty: integer().notNull(),
  touch_pos: touchPosEnum("touch_pos"),
  touch_fixing_type: touchFixTypeEnum("touch_fix_type"),
  has_itecoweb: boolean().notNull(),
  has_card_reader: boolean().notNull(),
  is_fast: boolean().notNull(),
  card_qty: integer().notNull(),
  has_15kw_pump: boolean().notNull(),
  pump_outlet_1_15kw: hpPump15kwOutletTypeEnum("pump_outlet_1_15kw"),
  pump_outlet_2_15kw: hpPump15kwOutletTypeEnum("pump_outlet_2_15kw"),
  has_30kw_pump: boolean().notNull(),
  pump_outlet_1_30kw: hpPump30kwOutletTypeEnum("pump_outlet_1_30kw"),
  pump_outlet_2_30kw: hpPump30kwOutletTypeEnum("pump_outlet_2_30kw"),
  has_omz_pump: boolean().notNull(),
  pump_outlet_omz: hpPumpOMZOutletTypeEnum("pump_outlet_omz"),
  has_chemical_roof_bar: boolean().notNull(),
  status: configurationStatusEnum("configuration_status")
    .default("DRAFT")
    .notNull(),
  user_id: uuid("user_id")
    .references(() => userProfiles.id, { onDelete: "cascade" })
    .notNull(),
  created_at: timestamp("created_at", { mode: "date", precision: 3 })
    .notNull()
    .defaultNow(),
  updated_at: timestamp("updated_at", { mode: "date", precision: 3 })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
}).enableRLS();

export const configurationsRelations = relations(
  configurations,
  ({ many, one }) => ({
    user: one(userProfiles, {
      fields: [configurations.user_id],
      references: [userProfiles.id],
    }),
    water_tanks: many(waterTanks),
    wash_bays: many(washBays),
  })
);
