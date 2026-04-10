import type { ConfigurationWithWaterTanksAndWashBays } from "@/db/schemas";
import type { GeneralBOMConfig } from "@/lib/BOM";

/**
 * Full-field factory for GeneralBOMConfig (Configuration & { has_shelf_extension }).
 * Every field defaults to a safe "nothing enabled" state. Pass overrides to test
 * specific conditions.
 */
export function makeGeneralBOMConfig(
  overrides: Partial<GeneralBOMConfig> = {},
): GeneralBOMConfig {
  return {
    id: 1,
    name: "Test Machine",
    description: "",
    machine_type: "STD",
    brush_qty: 0,
    brush_type: null,
    brush_color: null,
    has_shampoo_pump: false,
    has_wax_pump: false,
    has_chemical_pump: false,
    chemical_qty: null,
    chemical_pump_pos: null,
    has_foam: false,
    has_acid_pump: false,
    acid_pump_pos: null,
    water_1_type: "NETWORK",
    water_1_pump: null,
    inv_pump_outlet_dosatron_qty: null,
    inv_pump_outlet_pw_qty: null,
    water_2_type: null,
    water_2_pump: null,
    has_antifreeze: false,
    supply_type: "STRAIGHT_SHELF",
    supply_fixing_type: null,
    supply_side: "LEFT",
    has_post_frame: false,
    rail_type: "ANCHORED",
    rail_length: 21,
    rail_guide_qty: 0,
    anchor_type: null,
    touch_qty: 1,
    touch_pos: "ON_PANEL",
    touch_fixing_type: null,
    has_itecoweb: false,
    has_card_reader: false,
    card_qty: 0,
    is_fast: false,
    emergency_stop_qty: 0,
    has_15kw_pump: false,
    has_15kw_pump_softstart: false,
    pump_outlet_1_15kw: null,
    pump_outlet_2_15kw: null,
    has_30kw_pump: false,
    pump_outlet_1_30kw: null,
    pump_outlet_2_30kw: null,
    chassis_wash_sensor_type: null,
    has_chassis_wash_plates: false,
    has_omz_pump: false,
    pump_outlet_omz: null,
    has_chemical_roof_bar: false,
    has_shelf_extension: false,
    sales_notes: "",
    engineering_notes: "",
    status: "DRAFT",
    user_id: "test-user-id",
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides,
  } as GeneralBOMConfig;
}

/**
 * Factory for ConfigurationWithWaterTanksAndWashBays (used in BOM.init() tests).
 * Extends makeGeneralBOMConfig with water_tanks and wash_bays arrays.
 */
export function makeConfigWithBaysAndTanks(
  overrides: Record<string, unknown> = {},
): ConfigurationWithWaterTanksAndWashBays {
  return {
    ...makeGeneralBOMConfig(),
    water_tanks: [],
    wash_bays: [],
    ...overrides,
  } as unknown as ConfigurationWithWaterTanksAndWashBays;
}

/**
 * Factory for a minimal WashBay record used in wash-bay BOM tests.
 */
export function makeWashBay(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    hp_lance_qty: 0,
    det_lance_qty: 0,
    hose_reel_qty: 0,
    pressure_washer_type: null,
    pressure_washer_qty: null,
    has_gantry: false,
    energy_chain_width: null,
    has_shelf_extension: false,
    is_first_bay: false,
    has_bay_dividers: false,
    created_at: new Date(),
    updated_at: new Date(),
    configuration_id: 1,
    ...overrides,
  };
}
