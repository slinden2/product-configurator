import { pgTable, foreignKey, integer, boolean, timestamp, unique, varchar, uuid, pgEnum } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const brushColor = pgEnum("brush_color", ['BLUE_SILVER', 'GREEN_SILVER', 'RED', 'GREEN_BLACK'])
export const brushType = pgEnum("brush_type", ['THREAD', 'MIXED', 'CARLITE'])
export const chemicalPumpPos = pgEnum("chemical_pump_pos", ['ABOARD', 'WASH_BAY'])
export const configurationStatus = pgEnum("configuration_status", ['DRAFT', 'OPEN', 'LOCKED', 'CLOSED'])
export const energyChainWidth = pgEnum("energy_chain_width", ['L150', 'L200', 'L250', 'L300'])
export const hpPump15KwOutletType = pgEnum("hp_pump_15kw_outlet_type", ['CHASSIS_WASH', 'LOW_SPINNERS', 'LOW_BARS', 'HIGH_BARS'])
export const hpPump30KwOutletType = pgEnum("hp_pump_30kw_outlet_type", ['CHASSIS_WASH_HORIZONTAL', 'CHASSIS_WASH_LATERAL_HORIZONTAL', 'LOW_SPINNERS_HIGH_BARS', 'LOW_MEDIUM_SPINNERS', 'HIGH_MEDIUM_SPINNERS'])
export const hpPumpOmzOutletType = pgEnum("hp_pump_omz_outlet_type", ['HP_ROOF_BAR', 'SPINNERS', 'HP_ROOF_BAR_SPINNERS'])
export const pressureWasherType = pgEnum("pressure_washer_type", ['L21_150BAR', 'L21_200BAR'])
export const railType = pgEnum("rail_type", ['DOWELED', 'WELDED'])
export const supplyFixType = pgEnum("supply_fix_type", ['POST', 'WALL'])
export const supplySide = pgEnum("supply_side", ['TBD', 'LEFT', 'RIGHT'])
export const supplyType = pgEnum("supply_type", ['STRAIGHT_SHELF', 'BOOM', 'CABLE_CHAIN'])
export const touchFixType = pgEnum("touch_fix_type", ['POST', 'WALL'])
export const touchPos = pgEnum("touch_pos", ['INTERNAL', 'EXTERNAL'])
export const water1PumpType = pgEnum("water_1_pump_type", ['BOOST_15KW', 'BOOST_22KW', 'INV_3KW_200L', 'INV_3KW_250L'])
export const water2PumpType = pgEnum("water_2_pump_type", ['BOOST_15KW', 'BOOST_22KW'])
export const waterTankType = pgEnum("water_tank_type", ['L2000', 'L2000_JOLLY', 'L2500', 'L4500'])
export const waterType = pgEnum("water_type", ['NETWORK', 'RECYCLED', 'DEMINERALIZED'])


export const waterTanks = pgTable("water_tanks", {
	id: integer().primaryKey().generatedAlwaysAsIdentity({ name: "water_tanks_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	waterTankType: waterTankType("water_tank_type").notNull(),
	inletWFloatQty: integer("inlet_w_float_qty").notNull(),
	inletNoFloatQty: integer("inlet_no_float_qty").notNull(),
	outletWValveQty: integer("outlet_w_valve_qty").notNull(),
	outletNoValveQty: integer("outlet_no_valve_qty").notNull(),
	hasBlower: boolean("has_blower").notNull(),
	createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { precision: 3, mode: 'string' }).defaultNow().notNull(),
	configurationId: integer("configuration_id").notNull(),
}, (table) => [
	foreignKey({
			columns: [table.configurationId],
			foreignColumns: [configurations.id],
			name: "water_tanks_configuration_id_configurations_id_fk"
		}).onDelete("cascade"),
]);

export const partNumbers = pgTable("part_numbers", {
	id: integer().primaryKey().generatedAlwaysAsIdentity({ name: "part_numbers_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	pn: varchar({ length: 25 }).notNull(),
	description: varchar({ length: 255 }).notNull(),
	createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { precision: 3, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("part_numbers_pn_unique").on(table.pn),
]);

export const configurations = pgTable("configurations", {
	id: integer().primaryKey().generatedAlwaysAsIdentity({ name: "configurations_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	name: varchar({ length: 255 }).notNull(),
	description: varchar({ length: 255 }),
	brushQty: integer("brush_qty").notNull(),
	brushType: brushType("brush_type"),
	brushColor: brushColor("brush_color"),
	hasShampooPump: boolean("has_shampoo_pump").notNull(),
	hasWaxPump: boolean("has_wax_pump").notNull(),
	hasChemicalPump: boolean("has_chemical_pump").notNull(),
	chemicalQty: integer("chemical_qty"),
	chemicalPumpPos: chemicalPumpPos("chemical_pump_pos"),
	hasFoam: boolean("has_foam").notNull(),
	hasAcidPump: boolean("has_acid_pump").notNull(),
	acidPumpPos: chemicalPumpPos("acid_pump_pos"),
	water1Type: waterType("water_1_type").notNull(),
	water1PumpType: water1PumpType("water_1_pump_type"),
	invPumpOutletDosatronQty: integer("inv_pump_outlet_dosatron_qty"),
	invPumpOutletPwQty: integer("inv_pump_outlet_pw_qty"),
	water2Type: waterType("water_2_type"),
	water2PumpType: water2PumpType("water_2_pump_type"),
	hasAntifreeze: boolean("has_antifreeze").notNull(),
	supplyType: supplyType("supply_type").notNull(),
	supplyFixType: supplyFixType("supply_fix_type"),
	supplySide: supplySide("supply_side").notNull(),
	hasPostFrame: boolean("has_post_frame").notNull(),
	energyChainWidth: energyChainWidth("energy_chain_width"),
	railType: railType("rail_type").notNull(),
	railLength: integer("rail_length").notNull(),
	railGuideQty: integer("rail_guide_qty").notNull(),
	touchQty: integer("touch_qty").notNull(),
	touchPos: touchPos("touch_pos"),
	touchFixType: touchFixType("touch_fix_type"),
	hasItecoweb: boolean("has_itecoweb").notNull(),
	hasCardReader: boolean("has_card_reader").notNull(),
	isFast: boolean("is_fast").notNull(),
	cardQty: integer("card_qty").notNull(),
	has15KwPump: boolean("has_15kw_pump").notNull(),
	pumpOutlet115Kw: hpPump15KwOutletType("pump_outlet_1_15kw"),
	pumpOutlet215Kw: hpPump15KwOutletType("pump_outlet_2_15kw"),
	has30KwPump: boolean("has_30kw_pump").notNull(),
	pumpOutlet130Kw: hpPump30KwOutletType("pump_outlet_1_30kw"),
	pumpOutlet230Kw: hpPump30KwOutletType("pump_outlet_2_30kw"),
	hasOmzPump: boolean("has_omz_pump").notNull(),
	pumpOutletOmz: hpPumpOmzOutletType("pump_outlet_omz"),
	hasChemicalRoofBar: boolean("has_chemical_roof_bar").notNull(),
	configurationStatus: configurationStatus("configuration_status").default('DRAFT').notNull(),
	createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { precision: 3, mode: 'string' }).defaultNow().notNull(),
});

export const washBays = pgTable("wash_bays", {
	id: integer().primaryKey().generatedAlwaysAsIdentity({ name: "wash_bays_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	hpLanceQty: integer("hp_lance_qty").notNull(),
	detLanceQty: integer("det_lance_qty").notNull(),
	hoseReelQty: integer("hose_reel_qty").notNull(),
	pressureWasherType: pressureWasherType("pressure_washer_type"),
	pressureWasherQty: integer("pressure_washer_qty"),
	hasGantry: boolean("has_gantry").notNull(),
	isFirstBay: boolean("is_first_bay").notNull(),
	hasBayDividers: boolean("has_bay_dividers").notNull(),
	createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { precision: 3, mode: 'string' }).defaultNow().notNull(),
	configurationId: integer("configuration_id").notNull(),
}, (table) => [
	foreignKey({
			columns: [table.configurationId],
			foreignColumns: [configurations.id],
			name: "wash_bays_configuration_id_configurations_id_fk"
		}).onDelete("cascade"),
]);

export const userProfiles = pgTable("user_profiles", {
	id: uuid().default(sql`auth.uid()`).primaryKey().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	email: varchar().notNull(),
}, (table) => [
	unique("user_profiles_email_key").on(table.email),
]);
