import { WaterTank } from "@/db/schemas";
import { MaxBOMItem } from "@/lib/BOM/max-bom";

const PART_NUMBERS: Record<string, string> = {
  WATER_TANK_2000L: "921.00.201",
  WATER_TANK_JOLLY: "921.00.200",
  WATER_TANK_2500L: "921.00.250",
  WATER_TANK_4500L: "921.00.450",
  INLET_WITH_FLOAT: "1100.064.001",
  INLET_WITHOUT_FLOAT: "1100.064.002",
  INLET_WITH_FLOAT_JOLLY: "1100.064.003",
  INLET_WITHOUT_FLOAT_JOLLY: "1100.064.004",
  OUTLET_WITH_VALVE: "1100.064.005",
  OUTLET_WITHOUT_VALVE: "1100.064.006",
  OUTLET_WITH_VALVE_JOLLY: "1100.064.007",
  OUTLET_WITHOUT_VALVE_JOLLY: "1100.064.008",
  BLOWER: "1100.064.009",
};

const usesJolly = (config: WaterTank) => config.type === "L2000_JOLLY";

export const waterTankBOM: MaxBOMItem<WaterTank>[] = [
  {
    pn: PART_NUMBERS.WATER_TANK_2000L,
    conditions: [(config) => config.type === "L2000"],
    qty: 1,
    _description: "Water tank, 2000L",
  },
  {
    pn: PART_NUMBERS.WATER_TANK_JOLLY,
    conditions: [(config) => config.type === "L2000_JOLLY"],
    qty: 1,
    _description: "Water tank, Jolly",
  },
  {
    pn: PART_NUMBERS.WATER_TANK_2500L,
    conditions: [(config) => config.type === "L2500"],
    qty: 1,
    _description: "Water tank, 2500L",
  },
  {
    pn: PART_NUMBERS.WATER_TANK_4500L,
    conditions: [(config) => config.type === "L4500"],
    qty: 1,
    _description: "Water tank, 4500L",
  },
  {
    pn: PART_NUMBERS.INLET_WITH_FLOAT,
    conditions: [
      (config) => !usesJolly(config),
      (config) => config.inlet_w_float_qty > 0,
    ],
    qty: (config) => config.inlet_w_float_qty || 0,
    _description: "Inlet with float",
  },
  {
    pn: PART_NUMBERS.INLET_WITHOUT_FLOAT,
    conditions: [
      (config) => !usesJolly(config),
      (config) => config.inlet_no_float_qty > 0,
    ],
    qty: (config) => config.inlet_no_float_qty || 0,
    _description: "Inlet without float",
  },
  {
    pn: PART_NUMBERS.INLET_WITH_FLOAT_JOLLY,
    conditions: [
      (config) => usesJolly(config),
      (config) => config.inlet_w_float_qty > 0,
    ],
    qty: (config) => config.inlet_w_float_qty || 0,
    _description: "Inlet with float, Jolly",
  },
  {
    pn: PART_NUMBERS.INLET_WITHOUT_FLOAT_JOLLY,
    conditions: [
      (config) => usesJolly(config),
      (config) => config.inlet_no_float_qty > 0,
    ],
    qty: (config) => config.inlet_no_float_qty || 0,
    _description: "Inlet without float, Jolly",
  },
  {
    pn: PART_NUMBERS.OUTLET_WITH_VALVE,
    conditions: [
      (config) => !usesJolly(config),
      (config) => config.outlet_w_valve_qty > 0,
    ],
    qty: (config) => config.outlet_w_valve_qty || 0,
    _description: "Outlet with valve",
  },
  {
    pn: PART_NUMBERS.OUTLET_WITHOUT_VALVE,
    conditions: [
      (config) => !usesJolly(config),
      (config) => config.outlet_no_valve_qty > 0,
    ],
    qty: (config) => config.outlet_no_valve_qty || 0,
    _description: "Outlet without valve",
  },
  {
    pn: PART_NUMBERS.OUTLET_WITH_VALVE_JOLLY,
    conditions: [
      (config) => usesJolly(config),
      (config) => config.outlet_w_valve_qty > 0,
    ],
    qty: (config) => config.outlet_w_valve_qty || 0,
    _description: "Outlet with valve, Jolly",
  },
  {
    pn: PART_NUMBERS.OUTLET_WITHOUT_VALVE_JOLLY,
    conditions: [
      (config) => usesJolly(config),
      (config) => config.outlet_no_valve_qty > 0,
    ],
    qty: (config) => config.outlet_no_valve_qty || 0,
    _description: "Outlet without valve, Jolly",
  },
  {
    pn: PART_NUMBERS.BLOWER,
    conditions: [(config) => config.has_blower],
    qty: 1,
    _description: "Blower",
  },
];
