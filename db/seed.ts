import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  configurations,
  surchargeSettings,
  userProfiles,
  washBays,
  waterTanks,
} from "@/db/schemas";
import type { ConfigSchema } from "@/validation/config-schema";
import type { WashBaySchema } from "@/validation/wash-bay-schema";
import { transformConfigToDbInsert } from "./transformations";

const configurationSimple: ConfigSchema = {
  name: "Cliente 1",
  description: "Tre spazzole semplice",
  machine_type: "STD",
  sales_notes: "",
  engineering_notes: "",
  brush_qty: 3,
  brush_type: "THREAD",
  brush_color: "BLUE_SILVER",
  water_1_type: "NETWORK",
  water_1_pump: undefined,
  water_2_type: undefined,
  water_2_pump: undefined,
  has_antifreeze: true,
  has_filter_backwash: false,
  inv_pump_outlet_dosatron_qty: 0,
  inv_pump_outlet_pw_qty: 0,
  has_shampoo_pump: true,
  has_wax_pump: true,
  has_chemical_pump: true,
  chemical_qty: 1,
  chemical_pump_pos: "ONBOARD",
  has_foam: false,
  has_acid_pump: false,
  acid_pump_pos: undefined,
  supply_side: "RIGHT",
  supply_type: "BOOM",
  supply_fixing_type: "POST",
  has_post_frame: false,
  rail_type: "ANCHORED",
  rail_length: 25,
  rail_guide_qty: 1,
  anchor_type: "ZINC",
  has_15kw_pump: false,
  has_15kw_pump_softstart: false,
  pump_outlet_1_15kw: undefined,
  pump_outlet_2_15kw: undefined,
  has_30kw_pump: false,
  pump_outlet_1_30kw: undefined,
  pump_outlet_2_30kw: undefined,
  has_75kw_pump: false,
  pump_outlet_1_75kw: undefined,
  pump_outlet_2_75kw: undefined,
  has_omz_pump: false,
  pump_outlet_omz: undefined,
  has_omz_paint: false,
  total_height: undefined,
  has_chemical_roof_bar: false,
  chassis_wash_sensor_type: undefined,
  has_chassis_wash_plates: false,
  has_itecoweb: true,
  has_card_reader: false,
  card_qty: 100,
  is_fast: false,
  emergency_stop_qty: 0,
  touch_qty: 1,
  touch_pos: "ON_PANEL",
  touch_fixing_type: undefined,
};

const configurationComplicated: ConfigSchema = {
  name: "Cliente 2",
  description: "Tre spazzole complesso",
  machine_type: "STD",
  sales_notes: "",
  engineering_notes: "",
  brush_qty: 3,
  brush_type: "THREAD",
  brush_color: "BLUE_SILVER",
  water_1_type: "NETWORK",
  water_1_pump: "INV_3KW_200L",
  water_2_type: "RECYCLED",
  water_2_pump: "BOOST_15KW",
  has_antifreeze: true,
  has_filter_backwash: false,
  inv_pump_outlet_dosatron_qty: 1,
  inv_pump_outlet_pw_qty: 2,
  has_shampoo_pump: true,
  has_wax_pump: true,
  has_chemical_pump: true,
  chemical_qty: 1,
  chemical_pump_pos: "WASH_BAY",
  has_foam: true,
  has_acid_pump: false,
  acid_pump_pos: undefined,
  supply_side: "RIGHT",
  supply_type: "ENERGY_CHAIN",
  supply_fixing_type: "POST",
  has_post_frame: false,
  rail_type: "ANCHORED",
  rail_length: 26,
  rail_guide_qty: 2,
  anchor_type: "ZINC",
  has_15kw_pump: true,
  has_15kw_pump_softstart: false,
  pump_outlet_1_15kw: "CHASSIS_WASH",
  pump_outlet_2_15kw: "LOW_SPINNERS",
  has_30kw_pump: false,
  pump_outlet_1_30kw: undefined,
  pump_outlet_2_30kw: undefined,
  has_75kw_pump: false,
  pump_outlet_1_75kw: undefined,
  pump_outlet_2_75kw: undefined,
  has_omz_pump: true,
  pump_outlet_omz: "HP_ROOF_BAR_SPINNERS",
  has_omz_paint: true,
  total_height: undefined,
  has_chemical_roof_bar: true,
  chassis_wash_sensor_type: "SINGLE_POST",
  has_chassis_wash_plates: false,
  has_itecoweb: true,
  has_card_reader: false,
  card_qty: 100,
  is_fast: false,
  emergency_stop_qty: 0,
  touch_qty: 1,
  touch_pos: "EXTERNAL",
  touch_fixing_type: "POST",
};

const getWashBayComplicated = (
  id: number,
): WashBaySchema & { configuration_id: number } => ({
  configuration_id: id,
  hp_lance_qty: 2,
  det_lance_qty: 2,
  hose_reel_hp_with_post_qty: 0,
  hose_reel_hp_without_post_qty: 0,
  hose_reel_det_with_post_qty: 0,
  hose_reel_det_without_post_qty: 0,
  hose_reel_hp_det_with_post_qty: 0,
  has_gantry: true,
  energy_chain_width: "L250",
  has_shelf_extension: false,
  ec_signal_cable_qty: 1,
  ec_profinet_cable_qty: 1,
  ec_water_1_tube_qty: 2,
  ec_water_34_tube_qty: 0,
  ec_r1_1_tube_qty: 1,
  ec_r2_1_tube_qty: 1,
  ec_r2_34_inox_tube_qty: 0,
  ec_air_tube_qty: 1,
  is_first_bay: true,
  has_bay_dividers: false,
  has_weeping_lances: false,
});

const configurationFast: ConfigSchema = {
  name: "Cliente 3",
  description: "Portale fast a due spazzole",
  machine_type: "STD",
  sales_notes: "",
  engineering_notes: "",
  brush_qty: 2,
  brush_type: "THREAD",
  brush_color: "BLUE_SILVER",
  water_1_type: "NETWORK",
  water_1_pump: undefined,
  water_2_type: undefined,
  water_2_pump: undefined,
  has_antifreeze: true,
  has_filter_backwash: false,
  inv_pump_outlet_dosatron_qty: 0,
  inv_pump_outlet_pw_qty: 0,
  has_shampoo_pump: false,
  has_wax_pump: false,
  has_chemical_pump: false,
  chemical_qty: undefined,
  chemical_pump_pos: undefined,
  has_foam: false,
  has_acid_pump: false,
  acid_pump_pos: undefined,
  supply_side: "LEFT",
  supply_type: "STRAIGHT_SHELF",
  supply_fixing_type: "WALL",
  has_post_frame: false,
  rail_type: "ANCHORED",
  rail_length: 7,
  rail_guide_qty: 1,
  anchor_type: "ZINC",
  has_15kw_pump: false,
  has_15kw_pump_softstart: false,
  pump_outlet_1_15kw: undefined,
  pump_outlet_2_15kw: undefined,
  has_30kw_pump: false,
  pump_outlet_1_30kw: undefined,
  pump_outlet_2_30kw: undefined,
  has_75kw_pump: false,
  pump_outlet_1_75kw: undefined,
  pump_outlet_2_75kw: undefined,
  has_omz_pump: false,
  pump_outlet_omz: undefined,
  has_omz_paint: false,
  total_height: undefined,
  has_chemical_roof_bar: false,
  chassis_wash_sensor_type: undefined,
  has_chassis_wash_plates: false,
  has_itecoweb: false,
  has_card_reader: false,
  card_qty: 0,
  is_fast: true,
  emergency_stop_qty: 0,
  touch_qty: 1,
  touch_pos: "ON_PANEL",
  touch_fixing_type: undefined,
};

async function seedDb() {
  const shouldReset = process.argv.includes("--reset");

  if (shouldReset) {
    console.log("⚠️ Reset flag detected. Cleaning up existing data...");

    await db.delete(surchargeSettings);
    await db.delete(waterTanks);
    await db.delete(washBays);
    await db.delete(configurations);

    await db.execute(
      sql`ALTER SEQUENCE surcharge_settings_id_seq RESTART WITH 1`,
    );
    await db.execute(sql`ALTER SEQUENCE water_tanks_id_seq RESTART WITH 1`);
    await db.execute(sql`ALTER SEQUENCE wash_bays_id_seq RESTART WITH 1`);
    await db.execute(sql`ALTER SEQUENCE configurations_id_seq RESTART WITH 1`);

    console.log("✅ Database cleared.");
  }

  const confArr = [
    configurationSimple,
    configurationComplicated,
    configurationFast,
  ];

  const adminUser = await db.query.userProfiles.findFirst({
    where: eq(userProfiles.email, "samu@itecosrl.com"),
  });

  if (!adminUser) {
    throw new Error("Admin user not found.");
  }

  const externalUser = await db.query.userProfiles.findFirst({
    where: eq(userProfiles.email, "externaltest@itecosrl.com"),
  });

  if (!externalUser) {
    throw new Error("External user not found.");
  }

  const internalUser = await db.query.userProfiles.findFirst({
    where: eq(userProfiles.email, "internaltest@itecosrl.com"),
  });

  if (!internalUser) {
    throw new Error("Internal user not found.");
  }

  const userArr = [adminUser, externalUser, internalUser];

  console.log("🌱 Starting seeding...");

  for (const [index, conf] of confArr.entries()) {
    const dbData = transformConfigToDbInsert(conf, userArr[index].id);
    const [inserted] = await db
      .insert(configurations)
      .values(dbData)
      .returning({ id: configurations.id });

    if (conf === configurationComplicated && inserted) {
      await db.insert(washBays).values(getWashBayComplicated(inserted.id));
    }
  }

  console.log("🌱 Seeding surcharge settings...");
  await db
    .insert(surchargeSettings)
    .values([
      { kind: "HEIGHT", price: "1500.00" },
      { kind: "PAINT", price: "1200.00" },
    ])
    .onConflictDoNothing({ target: surchargeSettings.kind });
}

await seedDb();
