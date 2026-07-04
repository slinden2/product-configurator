import { pickRandom, randomInt } from "@/lib/dev/random";
import { STANDARD_MACHINE_HEIGHT_MM } from "@/types";
import {
  type ConfigSchema,
  configDefaults,
  configSchema,
} from "@/validation/config-schema";

/**
 * Hand-written schema-valid scenario presets for the dev fill button.
 *
 * Each scenario is a delta over `configDefaults` designed to satisfy the full
 * `configSchema`, including every cross-field superRefine rule. A scenario is a
 * function so it can randomize within its own constraint-safe value sets.
 * Exported for the validity test, which pins each scenario individually.
 */
export const DUMMY_CONFIG_SCENARIOS: ReadonlyArray<{
  key: string;
  values: () => Partial<ConfigSchema>;
}> = [
  {
    // Minimal valid STD machine: no brushes, no pumps.
    key: "minimal-std",
    values: () => ({
      brush_qty: 0,
      water_1_type: "NETWORK",
      supply_type: "STRAIGHT_SHELF",
      rail_type: "ANCHORED",
      rail_length: pickRandom([15, 18, 21] as const),
      anchor_type: "ZINC",
      touch_qty: 1,
      touch_pos: "EXTERNAL",
      touch_fixing_type: "WALL",
    }),
  },
  {
    // Three brushes with the full chemical package.
    key: "brushes-3-chem",
    values: () => ({
      brush_qty: 3,
      brush_type: pickRandom(["THREAD", "MIXED", "CARLITE"] as const),
      brush_color: pickRandom(["BLUE_SILVER", "GREEN_SILVER", "RED"] as const),
      has_chemical_pump: true,
      chemical_qty: pickRandom([1, 2] as const),
      chemical_pump_pos: "ONBOARD",
      has_acid_pump: true,
      // WASH_BAY avoids the "two onboard prewash pumps + onboard acid" rejection.
      acid_pump_pos: "WASH_BAY",
      has_shampoo_pump: true,
      has_wax_pump: true,
      has_foam: true,
      water_1_type: "NETWORK",
      water_1_pump: pickRandom(["BOOST_15KW", "BOOST_22KW"] as const),
      supply_type: "BOOM",
      supply_fixing_type: "WALL",
      rail_type: "WELDED",
      rail_length: pickRandom([25, 30, 32] as const),
      touch_qty: 2,
      touch_fixing_type: "WALL",
      has_itecoweb: true,
    }),
  },
  {
    // Energy chain: rail length must be >= 25 and post frame stays off.
    key: "energy-chain",
    values: () => ({
      brush_qty: 3,
      brush_type: "THREAD",
      brush_color: pickRandom(["BLUE_SILVER", "GREEN_BLACK"] as const),
      water_1_type: "NETWORK",
      supply_type: "ENERGY_CHAIN",
      supply_fixing_type: "POST",
      has_post_frame: false,
      rail_type: "ANCHORED",
      rail_length: pickRandom([25, 26, 30, 32] as const),
      anchor_type: "CHEMICAL",
      touch_qty: 1,
      touch_pos: "ON_PANEL",
    }),
  },
  {
    // Fast gantry: rail length is forced to 7 meters.
    key: "fast-machine",
    values: () => ({
      is_fast: true,
      brush_qty: 2,
      brush_type: "CARLITE",
      brush_color: pickRandom(["RED", "GREEN_SILVER"] as const),
      has_shampoo_pump: true,
      water_1_type: "NETWORK",
      supply_type: "STRAIGHT_SHELF",
      rail_type: "ANCHORED",
      rail_length: 7,
      anchor_type: "ZINC",
      touch_qty: 1,
      touch_pos: "ON_DET_CAB",
    }),
  },
  {
    // Two brushes plus the 15kW HP pump with a chassis-wash outlet.
    key: "brushes-2-hp15",
    values: () => ({
      brush_qty: 2,
      brush_type: "MIXED",
      brush_color: "GREEN_SILVER",
      water_1_type: "NETWORK",
      supply_type: "STRAIGHT_SHELF",
      rail_type: "WELDED",
      rail_length: pickRandom([18, 21] as const),
      touch_qty: 1,
      touch_pos: "EXTERNAL",
      touch_fixing_type: "POST",
      has_15kw_pump: true,
      has_15kw_pump_softstart: true,
      pump_outlet_1_15kw: "CHASSIS_WASH",
      pump_outlet_2_15kw: pickRandom(["LOW_BARS", "HIGH_BARS"] as const),
      chassis_wash_sensor_type: pickRandom([
        "SINGLE_POST",
        "DOUBLE_POST",
      ] as const),
      has_chassis_wash_plates: true,
      has_antifreeze: true,
      has_chassis_wash_detergent_pump: true,
      has_chassis_wash_detergent_manual_antifreeze: true,
    }),
  },
  {
    // Inverter pump on recycled water with a second network line.
    key: "dual-water-inverter",
    values: () => ({
      brush_qty: 3,
      brush_type: "THREAD",
      brush_color: "BLUE_SILVER",
      water_1_type: "RECYCLED",
      water_1_pump: pickRandom(["INV_3KW_200L", "INV_3KW_250L"] as const),
      inv_pump_outlet_dosatron_qty: 1,
      inv_pump_outlet_pw_qty: pickRandom([1, 2] as const),
      has_filter_backwash: true,
      water_2_type: "NETWORK",
      water_2_pump: "BOOST_22KW",
      supply_type: "STRAIGHT_SHELF",
      rail_type: "ANCHORED",
      rail_length: pickRandom([21, 25] as const),
      anchor_type: "ZINC",
      touch_qty: 2,
      touch_fixing_type: "WALL",
      has_card_reader: true,
      card_qty: randomInt(1, 6) * 50,
    }),
  },
];

const DESCRIPTIONS = [
  "",
  "Impianto di prova generato automaticamente.",
  "Configurazione demo per test interni.",
];

const SALES_NOTES = ["", "Nota commerciale di prova."];

const SAFE_HEIGHTS = [STANDARD_MACHINE_HEIGHT_MM, 5200, 5800];

/**
 * Builds a randomized, schema-valid configuration for the dev fill button.
 * Only fields with no cross-field rules are randomized freely; everything
 * constrained comes from a hand-written scenario preset (spread last, so a
 * scenario always wins over the free randomization).
 */
export function makeDummyConfig(): ConfigSchema {
  const scenario = pickRandom(DUMMY_CONFIG_SCENARIOS);
  // Not annotated as ConfigSchema: TS cannot re-narrow the spread against the
  // discriminated unions; validity is proven by the safeParse below instead.
  const candidate = {
    ...configDefaults,
    name: `Config prova ${scenario.key} #${randomInt(1000, 9999)}`,
    description: pickRandom(DESCRIPTIONS),
    sales_notes: pickRandom(SALES_NOTES),
    supply_side: pickRandom(["TBD", "LEFT", "RIGHT"] as const),
    rail_guide_qty: randomInt(0, 3),
    emergency_stop_qty: pickRandom([0, 1, 2] as const),
    total_height: pickRandom(SAFE_HEIGHTS),
    ...scenario.values(),
  };

  const result = configSchema.safeParse(candidate);
  if (!result.success) {
    console.error("makeDummyConfig produced an invalid config", result.error);
    // Fall back to the always-valid minimal scenario (pinned by tests).
    return configSchema.parse({
      ...configDefaults,
      name: `Config prova fallback #${randomInt(1000, 9999)}`,
      supply_side: "TBD",
      ...DUMMY_CONFIG_SCENARIOS[0].values(),
    });
  }
  return result.data;
}
