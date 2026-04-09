import { describe, expect, test, vi } from "vitest";

vi.mock("@/db", () => ({
  db: { query: { partNumbers: { findMany: vi.fn().mockResolvedValue([]) } } },
}));
vi.mock("@/db/queries", () => ({
  getPartNumbersByArray: vi.fn().mockResolvedValue([]),
}));

import type { GeneralBOMConfig } from "@/lib/BOM";
import { hpPumpBOM } from "@/lib/BOM/max-bom/hp-pump-bom";
import { makeGeneralBOMConfig as makeConfig } from "@/test/bom-test-utils";

const pns = (config: GeneralBOMConfig) =>
  hpPumpBOM
    .filter((item) => item.conditions.every((fn) => fn(config)))
    .map((item) => item.pn);

const qty = (config: GeneralBOMConfig, pn: string) => {
  const item = hpPumpBOM.find(
    (i) => i.pn === pn && i.conditions.every((fn) => fn(config)),
  );
  if (!item) return undefined;
  return typeof item.qty === "function" ? item.qty(config) : item.qty;
};

const PNS = {
  PUMP_15KW: "1100.024.030",
  PUMP_15KW_WITH_SOFTSTART: "1100.024.032",
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
  CHASSIS_WASH_PLATES_15KW: "1100.024.008",
  CHASSIS_WASH_PLATES_30KW: "1100.024.009",
  ULTRASONIC_SENSOR_POST: "1100.021.000",
  ULTRASONIC_SENSOR_WALL: "1100.052.000",
  DUAL_ULTRASONIC_SENSORS_POST: "1100.021.001",
  DUAL_ULTRASONIC_SENSORS_WALL: "1100.052.004",
  MID_HEIGHT_HP_BARS: "1100.036.005",
  FULL_HEIGHT_HP_BARS: "1100.036.000",
  LOW_SPINNERS_2X150L: "940.11.000",
  HIGH_BARS_2X150L_LOW_SPINNERS_2X150: "940.08.000",
  LOW_MEDIUM_SPINNERS_4X150L: "940.13.001",
  HIGH_MEDIUM_SPINNERS_4X150L: "940.13.000",
  STANDARD_BANNER_HP_BAR: "450.50.060",
  OMZ_BANNER_HP_BAR: "450.50.072",
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
  // OMZ
  LOW_SPINNER_ASSY_OMZ: "940.10.000",
  HIGH_SPINNER_ASSY_OMZ: "940.09.000",
  HP_VALVE_ASSY_INOX: "450.50.302",
  HOSE_RIGHT_SHELF_TO_VALVE_ASSY_4_SPINNERS_OMZ: "9000.525.024",
  HOSE_RIGHT_SHELF_TO_VALVE_ASSY_4_SPINNERS_OMZ_W_EXT: "9000.525.022",
  HOSE_LEFT_SHELF_TO_VALVE_ASSY_4_SPINNERS_OMZ: "9000.525.023",
  HOSE_LEFT_SHELF_TO_VALVE_ASSY_4_SPINNERS_OMZ_W_EXT: "9000.525.021",
  HOSE_SHELF_TO_T_FITTING_2_SPINNERS_OMZ: "9000.525.004",
  HOSE_SHELF_TO_T_FITTING_2_SPINNERS_OMZ_W_EXT: "9000.525.020",
};

describe("hpPumpBOM — pump selection", () => {
  test("has_15kw_pump → 15kW pump included", () => {
    expect(pns(makeConfig({ has_15kw_pump: true }))).toContain(PNS.PUMP_15KW);
  });

  test("has_15kw_pump + has_15kw_pump_softstart → softstart pump included, standard excluded", () => {
    const config = makeConfig({
      has_15kw_pump: true,
      has_15kw_pump_softstart: true,
    });
    expect(pns(config)).toContain(PNS.PUMP_15KW_WITH_SOFTSTART);
    expect(pns(config)).not.toContain(PNS.PUMP_15KW);
  });

  test("has_15kw_pump + !has_15kw_pump_softstart → standard pump included, softstart excluded", () => {
    const config = makeConfig({
      has_15kw_pump: true,
      has_15kw_pump_softstart: false,
    });
    expect(pns(config)).toContain(PNS.PUMP_15KW);
    expect(pns(config)).not.toContain(PNS.PUMP_15KW_WITH_SOFTSTART);
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
    const config = makeConfig({
      has_15kw_pump: true,
      pump_outlet_1_15kw: "LOW_SPINNERS",
      has_antifreeze: true,
    });
    expect(pns(config)).toContain(PNS.PNEUMATIC_VALVE_15KW_WITH_ANTIFREEZE);
    expect(pns(config)).not.toContain(
      PNS.TWO_PNEUMATIC_VALVES_15KW_WITH_ANTIFREEZE,
    );
  });

  test("15kW + one outlet + !has_antifreeze → single valve no antifreeze", () => {
    const config = makeConfig({
      has_15kw_pump: true,
      pump_outlet_1_15kw: "LOW_SPINNERS",
      has_antifreeze: false,
    });
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
    expect(pns(config)).toContain(
      PNS.TWO_PNEUMATIC_VALVES_15KW_WITH_ANTIFREEZE,
    );
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
    const config = makeConfig({
      has_30kw_pump: true,
      pump_outlet_1_30kw: "HIGH_MEDIUM_SPINNERS",
      has_antifreeze: false,
    });
    expect(pns(config)).toContain(PNS.PNEUMATIC_VALVE_30KW_NO_ANTIFREEZE);
  });

  test("30kW + two outlets + has_antifreeze → two valves with antifreeze", () => {
    const config = makeConfig({
      has_30kw_pump: true,
      pump_outlet_1_30kw: "HIGH_MEDIUM_SPINNERS",
      pump_outlet_2_30kw: "LOW_MEDIUM_SPINNERS",
      has_antifreeze: true,
    });
    expect(pns(config)).toContain(
      PNS.TWO_PNEUMATIC_VALVES_30KW_WITH_ANTIFREEZE,
    );
  });
});

describe("hpPumpBOM — chassis wash", () => {
  test("15kW + outlet=CHASSIS_WASH → chassis wash 15kW", () => {
    const config = makeConfig({
      has_15kw_pump: true,
      pump_outlet_1_15kw: "CHASSIS_WASH",
    });
    expect(pns(config)).toContain(PNS.CHASSIS_WASH_15KW);
  });

  test("30kW + outlet=CHASSIS_WASH_HORIZONTAL → chassis wash 30kW horizontal", () => {
    const config = makeConfig({
      has_30kw_pump: true,
      pump_outlet_1_30kw: "CHASSIS_WASH_HORIZONTAL",
    });
    expect(pns(config)).toContain(PNS.CHASSIS_WASH_30KW_HORIZONTAL);
  });

  test("30kW + outlet=CHASSIS_WASH_LATERAL_HORIZONTAL → chassis wash 30kW with lateral bars", () => {
    const config = makeConfig({
      has_30kw_pump: true,
      pump_outlet_1_30kw: "CHASSIS_WASH_LATERAL_HORIZONTAL",
    });
    expect(pns(config)).toContain(PNS.CHASSIS_WASH_30KW_WITH_LATERAL_BARS);
  });
});

describe("hpPumpBOM — chassis wash plates", () => {
  test("15kW + CHASSIS_WASH outlet + has_chassis_wash_plates → plates included", () => {
    const config = makeConfig({
      has_15kw_pump: true,
      pump_outlet_1_15kw: "CHASSIS_WASH",
      has_chassis_wash_plates: true,
    });
    expect(pns(config)).toContain(PNS.CHASSIS_WASH_PLATES_15KW);
  });

  test("15kW + CHASSIS_WASH outlet + !has_chassis_wash_plates → plates excluded", () => {
    const config = makeConfig({
      has_15kw_pump: true,
      pump_outlet_1_15kw: "CHASSIS_WASH",
      has_chassis_wash_plates: false,
    });
    expect(pns(config)).not.toContain(PNS.CHASSIS_WASH_PLATES_15KW);
  });

  test("30kW + CHASSIS_WASH_HORIZONTAL + has_chassis_wash_plates → 30kW plates included", () => {
    const config = makeConfig({
      has_30kw_pump: true,
      pump_outlet_1_30kw: "CHASSIS_WASH_HORIZONTAL",
      has_chassis_wash_plates: true,
    });
    expect(pns(config)).toContain(PNS.CHASSIS_WASH_PLATES_30KW);
  });

  test("30kW + CHASSIS_WASH_LATERAL_HORIZONTAL + has_chassis_wash_plates → 30kW plates included", () => {
    const config = makeConfig({
      has_30kw_pump: true,
      pump_outlet_1_30kw: "CHASSIS_WASH_LATERAL_HORIZONTAL",
      has_chassis_wash_plates: true,
    });
    expect(pns(config)).toContain(PNS.CHASSIS_WASH_PLATES_30KW);
  });

  test("30kW + non-chassis-wash outlet + has_chassis_wash_plates → 30kW plates excluded", () => {
    const config = makeConfig({
      has_30kw_pump: true,
      pump_outlet_1_30kw: "HIGH_MEDIUM_SPINNERS",
      has_chassis_wash_plates: true,
    });
    expect(pns(config)).not.toContain(PNS.CHASSIS_WASH_PLATES_30KW);
  });
});

describe("hpPumpBOM — chassis wash sensor types", () => {
  test("SINGLE_POST → single ultrasonic sensor on post", () => {
    const config = makeConfig({
      has_15kw_pump: true,
      pump_outlet_1_15kw: "CHASSIS_WASH",
      chassis_wash_sensor_type: "SINGLE_POST",
    });
    expect(pns(config)).toContain(PNS.ULTRASONIC_SENSOR_POST);
    expect(pns(config)).not.toContain(PNS.DUAL_ULTRASONIC_SENSORS_POST);
    expect(pns(config)).not.toContain(PNS.ULTRASONIC_SENSOR_WALL);
    expect(pns(config)).not.toContain(PNS.DUAL_ULTRASONIC_SENSORS_WALL);
  });

  test("DOUBLE_POST → dual ultrasonic sensors on post", () => {
    const config = makeConfig({
      has_15kw_pump: true,
      pump_outlet_1_15kw: "CHASSIS_WASH",
      chassis_wash_sensor_type: "DOUBLE_POST",
    });
    expect(pns(config)).toContain(PNS.DUAL_ULTRASONIC_SENSORS_POST);
    expect(pns(config)).not.toContain(PNS.ULTRASONIC_SENSOR_POST);
  });

  test("SINGLE_WALL → single ultrasonic sensor on wall", () => {
    const config = makeConfig({
      has_30kw_pump: true,
      pump_outlet_1_30kw: "CHASSIS_WASH_HORIZONTAL",
      chassis_wash_sensor_type: "SINGLE_WALL",
    });
    expect(pns(config)).toContain(PNS.ULTRASONIC_SENSOR_WALL);
    expect(pns(config)).not.toContain(PNS.ULTRASONIC_SENSOR_POST);
  });

  test("DOUBLE_WALL → dual ultrasonic sensors on wall", () => {
    const config = makeConfig({
      has_30kw_pump: true,
      pump_outlet_1_30kw: "CHASSIS_WASH_HORIZONTAL",
      chassis_wash_sensor_type: "DOUBLE_WALL",
    });
    expect(pns(config)).toContain(PNS.DUAL_ULTRASONIC_SENSORS_WALL);
    expect(pns(config)).not.toContain(PNS.ULTRASONIC_SENSOR_WALL);
  });

  test("no sensor type selected → no sensor in BOM", () => {
    const config = makeConfig({
      has_15kw_pump: true,
      pump_outlet_1_15kw: "CHASSIS_WASH",
      chassis_wash_sensor_type: null,
    });
    expect(pns(config)).not.toContain(PNS.ULTRASONIC_SENSOR_POST);
    expect(pns(config)).not.toContain(PNS.DUAL_ULTRASONIC_SENSORS_POST);
    expect(pns(config)).not.toContain(PNS.ULTRASONIC_SENSOR_WALL);
    expect(pns(config)).not.toContain(PNS.DUAL_ULTRASONIC_SENSORS_WALL);
  });
});

describe("hpPumpBOM — HP bars and spinners (15kW)", () => {
  test("15kW + LOW_BARS → mid-height HP bars", () => {
    const config = makeConfig({
      has_15kw_pump: true,
      pump_outlet_1_15kw: "LOW_BARS",
    });
    expect(pns(config)).toContain(PNS.MID_HEIGHT_HP_BARS);
  });

  test("15kW + HIGH_BARS → full-height HP bars", () => {
    const config = makeConfig({
      has_15kw_pump: true,
      pump_outlet_1_15kw: "HIGH_BARS",
    });
    expect(pns(config)).toContain(PNS.FULL_HEIGHT_HP_BARS);
  });

  test("15kW + LOW_SPINNERS → low spinners 2x150L", () => {
    const config = makeConfig({
      has_15kw_pump: true,
      pump_outlet_1_15kw: "LOW_SPINNERS",
    });
    expect(pns(config)).toContain(PNS.LOW_SPINNERS_2X150L);
  });
});

describe("hpPumpBOM — spinners (30kW)", () => {
  test("30kW + LOW_SPINNERS_HIGH_BARS → high bars + low spinners", () => {
    const config = makeConfig({
      has_30kw_pump: true,
      pump_outlet_1_30kw: "LOW_SPINNERS_HIGH_BARS",
    });
    expect(pns(config)).toContain(PNS.HIGH_BARS_2X150L_LOW_SPINNERS_2X150);
  });

  test("30kW + LOW_MEDIUM_SPINNERS → low and medium spinners 4x150L", () => {
    const config = makeConfig({
      has_30kw_pump: true,
      pump_outlet_1_30kw: "LOW_MEDIUM_SPINNERS",
    });
    expect(pns(config)).toContain(PNS.LOW_MEDIUM_SPINNERS_4X150L);
  });

  test("30kW + HIGH_MEDIUM_SPINNERS → high and medium spinners 4x150L", () => {
    const config = makeConfig({
      has_30kw_pump: true,
      pump_outlet_1_30kw: "HIGH_MEDIUM_SPINNERS",
    });
    expect(pns(config)).toContain(PNS.HIGH_MEDIUM_SPINNERS_4X150L);
  });
});

describe("hpPumpBOM — HP bar banners", () => {
  test("STD + HP_ROOF_BAR → STANDARD_BANNER_HP_BAR included", () => {
    const config = makeConfig({
      machine_type: "STD",
      has_omz_pump: true,
      pump_outlet_omz: "HP_ROOF_BAR",
    });
    expect(pns(config)).toContain(PNS.STANDARD_BANNER_HP_BAR);
    expect(pns(config)).not.toContain(PNS.OMZ_BANNER_HP_BAR);
  });

  test("STD + HP_ROOF_BAR_SPINNERS → STANDARD_BANNER_HP_BAR included", () => {
    const config = makeConfig({
      machine_type: "STD",
      has_omz_pump: true,
      pump_outlet_omz: "HP_ROOF_BAR_SPINNERS",
    });
    expect(pns(config)).toContain(PNS.STANDARD_BANNER_HP_BAR);
  });

  test("OMZ + HP_ROOF_BAR → OMZ_BANNER_HP_BAR included", () => {
    const config = makeConfig({
      machine_type: "OMZ",
      has_omz_pump: true,
      pump_outlet_omz: "HP_ROOF_BAR",
    });
    expect(pns(config)).toContain(PNS.OMZ_BANNER_HP_BAR);
    expect(pns(config)).not.toContain(PNS.STANDARD_BANNER_HP_BAR);
  });

  test("STD without HP bar → STANDARD_BANNER_HP_BAR excluded", () => {
    expect(pns(makeConfig({ machine_type: "STD" }))).not.toContain(
      PNS.STANDARD_BANNER_HP_BAR,
    );
  });

  test("OMZ without HP bar → OMZ_BANNER_HP_BAR excluded", () => {
    expect(pns(makeConfig({ machine_type: "OMZ" }))).not.toContain(
      PNS.OMZ_BANNER_HP_BAR,
    );
  });

  test("OMZ + SPINNERS outlet → OMZ_BANNER_HP_BAR excluded", () => {
    const config = makeConfig({
      machine_type: "OMZ",
      has_omz_pump: true,
      pump_outlet_omz: "SPINNERS",
    });
    expect(pns(config)).not.toContain(PNS.OMZ_BANNER_HP_BAR);
  });
});

describe("hpPumpBOM — OMZ pump / HP roof bar", () => {
  test("omz + HP_ROOF_BAR → HP roof bar included", () => {
    const config = makeConfig({
      has_omz_pump: true,
      pump_outlet_omz: "HP_ROOF_BAR",
    });
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
    const config = makeConfig({
      has_omz_pump: true,
      pump_outlet_omz: "HP_ROOF_BAR",
      has_chemical_roof_bar: false,
    });
    expect(pns(config)).not.toContain(PNS.CHEMICAL_ROOF_BAR);
  });

  test("omz + HP_ROOF_BAR_SPINNERS → HP valve assembly + high spinners + HP roof bar", () => {
    const config = makeConfig({
      has_omz_pump: true,
      pump_outlet_omz: "HP_ROOF_BAR_SPINNERS",
    });
    expect(pns(config)).toContain(PNS.HP_VALVE_ASSY);
    expect(pns(config)).toContain(PNS.HIGH_SPINNERS_4X43L);
    expect(pns(config)).toContain(PNS.HP_ROOF_BAR);
  });

  test("omz + SPINNERS (no HP_ROOF_BAR) → high spinners but no HP roof bar", () => {
    const config = makeConfig({
      has_omz_pump: true,
      pump_outlet_omz: "SPINNERS",
    });
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
    expect(pns(config)).not.toContain(
      PNS.HOSE_RIGHT_SHELF_TO_VALVE_ASSY_4_SPINNERS,
    );
    expect(pns(config)).not.toContain(
      PNS.HOSE_LEFT_SHELF_TO_VALVE_ASSY_4_SPINNERS_W_EXT,
    );
  });

  test("omz HP_ROOF_BAR_SPINNERS + !has_shelf_extension + RIGHT → right hose to valve", () => {
    const config = makeConfig({
      has_omz_pump: true,
      pump_outlet_omz: "HP_ROOF_BAR_SPINNERS",
      has_shelf_extension: false,
      supply_side: "RIGHT",
    });
    expect(pns(config)).toContain(
      PNS.HOSE_RIGHT_SHELF_TO_VALVE_ASSY_4_SPINNERS,
    );
    expect(pns(config)).not.toContain(
      PNS.HOSE_LEFT_SHELF_TO_VALVE_ASSY_4_SPINNERS,
    );
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
    expect(pns(config)).toContain(
      PNS.HOSE_LEFT_SHELF_TO_VALVE_ASSY_4_SPINNERS_W_EXT,
    );
    expect(pns(config)).not.toContain(
      PNS.HOSE_LEFT_SHELF_TO_VALVE_ASSY_4_SPINNERS,
    );
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

describe("hpPumpBOM — OMZ machine type components", () => {
  test("machine_type OMZ → includes spinner assemblies and valve", () => {
    const config = makeConfig({ machine_type: "OMZ" });
    expect(pns(config)).toContain(PNS.LOW_SPINNER_ASSY_OMZ);
    expect(pns(config)).toContain(PNS.HIGH_SPINNER_ASSY_OMZ);
    expect(pns(config)).toContain(PNS.HP_VALVE_ASSY_INOX);
  });

  test("machine_type STD → excludes OMZ parts", () => {
    const config = makeConfig({ machine_type: "STD" });
    expect(pns(config)).not.toContain(PNS.LOW_SPINNER_ASSY_OMZ);
    expect(pns(config)).not.toContain(PNS.HIGH_SPINNER_ASSY_OMZ);
    expect(pns(config)).not.toContain(PNS.HP_VALVE_ASSY_INOX);
  });

  test("OMZ + !has_shelf_extension → T-fitting hose without extension", () => {
    const config = makeConfig({
      machine_type: "OMZ",
      has_shelf_extension: false,
    });
    expect(pns(config)).toContain(PNS.HOSE_SHELF_TO_T_FITTING_2_SPINNERS_OMZ);
    expect(pns(config)).not.toContain(
      PNS.HOSE_SHELF_TO_T_FITTING_2_SPINNERS_OMZ_W_EXT,
    );
  });

  test("OMZ + has_shelf_extension → T-fitting hose with extension", () => {
    const config = makeConfig({
      machine_type: "OMZ",
      has_shelf_extension: true,
    });
    expect(pns(config)).toContain(
      PNS.HOSE_SHELF_TO_T_FITTING_2_SPINNERS_OMZ_W_EXT,
    );
    expect(pns(config)).not.toContain(
      PNS.HOSE_SHELF_TO_T_FITTING_2_SPINNERS_OMZ,
    );
  });

  test("OMZ + LEFT + !has_shelf_extension → left hose (qty=2)", () => {
    const config = makeConfig({
      machine_type: "OMZ",
      supply_side: "LEFT",
      has_shelf_extension: false,
    });
    expect(pns(config)).toContain(
      PNS.HOSE_LEFT_SHELF_TO_VALVE_ASSY_4_SPINNERS_OMZ,
    );
    expect(pns(config)).not.toContain(
      PNS.HOSE_RIGHT_SHELF_TO_VALVE_ASSY_4_SPINNERS_OMZ,
    );
    expect(qty(config, PNS.HOSE_LEFT_SHELF_TO_VALVE_ASSY_4_SPINNERS_OMZ)).toBe(
      2,
    );
  });

  test("OMZ + LEFT + has_shelf_extension → left hose with extension (qty=2)", () => {
    const config = makeConfig({
      machine_type: "OMZ",
      supply_side: "LEFT",
      has_shelf_extension: true,
    });
    expect(pns(config)).toContain(
      PNS.HOSE_LEFT_SHELF_TO_VALVE_ASSY_4_SPINNERS_OMZ_W_EXT,
    );
    expect(pns(config)).not.toContain(
      PNS.HOSE_LEFT_SHELF_TO_VALVE_ASSY_4_SPINNERS_OMZ,
    );
    expect(
      qty(config, PNS.HOSE_LEFT_SHELF_TO_VALVE_ASSY_4_SPINNERS_OMZ_W_EXT),
    ).toBe(2);
  });

  test("OMZ + RIGHT + !has_shelf_extension → right hose (qty=2)", () => {
    const config = makeConfig({
      machine_type: "OMZ",
      supply_side: "RIGHT",
      has_shelf_extension: false,
    });
    expect(pns(config)).toContain(
      PNS.HOSE_RIGHT_SHELF_TO_VALVE_ASSY_4_SPINNERS_OMZ,
    );
    expect(pns(config)).not.toContain(
      PNS.HOSE_LEFT_SHELF_TO_VALVE_ASSY_4_SPINNERS_OMZ,
    );
    expect(qty(config, PNS.HOSE_RIGHT_SHELF_TO_VALVE_ASSY_4_SPINNERS_OMZ)).toBe(
      2,
    );
  });

  test("OMZ + RIGHT + has_shelf_extension → right hose with extension (qty=2)", () => {
    const config = makeConfig({
      machine_type: "OMZ",
      supply_side: "RIGHT",
      has_shelf_extension: true,
    });
    expect(pns(config)).toContain(
      PNS.HOSE_RIGHT_SHELF_TO_VALVE_ASSY_4_SPINNERS_OMZ_W_EXT,
    );
    expect(pns(config)).not.toContain(
      PNS.HOSE_RIGHT_SHELF_TO_VALVE_ASSY_4_SPINNERS_OMZ,
    );
    expect(
      qty(config, PNS.HOSE_RIGHT_SHELF_TO_VALVE_ASSY_4_SPINNERS_OMZ_W_EXT),
    ).toBe(2);
  });
});
