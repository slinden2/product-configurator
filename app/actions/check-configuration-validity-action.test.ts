// @vitest-environment jsdom

import { beforeEach, describe, expect, test, vi } from "vitest";

// --- Mocks ---

const mockGetUserData = vi.fn();
const mockGetConfigurationWithTanksAndBays = vi.fn();

vi.mock("@/db/queries", () => ({
  getUserData: (...args: unknown[]) => mockGetUserData(...args),
  getConfigurationWithTanksAndBays: (...args: unknown[]) =>
    mockGetConfigurationWithTanksAndBays(...args),
}));

// --- Imports (after mocks) ---

import { checkConfigurationValidityAction } from "@/app/actions/check-configuration-validity-action";
import { MSG } from "@/lib/messages";

// --- Helpers ---

/**
 * Full DB-shaped configuration row that passes configSchema.safeParse.
 * Uses null (not undefined) for optional fields — mirrors what Drizzle returns.
 * transformDbNullToUndefined converts them inside the action.
 */
function makeValidDbConfig(overrides: Record<string, unknown> = {}) {
  return {
    id: 10,
    user_id: "engineer-1",
    status: "SUBMITTED",
    name: "Offerta Valida",
    machine_type: "STD",
    description: "",
    sales_notes: "",
    engineering_notes: "",
    // brush — 0 brushes, no type/color required
    brush_qty: 0,
    brush_type: null,
    brush_color: null,
    // chem pump — all off
    has_shampoo_pump: false,
    has_wax_pump: false,
    has_chemical_pump: false,
    chemical_qty: null,
    chemical_pump_pos: null,
    has_foam: false,
    has_acid_pump: false,
    acid_pump_pos: null,
    // water supply — network water, no pump, no inverter outlets
    water_1_type: "NETWORK",
    water_1_pump: null,
    water_2_type: null,
    water_2_pump: null,
    has_antifreeze: false,
    has_filter_backwash: false,
    inv_pump_outlet_dosatron_qty: 0,
    inv_pump_outlet_pw_qty: 0,
    // supply — straight shelf (no fixing type required)
    supply_type: "STRAIGHT_SHELF",
    supply_fixing_type: null,
    supply_side: "LEFT",
    has_post_frame: false,
    // rail — welded (no anchor type required)
    rail_type: "WELDED",
    rail_length: 21,
    rail_guide_qty: 0,
    anchor_type: null,
    // touch — 1 panel on-panel (no fixing type required for internal pos)
    touch_qty: 1,
    touch_pos: "ON_PANEL",
    touch_fixing_type: null,
    has_itecoweb: false,
    has_card_reader: false,
    card_qty: 0,
    is_fast: false,
    emergency_stop_qty: 0,
    // hp pump — all off, all outlets undefined
    has_15kw_pump: false,
    has_15kw_pump_softstart: false,
    pump_outlet_1_15kw: null,
    pump_outlet_2_15kw: null,
    has_30kw_pump: false,
    pump_outlet_1_30kw: null,
    pump_outlet_2_30kw: null,
    has_75kw_pump: false,
    pump_outlet_1_75kw: null,
    pump_outlet_2_75kw: null,
    has_omz_pump: false,
    pump_outlet_omz: null,
    has_chemical_roof_bar: false,
    has_chassis_wash_plates: false,
    chassis_wash_sensor_type: null,
    created_at: new Date(),
    updated_at: new Date(),
    water_tanks: [],
    wash_bays: [],
    ...overrides,
  };
}

/**
 * Minimal valid DB-shaped water tank row (passes waterTankSchema.safeParse).
 * Uses outlet_w_valve_qty: 1 to satisfy the "at least one outlet" superRefine.
 */
function makeValidDbWaterTank(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    configuration_id: 10,
    type: "L2000",
    inlet_w_float_qty: 0,
    inlet_no_float_qty: 0,
    outlet_w_valve_qty: 1,
    outlet_no_valve_qty: 0,
    has_blower: false,
    has_electric_float_for_purifier: false,
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides,
  };
}

/**
 * Minimal valid DB-shaped wash bay row (passes washBaySchema.safeParse).
 */
function makeValidDbWashBay(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    configuration_id: 10,
    hp_lance_qty: 0,
    det_lance_qty: 0,
    hose_reel_hp_with_post_qty: 0,
    hose_reel_hp_without_post_qty: 0,
    hose_reel_det_with_post_qty: 0,
    hose_reel_det_without_post_qty: 0,
    hose_reel_hp_det_with_post_qty: 0,
    pressure_washer_type: null,
    pressure_washer_qty: null,
    has_gantry: false,
    energy_chain_width: null,
    has_shelf_extension: false,
    ec_signal_cable_qty: null,
    ec_profinet_cable_qty: null,
    ec_water_1_tube_qty: null,
    ec_water_34_tube_qty: null,
    ec_r1_1_tube_qty: null,
    ec_r2_1_tube_qty: null,
    ec_r2_34_inox_tube_qty: null,
    ec_air_tube_qty: null,
    is_first_bay: false,
    has_bay_dividers: false,
    has_weeping_lances: false,
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides,
  };
}

// --- Tests ---

describe("checkConfigurationValidityAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUserData.mockResolvedValue({
      id: "engineer-1",
      role: "ENGINEER" as const,
      initials: "EN",
    });
    mockGetConfigurationWithTanksAndBays.mockResolvedValue(makeValidDbConfig());
  });

  test("valid config + no tanks + no bays → hasValidationIssues: false", async () => {
    const result = await checkConfigurationValidityAction(10);

    expect(result).toEqual({ success: true, hasValidationIssues: false });
  });

  test("valid config + valid tank + valid bay → hasValidationIssues: false", async () => {
    mockGetConfigurationWithTanksAndBays.mockResolvedValue(
      makeValidDbConfig({
        water_tanks: [makeValidDbWaterTank()],
        wash_bays: [makeValidDbWashBay()],
      }),
    );

    const result = await checkConfigurationValidityAction(10);

    expect(result).toEqual({ success: true, hasValidationIssues: false });
  });

  test("config shape drift (brush_qty out of allowed range) → hasValidationIssues: true", async () => {
    // brush_qty must be 0, 2, or 3 — 99 fails the brushSchema .refine
    mockGetConfigurationWithTanksAndBays.mockResolvedValue(
      makeValidDbConfig({ brush_qty: 99 }),
    );

    const result = await checkConfigurationValidityAction(10);

    expect(result).toEqual({ success: true, hasValidationIssues: true });
  });

  test("config superRefine drift (is_fast with rail_length > 7) → hasValidationIssues: true", async () => {
    // configSchema superRefine: is_fast + rail_length > 7 → issue
    mockGetConfigurationWithTanksAndBays.mockResolvedValue(
      makeValidDbConfig({ is_fast: true, rail_length: 21 }),
    );

    const result = await checkConfigurationValidityAction(10);

    expect(result).toEqual({ success: true, hasValidationIssues: true });
  });

  test("wash bay drift (pressure_washer_qty exceeds max) → hasValidationIssues: true", async () => {
    // washBaySchema: pressure_washer_qty max is 3
    mockGetConfigurationWithTanksAndBays.mockResolvedValue(
      makeValidDbConfig({
        wash_bays: [makeValidDbWashBay({ pressure_washer_qty: 5 })],
      }),
    );

    const result = await checkConfigurationValidityAction(10);

    expect(result).toEqual({ success: true, hasValidationIssues: true });
  });

  test("water tank drift (type null → undefined) → hasValidationIssues: true", async () => {
    // waterTankSchema superRefine: type === undefined → required error
    mockGetConfigurationWithTanksAndBays.mockResolvedValue(
      makeValidDbConfig({
        water_tanks: [makeValidDbWaterTank({ type: null })],
      }),
    );

    const result = await checkConfigurationValidityAction(10);

    expect(result).toEqual({ success: true, hasValidationIssues: true });
  });

  test("multiple tanks: one valid, one with drift → hasValidationIssues: true", async () => {
    mockGetConfigurationWithTanksAndBays.mockResolvedValue(
      makeValidDbConfig({
        water_tanks: [
          makeValidDbWaterTank(),
          makeValidDbWaterTank({ id: 2, type: null }),
        ],
      }),
    );

    const result = await checkConfigurationValidityAction(10);

    expect(result).toEqual({ success: true, hasValidationIssues: true });
  });

  test("returns error for invalid sourceId (string)", async () => {
    const result = await checkConfigurationValidityAction("not-a-number");

    expect(result).toEqual({ success: false, error: MSG.config.notFound });
    expect(mockGetUserData).not.toHaveBeenCalled();
  });

  test("returns error for invalid sourceId (negative)", async () => {
    const result = await checkConfigurationValidityAction(-5);

    expect(result).toEqual({ success: false, error: MSG.config.notFound });
    expect(mockGetUserData).not.toHaveBeenCalled();
  });

  test("returns error when user is not authenticated", async () => {
    mockGetUserData.mockResolvedValue(null);

    const result = await checkConfigurationValidityAction(10);

    expect(result).toEqual({
      success: false,
      error: MSG.auth.userNotAuthenticated,
    });
    expect(mockGetConfigurationWithTanksAndBays).not.toHaveBeenCalled();
  });

  test("returns error when source config is not found", async () => {
    mockGetConfigurationWithTanksAndBays.mockResolvedValue(null);

    const result = await checkConfigurationValidityAction(10);

    expect(result).toEqual({ success: false, error: MSG.config.notFound });
  });
});
