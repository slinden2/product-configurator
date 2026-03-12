import { vi, describe, test, expect } from "vitest";

vi.mock("@/db", () => ({ db: { query: { partNumbers: { findMany: vi.fn().mockResolvedValue([]) } } } }));
vi.mock("@/db/queries", () => ({ getPartNumbersByArray: vi.fn().mockResolvedValue([]) }));

import { hpPumpBOM } from "@/lib/BOM/max-bom/hp-pump-bom";
import type { GeneralBOMConfig } from "@/lib/BOM";

function makeConfig(overrides: Partial<GeneralBOMConfig> = {}): GeneralBOMConfig {
  return {
    id: 1,
    has_15kw_pump: false,
    pump_outlet_1_15kw: null,
    pump_outlet_2_15kw: null,
    has_30kw_pump: false,
    pump_outlet_1_30kw: null,
    pump_outlet_2_30kw: null,
    has_omz_pump: false,
    pump_outlet_omz: null,
    has_antifreeze: false,
    has_chemical_roof_bar: false,
    supply_side: "LEFT",
    supply_type: "STRAIGHT_SHELF",
    supply_fixing_type: null,
    has_shelf_extension: false,
    ...overrides,
  } as GeneralBOMConfig;
}

const pns = (config: GeneralBOMConfig) =>
  hpPumpBOM
    .filter((item) => item.conditions.every((fn) => fn(config)))
    .map((item) => item.pn);

const qty = (config: GeneralBOMConfig, pn: string) => {
  const item = hpPumpBOM.find(
    (i) => i.pn === pn && i.conditions.every((fn) => fn(config))
  );
  if (!item) return undefined;
  return typeof item.qty === "function" ? item.qty(config) : item.qty;
};

const PNS = {
  PUMP_15KW: "1100.024.030",
  PUMP_30KW: "1100.024.031",
  OMZ_PUMP: "510.01.002",
  PNEUMATIC_VALVE_15KW_WITH_ANTIFREEZE: "1100.024.040",
  PNEUMATIC_VALVE_15KW_NO_ANTIFREEZE: "1100.024.041",
  TWO_PNEUMATIC_VALVES_15KW_WITH_ANTIFREEZE: "1100.024.042",
  TWO_PNEUMATIC_VALVES_15KW_NO_ANTIFREEZE: "1100.024.043",
  PNEUMATIC_VALVE_30KW_WITH_ANTIFREEZE: "1100.024.044",
  PNEUMATIC_VALVE_30KW_NO_ANTIFREEZE: "1100.024.045",
  TWO_PNEUMATIC_VALVES_30KW_WITH_ANTIFREEZE: "1100.024.046",
  TWO_PNEUMATIC_VALVES_30KW_NO_ANTIFREEZE: "1100.024.047",
  CHASSIS_WASH_15KW: "1100.024.004",
  CHASSIS_WASH_30KW_HORIZONTAL: "1100.024.100",
  CHASSIS_WASH_30KW_WITH_LATERAL_BARS: "1100.024.003",
  ULTRASONIC_SENSOR_POST: "1100.021.000",
  MID_HEIGHT_HP_BARS: "1100.036.005",
  FULL_HEIGHT_HP_BARS: "1100.036.000",
  LOW_SPINNERS_2X150L: "940.11.000",
  HIGH_BARS_2X150L_LOW_SPINNERS_2X150: "940.08.000",
  LOW_MEDIUM_SPINNERS_4X150L: "940.13.001",
  HIGH_MEDIUM_SPINNERS_4X150L: "940.13.000",
  HP_ROOF_BAR: "450.50.000",
  CHEMICAL_ROOF_BAR: "450.50.300",
  HIGH_SPINNERS_4X43L: "940.12.000",
  HP_VALVE_ASSY: "450.50.301",
  HOSE_RIGHT_SHELF_TO_VALVE_ASSY_4_SPINNERS: "9000.530.030",
  HOSE_LEFT_SHELF_TO_VALVE_ASSY_4_SPINNERS: "9000.530.031",
  HOSE_SHELF_TO_T_FITTING_2_SPINNERS: "9000.530.024",
  HOSE_RIGHT_SHELF_TO_VALVE_ASSY_4_SPINNERS_W_EXT: "9000.530.036",
  HOSE_LEFT_SHELF_TO_VALVE_ASSY_4_SPINNERS_W_EXT: "9000.530.037",
  HOSE_SHELF_TO_T_FITTING_2_SPINNERS_W_EXT: "9000.530.035",
};

describe("hpPumpBOM — pump selection", () => {
  test("has_15kw_pump → 15kW pump included", () => {
    expect(pns(makeConfig({ has_15kw_pump: true }))).toContain(PNS.PUMP_15KW);
  });

  test("has_30kw_pump → 30kW pump included", () => {
    expect(pns(makeConfig({ has_30kw_pump: true }))).toContain(PNS.PUMP_30KW);
  });

  test("has_omz_pump → OMZ pump included", () => {
    expect(pns(makeConfig({ has_omz_pump: true }))).toContain(PNS.OMZ_PUMP);
  });

  test("no pumps → no pump items", () => {
    const result = pns(makeConfig());
    expect(result).not.toContain(PNS.PUMP_15KW);
    expect(result).not.toContain(PNS.PUMP_30KW);
    expect(result).not.toContain(PNS.OMZ_PUMP);
  });
});

describe("hpPumpBOM — 15kW pneumatic valves", () => {
  test("15kW + one outlet + has_antifreeze → single valve with antifreeze", () => {
    const config = makeConfig({ has_15kw_pump: true, pump_outlet_1_15kw: "LOW_SPINNERS", has_antifreeze: true });
    expect(pns(config)).toContain(PNS.PNEUMATIC_VALVE_15KW_WITH_ANTIFREEZE);
    expect(pns(config)).not.toContain(PNS.TWO_PNEUMATIC_VALVES_15KW_WITH_ANTIFREEZE);
  });

  test("15kW + one outlet + !has_antifreeze → single valve no antifreeze", () => {
    const config = makeConfig({ has_15kw_pump: true, pump_outlet_1_15kw: "LOW_SPINNERS", has_antifreeze: false });
    expect(pns(config)).toContain(PNS.PNEUMATIC_VALVE_15KW_NO_ANTIFREEZE);
    expect(pns(config)).not.toContain(PNS.PNEUMATIC_VALVE_15KW_WITH_ANTIFREEZE);
  });

  test("15kW + two outlets + has_antifreeze → two valves with antifreeze", () => {
    const config = makeConfig({
      has_15kw_pump: true,
      pump_outlet_1_15kw: "LOW_SPINNERS",
      pump_outlet_2_15kw: "CHASSIS_WASH",
      has_antifreeze: true,
    });
    expect(pns(config)).toContain(PNS.TWO_PNEUMATIC_VALVES_15KW_WITH_ANTIFREEZE);
    expect(pns(config)).not.toContain(PNS.PNEUMATIC_VALVE_15KW_WITH_ANTIFREEZE);
  });

  test("15kW + two outlets + !has_antifreeze → two valves no antifreeze", () => {
    const config = makeConfig({
      has_15kw_pump: true,
      pump_outlet_1_15kw: "LOW_SPINNERS",
      pump_outlet_2_15kw: "CHASSIS_WASH",
      has_antifreeze: false,
    });
    expect(pns(config)).toContain(PNS.TWO_PNEUMATIC_VALVES_15KW_NO_ANTIFREEZE);
  });
});

describe("hpPumpBOM — 30kW pneumatic valves", () => {
  test("30kW + one outlet + !has_antifreeze → single valve no antifreeze", () => {
    const config = makeConfig({ has_30kw_pump: true, pump_outlet_1_30kw: "HIGH_MEDIUM_SPINNERS", has_antifreeze: false });
    expect(pns(config)).toContain(PNS.PNEUMATIC_VALVE_30KW_NO_ANTIFREEZE);
  });

  test("30kW + two outlets + has_antifreeze → two valves with antifreeze", () => {
    const config = makeConfig({
      has_30kw_pump: true,
      pump_outlet_1_30kw: "HIGH_MEDIUM_SPINNERS",
      pump_outlet_2_30kw: "LOW_MEDIUM_SPINNERS",
      has_antifreeze: true,
    });
    expect(pns(config)).toContain(PNS.TWO_PNEUMATIC_VALVES_30KW_WITH_ANTIFREEZE);
  });
});

describe("hpPumpBOM — chassis wash", () => {
  test("15kW + outlet=CHASSIS_WASH → chassis wash 15kW + ultrasonic sensor", () => {
    const config = makeConfig({ has_15kw_pump: true, pump_outlet_1_15kw: "CHASSIS_WASH" });
    expect(pns(config)).toContain(PNS.CHASSIS_WASH_15KW);
    expect(pns(config)).toContain(PNS.ULTRASONIC_SENSOR_POST);
  });

  test("30kW + outlet=CHASSIS_WASH_HORIZONTAL → chassis wash 30kW horizontal + ultrasonic", () => {
    const config = makeConfig({ has_30kw_pump: true, pump_outlet_1_30kw: "CHASSIS_WASH_HORIZONTAL" });
    expect(pns(config)).toContain(PNS.CHASSIS_WASH_30KW_HORIZONTAL);
    expect(pns(config)).toContain(PNS.ULTRASONIC_SENSOR_POST);
  });

  test("30kW + outlet=CHASSIS_WASH_LATERAL_HORIZONTAL → chassis wash 30kW with lateral bars", () => {
    const config = makeConfig({ has_30kw_pump: true, pump_outlet_1_30kw: "CHASSIS_WASH_LATERAL_HORIZONTAL" });
    expect(pns(config)).toContain(PNS.CHASSIS_WASH_30KW_WITH_LATERAL_BARS);
  });
});

describe("hpPumpBOM — HP bars and spinners (15kW)", () => {
  test("15kW + LOW_BARS → mid-height HP bars", () => {
    const config = makeConfig({ has_15kw_pump: true, pump_outlet_1_15kw: "LOW_BARS" });
    expect(pns(config)).toContain(PNS.MID_HEIGHT_HP_BARS);
  });

  test("15kW + HIGH_BARS → full-height HP bars", () => {
    const config = makeConfig({ has_15kw_pump: true, pump_outlet_1_15kw: "HIGH_BARS" });
    expect(pns(config)).toContain(PNS.FULL_HEIGHT_HP_BARS);
  });

  test("15kW + LOW_SPINNERS → low spinners 2x150L", () => {
    const config = makeConfig({ has_15kw_pump: true, pump_outlet_1_15kw: "LOW_SPINNERS" });
    expect(pns(config)).toContain(PNS.LOW_SPINNERS_2X150L);
  });
});

describe("hpPumpBOM — spinners (30kW)", () => {
  test("30kW + LOW_SPINNERS_HIGH_BARS → high bars + low spinners", () => {
    const config = makeConfig({ has_30kw_pump: true, pump_outlet_1_30kw: "LOW_SPINNERS_HIGH_BARS" });
    expect(pns(config)).toContain(PNS.HIGH_BARS_2X150L_LOW_SPINNERS_2X150);
  });

  test("30kW + LOW_MEDIUM_SPINNERS → low and medium spinners 4x150L", () => {
    const config = makeConfig({ has_30kw_pump: true, pump_outlet_1_30kw: "LOW_MEDIUM_SPINNERS" });
    expect(pns(config)).toContain(PNS.LOW_MEDIUM_SPINNERS_4X150L);
  });

  test("30kW + HIGH_MEDIUM_SPINNERS → high and medium spinners 4x150L", () => {
    const config = makeConfig({ has_30kw_pump: true, pump_outlet_1_30kw: "HIGH_MEDIUM_SPINNERS" });
    expect(pns(config)).toContain(PNS.HIGH_MEDIUM_SPINNERS_4X150L);
  });
});

describe("hpPumpBOM — OMZ pump / HP roof bar", () => {
  test("omz + HP_ROOF_BAR → HP roof bar included", () => {
    const config = makeConfig({ has_omz_pump: true, pump_outlet_omz: "HP_ROOF_BAR" });
    expect(pns(config)).toContain(PNS.HP_ROOF_BAR);
  });

  test("omz + HP_ROOF_BAR + has_chemical_roof_bar → chemical roof bar included", () => {
    const config = makeConfig({
      has_omz_pump: true,
      pump_outlet_omz: "HP_ROOF_BAR",
      has_chemical_roof_bar: true,
    });
    expect(pns(config)).toContain(PNS.CHEMICAL_ROOF_BAR);
  });

  test("omz + HP_ROOF_BAR + !has_chemical_roof_bar → chemical roof bar NOT included", () => {
    const config = makeConfig({ has_omz_pump: true, pump_outlet_omz: "HP_ROOF_BAR", has_chemical_roof_bar: false });
    expect(pns(config)).not.toContain(PNS.CHEMICAL_ROOF_BAR);
  });

  test("omz + HP_ROOF_BAR_SPINNERS → HP valve assy + high spinners + HP roof bar", () => {
    const config = makeConfig({ has_omz_pump: true, pump_outlet_omz: "HP_ROOF_BAR_SPINNERS" });
    expect(pns(config)).toContain(PNS.HP_VALVE_ASSY);
    expect(pns(config)).toContain(PNS.HIGH_SPINNERS_4X43L);
    expect(pns(config)).toContain(PNS.HP_ROOF_BAR);
  });

  test("omz + SPINNERS (no HP_ROOF_BAR) → high spinners but no HP roof bar", () => {
    const config = makeConfig({ has_omz_pump: true, pump_outlet_omz: "SPINNERS" });
    expect(pns(config)).toContain(PNS.HIGH_SPINNERS_4X43L);
    expect(pns(config)).not.toContain(PNS.HP_ROOF_BAR);
    expect(pns(config)).not.toContain(PNS.HP_VALVE_ASSY);
  });
});

describe("hpPumpBOM — hoses for spinners (no shelf extension)", () => {
  test("omz HP_ROOF_BAR_SPINNERS + !has_shelf_extension + LEFT → left hose to valve", () => {
    const config = makeConfig({
      has_omz_pump: true,
      pump_outlet_omz: "HP_ROOF_BAR_SPINNERS",
      has_shelf_extension: false,
      supply_side: "LEFT",
    });
    expect(pns(config)).toContain(PNS.HOSE_LEFT_SHELF_TO_VALVE_ASSY_4_SPINNERS);
    expect(pns(config)).not.toContain(PNS.HOSE_RIGHT_SHELF_TO_VALVE_ASSY_4_SPINNERS);
    expect(pns(config)).not.toContain(PNS.HOSE_LEFT_SHELF_TO_VALVE_ASSY_4_SPINNERS_W_EXT);
  });

  test("omz HP_ROOF_BAR_SPINNERS + !has_shelf_extension + RIGHT → right hose to valve", () => {
    const config = makeConfig({
      has_omz_pump: true,
      pump_outlet_omz: "HP_ROOF_BAR_SPINNERS",
      has_shelf_extension: false,
      supply_side: "RIGHT",
    });
    expect(pns(config)).toContain(PNS.HOSE_RIGHT_SHELF_TO_VALVE_ASSY_4_SPINNERS);
    expect(pns(config)).not.toContain(PNS.HOSE_LEFT_SHELF_TO_VALVE_ASSY_4_SPINNERS);
  });

  test("15kW + LOW_SPINNERS + !has_shelf_extension → T-fitting hose (qty=1)", () => {
    const config = makeConfig({
      has_15kw_pump: true,
      pump_outlet_1_15kw: "LOW_SPINNERS",
      has_shelf_extension: false,
    });
    expect(pns(config)).toContain(PNS.HOSE_SHELF_TO_T_FITTING_2_SPINNERS);
    expect(qty(config, PNS.HOSE_SHELF_TO_T_FITTING_2_SPINNERS)).toBe(1);
  });

  test("30kW + HIGH_MEDIUM_SPINNERS + !has_shelf_extension → T-fitting hose (qty=2)", () => {
    const config = makeConfig({
      has_30kw_pump: true,
      pump_outlet_1_30kw: "HIGH_MEDIUM_SPINNERS",
      has_shelf_extension: false,
    });
    expect(pns(config)).toContain(PNS.HOSE_SHELF_TO_T_FITTING_2_SPINNERS);
    expect(qty(config, PNS.HOSE_SHELF_TO_T_FITTING_2_SPINNERS)).toBe(2);
  });
});

describe("hpPumpBOM — hoses for spinners (with shelf extension)", () => {
  test("omz HP_ROOF_BAR_SPINNERS + has_shelf_extension + LEFT → extended left hose", () => {
    const config = makeConfig({
      has_omz_pump: true,
      pump_outlet_omz: "HP_ROOF_BAR_SPINNERS",
      has_shelf_extension: true,
      supply_side: "LEFT",
    });
    expect(pns(config)).toContain(PNS.HOSE_LEFT_SHELF_TO_VALVE_ASSY_4_SPINNERS_W_EXT);
    expect(pns(config)).not.toContain(PNS.HOSE_LEFT_SHELF_TO_VALVE_ASSY_4_SPINNERS);
  });

  test("15kW + LOW_SPINNERS + has_shelf_extension → extended T-fitting hose", () => {
    const config = makeConfig({
      has_15kw_pump: true,
      pump_outlet_1_15kw: "LOW_SPINNERS",
      has_shelf_extension: true,
    });
    expect(pns(config)).toContain(PNS.HOSE_SHELF_TO_T_FITTING_2_SPINNERS_W_EXT);
    expect(pns(config)).not.toContain(PNS.HOSE_SHELF_TO_T_FITTING_2_SPINNERS);
  });
});
