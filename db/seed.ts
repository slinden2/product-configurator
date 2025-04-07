import { db } from "@/db";
import { insertConfiguration } from "@/db/queries";
import { userProfiles } from "@/db/schemas";
import { configSchema } from "@/validation/config-schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

const configurationSimple: z.infer<typeof configSchema> = {
  name: "Cliente 1",
  description: "Tre spazzole semplice",
  brush_qty: 3,
  brush_type: "THREAD",
  brush_color: "BLUE_SILVER",
  water_1_type: "NETWORK",
  water_1_pump: null,
  water_2_type: null,
  water_2_pump: null,
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
  acid_pump_pos: null,
  supply_side: "RIGHT",
  supply_type: "BOOM",
  supply_fixing_type: "POST",
  has_post_frame: false,
  energy_chain_width: null,
  rail_type: "DOWELED",
  rail_length: 25,
  rail_guide_qty: 1,
  has_15kw_pump: false,
  pump_outlet_1_15kw: null,
  pump_outlet_2_15kw: null,
  has_30kw_pump: false,
  pump_outlet_1_30kw: null,
  pump_outlet_2_30kw: null,
  has_omz_pump: false,
  pump_outlet_omz: null,
  has_chemical_roof_bar: false,
  has_itecoweb: true,
  has_card_reader: true,
  card_qty: 100,
  is_fast: false,
  touch_qty: 1,
  touch_pos: "INTERNAL",
  touch_fixing_type: null,
  water_tanks: [],
  wash_bays: [],
};

const configurationComplicated: z.infer<typeof configSchema> = {
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
  acid_pump_pos: null,
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
  pump_outlet_1_30kw: null,
  pump_outlet_2_30kw: null,
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
  water_tanks: [
    {
      type: "L2500",
      inlet_w_float_qty: 1,
      inlet_no_float_qty: 0,
      outlet_w_valve_qty: 1,
      outlet_no_valve_qty: 0,
      has_blower: false,
    },
    {
      type: "L4500",
      inlet_w_float_qty: 0,
      inlet_no_float_qty: 1,
      outlet_w_valve_qty: 1,
      outlet_no_valve_qty: 1,
      has_blower: true,
    },
    {
      type: "L4500",
      inlet_w_float_qty: 0,
      inlet_no_float_qty: 0,
      outlet_w_valve_qty: 0,
      outlet_no_valve_qty: 1,
      has_blower: true,
    },
  ],
  wash_bays: [
    {
      hp_lance_qty: 2,
      det_lance_qty: 2,
      hose_reel_qty: 2,
      pressure_washer_type: "L21_200BAR",
      pressure_washer_qty: 2,
      has_gantry: true,
      is_first_bay: true,
      has_bay_dividers: true,
    },
  ],
};

const configurationFast: z.infer<typeof configSchema> = {
  name: "Cliente 3",
  description: "Portale fast a due spazzole",
  brush_qty: 2,
  brush_type: "THREAD",
  brush_color: "BLUE_SILVER",
  water_1_type: "NETWORK",
  water_1_pump: null,
  water_2_type: null,
  water_2_pump: null,
  has_antifreeze: true,
  inv_pump_outlet_dosatron_qty: 0,
  inv_pump_outlet_pw_qty: 0,
  has_shampoo_pump: false,
  has_wax_pump: false,
  has_chemical_pump: false,
  chemical_qty: null,
  chemical_pump_pos: null,
  has_foam: false,
  has_acid_pump: false,
  acid_pump_pos: null,
  supply_side: "LEFT",
  supply_type: "STRAIGHT_SHELF",
  supply_fixing_type: "WALL",
  has_post_frame: false,
  energy_chain_width: null,
  rail_type: "DOWELED",
  rail_length: 7,
  rail_guide_qty: 1,
  has_15kw_pump: false,
  pump_outlet_1_15kw: null,
  pump_outlet_2_15kw: null,
  has_30kw_pump: false,
  pump_outlet_1_30kw: null,
  pump_outlet_2_30kw: null,
  has_omz_pump: false,
  pump_outlet_omz: null,
  has_chemical_roof_bar: false,
  has_itecoweb: false,
  has_card_reader: false,
  card_qty: 0,
  is_fast: true,
  touch_qty: 1,
  touch_pos: "INTERNAL",
  touch_fixing_type: null,
  water_tanks: [],
  wash_bays: [],
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

  const confArrWithUserId = confArr.map(
    (conf): z.infer<typeof configSchema> & { user_id: string } => ({
      ...conf,
      user_id: user.id,
    })
  );

  for (const conf of confArrWithUserId) {
    await insertConfiguration(conf, conf.water_tanks, conf.wash_bays);
  }
}

await seedDb();
