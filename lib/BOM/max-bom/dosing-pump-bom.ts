import { Configuration } from "@/db/schemas";
import { MaxBOMItem } from "@/lib/BOM/max-bom";

const PART_NUMBERS = {
  SHAMPOO_PUMP_NO_ALARM: "450.03.022",
  SHAMPOO_PUMP_WITH_ALARM: "450.03.025",
  WAX_PUMP_NO_ALARM: "450.03.024",
  WAX_PUMP_WITH_ALARM: "450.03.027",
  CHEMICAL_PUMP_NO_ALARM: "450.03.023",
  CHEMICAL_PUMP_WITH_ALARM: "450.03.026",
  ACID_PUMP_WITH_ALARM: "450.03.028",
  DOSATRON_NO_ANTIFREEZE: "1100.061.004",
  DOSATRON_WITH_ANTIFREEZE: "1100.061.001",
  DOSATRON_WITH_MANUAL_ANTIFREEZE: "1100.061.003", // TODO Not in BOM
  DOSATRON_ACID_NO_ANTIFREEZE: "1100.061.006",
  DOSATRON_ACID_WITH_ANTIFREEZE: "1100.061.005",
  FLOAT_SWITCH_FOR_DOSATRON: "1100.061.002",
  FOAM_KIT: "852.00.000",
} as const satisfies Record<string, string>;

export const dosingPumpBOM: MaxBOMItem<Configuration>[] = [
  {
    pn: PART_NUMBERS.SHAMPOO_PUMP_NO_ALARM,
    conditions: [
      (config) => config.has_shampoo_pump,
      (config) => !config.has_itecoweb,
    ],
    qty: 1,
    _description: "Shampoo pump, no alarm",
  },
  {
    pn: PART_NUMBERS.SHAMPOO_PUMP_WITH_ALARM,
    conditions: [
      (config) => config.has_shampoo_pump,
      (config) => config.has_itecoweb,
    ],
    qty: 1,
    _description: "Shampoo pump, with alarm",
  },
  {
    pn: PART_NUMBERS.WAX_PUMP_NO_ALARM,
    conditions: [
      (config) => config.has_wax_pump,
      (config) => !config.has_itecoweb,
    ],
    qty: 1,
    _description: "Wax pump, no alarm",
  },
  {
    pn: PART_NUMBERS.WAX_PUMP_WITH_ALARM,
    conditions: [
      (config) => config.has_wax_pump,
      (config) => config.has_itecoweb,
    ],
    qty: 1,
    _description: "Wax pump, with alarm",
  },
  {
    pn: PART_NUMBERS.CHEMICAL_PUMP_NO_ALARM,
    conditions: [
      (config) => config.has_chemical_pump,
      (config) => config.chemical_pump_pos === "ABOARD",
      (config) => !config.has_itecoweb,
    ],
    qty: (config) => config.chemical_qty || 0,
    _description: "Chemical pump, no alarm",
  },
  {
    pn: PART_NUMBERS.CHEMICAL_PUMP_WITH_ALARM,
    conditions: [
      (config) => config.has_chemical_pump,
      (config) => config.chemical_pump_pos === "ABOARD",
      (config) => config.has_itecoweb,
    ],
    qty: (config) => config.chemical_qty || 0,
    _description: "Chemical pump, with alarm",
  },
  {
    pn: PART_NUMBERS.ACID_PUMP_WITH_ALARM,
    conditions: [
      (config) => config.has_acid_pump,
      (config) => config.acid_pump_pos === "ABOARD",
    ],
    qty: 1,
    _description: "Acid pump, with alarm",
  },
  {
    pn: PART_NUMBERS.DOSATRON_NO_ANTIFREEZE,
    conditions: [
      (config) => config.has_chemical_pump,
      (config) => config.chemical_pump_pos === "WASH_BAY",
      (config) => !config.has_antifreeze,
    ],
    qty: (config) => config.chemical_qty || 0,
    _description: "Dosatron, no antifreeze",
  },
  {
    pn: PART_NUMBERS.DOSATRON_WITH_ANTIFREEZE,
    conditions: [
      (config) => config.has_chemical_pump,
      (config) => config.chemical_pump_pos === "WASH_BAY",
      (config) => config.has_antifreeze,
    ],
    qty: (config) => config.chemical_qty || 0,
    _description: "Dosatron, with antifreeze",
  },
  {
    pn: PART_NUMBERS.DOSATRON_ACID_NO_ANTIFREEZE,
    conditions: [
      (config) => config.has_acid_pump,
      (config) => config.acid_pump_pos === "WASH_BAY",
      (config) => !config.has_antifreeze,
    ],
    qty: 1,
    _description: "Dosatron for acid, no antifreeze",
  },
  {
    pn: PART_NUMBERS.DOSATRON_ACID_WITH_ANTIFREEZE,
    conditions: [
      (config) => config.has_acid_pump,
      (config) => config.acid_pump_pos === "WASH_BAY",
      (config) => config.has_antifreeze,
    ],
    qty: 1,
    _description: "Dosatron for acid, with antifreeze",
  },
  {
    pn: PART_NUMBERS.FLOAT_SWITCH_FOR_DOSATRON,
    conditions: [
      (config) =>
        config.chemical_pump_pos === "WASH_BAY" ||
        config.acid_pump_pos === "WASH_BAY",
      (config) => config.has_itecoweb,
    ],
    qty: (config) => {
      let qty = 0;

      if (config.has_chemical_pump && config.chemical_pump_pos === "WASH_BAY") {
        qty = config.chemical_qty || 0;
      }

      if (config.has_acid_pump && config.acid_pump_pos === "WASH_BAY") {
        qty = qty + 1;
      }

      return qty;
    },
    _description: "Float switch for Dosatron",
  },
  {
    pn: PART_NUMBERS.FOAM_KIT,
    conditions: [
      (config) => config.has_chemical_pump,
      (config) => config.has_foam,
    ],
    qty: 1,
    _description: "Foam kit",
  },
];
