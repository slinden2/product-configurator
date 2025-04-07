import { Configuration } from "@/db/schemas";
import { MaxBOMItem } from "@/lib/BOM/max-bom";
import { Water1PumpType, Water2PumpType } from "@/types";

const PART_NUMBERS: Record<string, string> = {
  WASH_BAY_SOLENOID_WITH_ANTIFREEZE: "1100.060.001",
  WASH_BAY_SOLENOID_NO_ANTIFREEZE: "1100.060.002",
  WASH_BAY_2ND_SOLENOID_WITH_ANTIFREEZE: "1100.060.003",
  BOOST_PUMP_15KW: "1100.024.051",
  BOOST_PUMP_22KW: "1100.024.052",
  ELECTRIC_PANEL_15KW: "890.02.000",
  ELECTRIC_PANEL_22KW: "890.02.002",
  INV_3KW_200L: "1100.024.053",
  INV_3KW_250L: "1100.024.054",
  OUTLET_DOSATRON: "1100.024.055",
  OUTLET_PW: "1100.024.056",
};

const hasWater1Solenoid = (config: Configuration): boolean => {
  return !!config.water_1_type;
};

const hasWater2Solenoid = (config: Configuration): boolean => {
  return !!config.water_2_type;
};

const uses15kwPump = (config: Configuration): boolean => {
  return (
    config.water_1_pump === "BOOST_15KW" || config.water_2_pump === "BOOST_15KW"
  );
};

const uses22kwPump = (config: Configuration): boolean => {
  return (
    config.water_1_pump === "BOOST_22KW" || config.water_2_pump === "BOOST_22KW"
  );
};

const needsTwoPumps = (
  config: Configuration,
  pumpType: Water1PumpType | Water2PumpType
): boolean => {
  if (config.water_2_pump === null) {
    return false;
  }

  return (
    config.water_1_pump?.toString() === pumpType.toString() &&
    config.water_2_pump.toString() === pumpType.toString()
  );
};

export const waterSupplyBOM: MaxBOMItem<Configuration>[] = [
  {
    pn: PART_NUMBERS.WASH_BAY_SOLENOID_WITH_ANTIFREEZE,
    conditions: [
      (config) => hasWater1Solenoid(config),
      (config) => config.has_antifreeze,
    ],
    qty: 1,
    _description: "Wash bay solenoid with antifreeze",
  },
  {
    pn: PART_NUMBERS.WASH_BAY_SOLENOID_NO_ANTIFREEZE,
    conditions: [
      (config) => hasWater1Solenoid(config),
      (config) => !config.has_antifreeze,
    ],
    qty: (config) =>
      hasWater2Solenoid(config) && !config.has_antifreeze ? 2 : 1,
    _description: "Wash bay solenoid without antifreeze",
  },
  {
    pn: PART_NUMBERS.WASH_BAY_2ND_SOLENOID_WITH_ANTIFREEZE,
    conditions: [
      (config) => hasWater2Solenoid(config),
      (config) => config.has_antifreeze,
    ],
    qty: 1,
    _description: "2nd wash bay solenoid with antifreeze",
  },
  {
    pn: PART_NUMBERS.BOOST_PUMP_15KW,
    conditions: [uses15kwPump],
    qty: (config) => (needsTwoPumps(config, "BOOST_15KW") ? 2 : 1),
    _description: "Boost pump 1.5kW",
  },
  {
    pn: PART_NUMBERS.ELECTRIC_PANEL_15KW,
    conditions: [uses15kwPump],
    qty: (config) => (needsTwoPumps(config, "BOOST_15KW") ? 2 : 1),
    _description: "Electric panel 1.5kW",
  },
  {
    pn: PART_NUMBERS.BOOST_PUMP_22KW,
    conditions: [uses22kwPump],
    qty: (config) => (needsTwoPumps(config, "BOOST_22KW") ? 2 : 1),
    _description: "Boost pump 2.2kW",
  },
  {
    pn: PART_NUMBERS.ELECTRIC_PANEL_22KW,
    conditions: [uses22kwPump],
    qty: (config) => (needsTwoPumps(config, "BOOST_22KW") ? 2 : 1),
    _description: "Electric panel 2.2kW",
  },
  {
    pn: PART_NUMBERS.INV_3KW_200L,
    conditions: [(config) => config.water_1_pump === "INV_3KW_200L"],
    qty: 1,
    _description: "Inverter pump 3kW 200l/min",
  },
  {
    pn: PART_NUMBERS.INV_3KW_250L,
    conditions: [(config) => config.water_1_pump === "INV_3KW_250L"],
    qty: 1,
    _description: "Inverter pump 3kW 250l/min",
  },
  {
    pn: PART_NUMBERS.OUTLET_DOSATRON,
    conditions: [
      (config) =>
        config.water_1_pump === "INV_3KW_200L" ||
        config.water_1_pump === "INV_3KW_250L",
      (config) => !!config.inv_pump_outlet_dosatron_qty,
    ],
    qty: (config) =>
      (config.inv_pump_outlet_dosatron_qty &&
        config.inv_pump_outlet_dosatron_qty) ||
      0,
    _description: "Dosatron outlet for inverter pump",
  },
  {
    pn: PART_NUMBERS.OUTLET_DOSATRON,
    conditions: [
      (config) =>
        config.water_1_pump === "INV_3KW_200L" ||
        config.water_1_pump === "INV_3KW_250L",
      (config) => !!config.inv_pump_outlet_pw_qty,
    ],
    qty: (config) =>
      (config.inv_pump_outlet_pw_qty && config.inv_pump_outlet_pw_qty) || 0,
    _description: "Pressure washer outlet for inverter pump",
  },
];
