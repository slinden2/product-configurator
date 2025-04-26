import { db } from "@/db";
import { configurations, userProfiles } from "@/db/schemas";
import { ConfigSchema } from "@/validation/config-schema";
import { eq } from "drizzle-orm";
import { transformConfigToDbInsert } from "./transformations";

const configurationSimple: ConfigSchema = {
  name: "Cliente 1",
  description: "Tre spazzole semplice",
  brush_qty: 3,
  brush_type: "THREAD",
  brush_color: "BLUE_SILVER",
  water_1_type: "NETWORK",
  water_1_pump: undefined,
  water_2_type: undefined,
  water_2_pump: undefined,
  has_antifreeze: true,
  inv_pump_outlet_dosatron_qty: 0,
  inv_pump_outlet_pw_qty: 0,
  has_shampoo_pump: true,
  has_wax_pump: true,
  has_chemical_pump: true,
  chemical_qty: 1,
  chemical_pump_pos: "ABOARD",
  has_foam: false,
  has_acid_pump: false,
  acid_pump_pos: undefined,
  supply_side: "RIGHT",
  supply_type: "BOOM",
  supply_fixing_type: "POST",
  has_post_frame: false,
  energy_chain_width: undefined,
  rail_type: "DOWELED",
  rail_length: 25,
  rail_guide_qty: 1,
  has_15kw_pump: false,
  pump_outlet_1_15kw: undefined,
  pump_outlet_2_15kw: undefined,
  has_30kw_pump: false,
  pump_outlet_1_30kw: undefined,
  pump_outlet_2_30kw: undefined,
  has_omz_pump: false,
  pump_outlet_omz: undefined,
  has_chemical_roof_bar: false,
  has_itecoweb: true,
  has_card_reader: true,
  card_qty: 100,
  is_fast: false,
  touch_qty: 1,
  touch_pos: "INTERNAL",
  touch_fixing_type: undefined,
};

const configurationComplicated: ConfigSchema = {
  name: "Cliente 2",
  description: "Tre spazzole complesso",
  brush_qty: 3,
  brush_type: "THREAD",
  brush_color: "BLUE_SILVER",
  water_1_type: "NETWORK",
  water_1_pump: "INV_3KW_200L",
  water_2_type: "RECYCLED",
  water_2_pump: "BOOST_15KW",
  has_antifreeze: true,
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
  supply_type: "CABLE_CHAIN",
  supply_fixing_type: "POST",
  has_post_frame: false,
  energy_chain_width: "L250",
  rail_type: "DOWELED",
  rail_length: 26,
  rail_guide_qty: 2,
  has_15kw_pump: true,
  pump_outlet_1_15kw: "CHASSIS_WASH",
  pump_outlet_2_15kw: "LOW_SPINNERS",
  has_30kw_pump: false,
  pump_outlet_1_30kw: undefined,
  pump_outlet_2_30kw: undefined,
  has_omz_pump: true,
  pump_outlet_omz: "HP_ROOF_BAR_SPINNERS",
  has_chemical_roof_bar: true,
  has_itecoweb: true,
  has_card_reader: true,
  card_qty: 100,
  is_fast: false,
  touch_qty: 1,
  touch_pos: "EXTERNAL",
  touch_fixing_type: "POST",
};

const configurationFast: ConfigSchema = {
  name: "Cliente 3",
  description: "Portale fast a due spazzole",
  brush_qty: 2,
  brush_type: "THREAD",
  brush_color: "BLUE_SILVER",
  water_1_type: "NETWORK",
  water_1_pump: undefined,
  water_2_type: undefined,
  water_2_pump: undefined,
  has_antifreeze: true,
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
  energy_chain_width: undefined,
  rail_type: "DOWELED",
  rail_length: 7,
  rail_guide_qty: 1,
  has_15kw_pump: false,
  pump_outlet_1_15kw: undefined,
  pump_outlet_2_15kw: undefined,
  has_30kw_pump: false,
  pump_outlet_1_30kw: undefined,
  pump_outlet_2_30kw: undefined,
  has_omz_pump: false,
  pump_outlet_omz: undefined,
  has_chemical_roof_bar: false,
  has_itecoweb: false,
  has_card_reader: false,
  card_qty: 0,
  is_fast: true,
  touch_qty: 1,
  touch_pos: "INTERNAL",
  touch_fixing_type: undefined,
};

async function seedDb() {
  const confArr = [
    configurationSimple,
    configurationComplicated,
    configurationFast,
  ];

  const user = await db.query.userProfiles.findFirst({
    where: eq(userProfiles.email, "samu@itecosrl.com"),
  });

  if (!user) {
    throw new Error("Admin user not found.");
  }

  for (const conf of confArr) {
    const dbData = transformConfigToDbInsert(conf, user.id);
    await db.insert(configurations).values(dbData);
  }
}

await seedDb();
