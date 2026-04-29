import type { GeneralBOMConfig } from "@/lib/BOM";
import type { MaxBOMItem } from "@/lib/BOM/max-bom";
import {
  isSTD,
  uses15kwOr30kwPump,
  usesEnergyChain,
  usesOMZPump,
} from "./conditions";

const PART_NUMBERS = {
  RFID_READER: "890.10.003",
  RFID_CARD: "890.10.005",
  HP_ROOF_BAR_COMMANDS: "890.10.013",
  THERMOSTAT: "890.10.014",
  ITECOWEB_ACCESSORIES: "890.10.015",
  ITECOWEB_ONBOARD: "890.10.017",
  WASH_BAY_MANAGEMENT_EXTENSION: "890.10.021",
  SUNSHADE: "450.02.053",
  CLOSING_PLATE: "1100.050.004",
  ELECTRIC_CABINET_INOX_PLATE: "450.02.026",
  BOX_FOR_TOUCH_ON_DET_CAB: "1100.057.000",
  EXTERNAL_CONSOLE_WALL_ONE_TOUCH: "1100.050.000",
  EXTERNAL_CONSOLE_POST_ONE_TOUCH: "1100.051.000",
  EXTERNAL_CONSOLE_WALL_DUAL_TOUCH: "1100.053.000",
  EXTERNAL_CONSOLE_POST_DUAL_TOUCH: "1100.054.000",
  EXT_EMERGENCY_STOP_ASSY: "1100.055.007",
  COUPLING_RELAY_ASSY: "1100.055.008",
  // Junction boxes
  JUNCTION_BOX_X14_X15: "1100.055.003", // TODO Add to Excel
  JUNCTION_BOX_X16_X17: "1100.055.010", // TODO Add to Excel
  JUNCTION_BOX_X20_X21: "1100.055.001", // TODO Add to Excel
  JUNCTION_BOX_X22_X23: "1100.055.004", // TODO Add to Excel
  JUNCTION_BOX_X24_REM1: "1100.055.002", // TODO Add to Excel
  JUNCTION_BOX_X25_REM2: "1100.055.005", // TODO Add to Excel
  JUNCTION_BOX_ETH_ON_POST: "1100.055.009", // TODO Add to Excel
} as const satisfies Record<string, string>;

const uses1ExternalTouch = (config: GeneralBOMConfig): boolean => {
  return config.touch_qty === 1 && config.touch_pos === "EXTERNAL";
};

const usesDualTouch = (config: GeneralBOMConfig): boolean =>
  config.touch_qty === 2;

const usesOnboardTouch = (config: GeneralBOMConfig): boolean =>
  (config.touch_qty === 1 &&
    (config.touch_pos === "ON_PANEL" || config.touch_pos === "ON_DET_CAB")) ||
  config.touch_qty === 2;

const usesTouchOnDetCab = (config: GeneralBOMConfig): boolean => {
  return config.touch_qty === 1 && config.touch_pos === "ON_DET_CAB";
};

const usesDualJunctionBoxes = (config: GeneralBOMConfig): boolean =>
  uses1ExternalTouch(config) ||
  usesDualTouch(config) ||
  usesOMZPump(config) ||
  // Detergent level sensor requires X25
  (config.has_itecoweb && config.chemical_pump_pos === "WASH_BAY");

export const electricBOM: MaxBOMItem<GeneralBOMConfig>[] = [
  {
    pn: PART_NUMBERS.RFID_READER,
    conditions: [(config) => config.has_card_reader || config.has_itecoweb],
    qty: 1,
    _description: "RFID reader",
  },
  {
    pn: PART_NUMBERS.RFID_CARD,
    conditions: [(config) => !!config.card_qty],
    qty: (config) => config.card_qty || 0,
    _description: "RFID cards",
  },
  {
    pn: PART_NUMBERS.HP_ROOF_BAR_COMMANDS,
    conditions: [
      (config) => config.has_omz_pump,
      (config) =>
        config.pump_outlet_omz === "HP_ROOF_BAR" ||
        config.pump_outlet_omz === "HP_ROOF_BAR_SPINNERS",
    ],
    qty: 1,
    _description: "HP roof bar commands",
  },
  {
    pn: PART_NUMBERS.THERMOSTAT,
    conditions: [(config) => config.has_antifreeze],
    qty: 1,
    _description: "Thermostat",
  },
  {
    pn: PART_NUMBERS.ITECOWEB_ACCESSORIES,
    conditions: [(config) => config.has_itecoweb],
    qty: 1,
    _description: "Itecoweb accessories",
  },
  {
    pn: PART_NUMBERS.ITECOWEB_ONBOARD,
    conditions: [(config) => config.has_itecoweb],
    qty: 1,
    _description: "Itecoweb onboard",
  },
  {
    pn: PART_NUMBERS.WASH_BAY_MANAGEMENT_EXTENSION,
    conditions: [usesDualTouch],
    qty: 1,
    _description: "Wash bay management extension",
  },
  {
    pn: PART_NUMBERS.BOX_FOR_TOUCH_ON_DET_CAB,
    conditions: [usesTouchOnDetCab],
    qty: 1,
    _description: "Box for touch on detergent cabinet",
  },
  {
    pn: PART_NUMBERS.SUNSHADE,
    conditions: [usesOnboardTouch],
    qty: 1,
    _description: "Sunshade",
  },
  {
    pn: PART_NUMBERS.CLOSING_PLATE,
    conditions: [
      (config) => uses1ExternalTouch(config) || usesTouchOnDetCab(config),
    ],
    qty: 1,
    _description: "Closing plate",
  },
  {
    pn: PART_NUMBERS.ELECTRIC_CABINET_INOX_PLATE,
    conditions: [usesDualTouch],
    qty: 1,
    _description: "Electric cabinet inox plate",
  },
  {
    pn: PART_NUMBERS.EXTERNAL_CONSOLE_WALL_ONE_TOUCH,
    conditions: [
      uses1ExternalTouch,
      (config) => config.touch_fixing_type === "WALL",
    ],
    qty: 1,
    _description: "External console wall, one touch",
  },
  {
    pn: PART_NUMBERS.EXTERNAL_CONSOLE_POST_ONE_TOUCH,
    conditions: [
      uses1ExternalTouch,
      (config) => config.touch_fixing_type === "POST",
    ],
    qty: 1,
    _description: "External console post, one touch",
  },
  {
    pn: PART_NUMBERS.EXTERNAL_CONSOLE_WALL_DUAL_TOUCH,
    conditions: [
      usesDualTouch,
      (config) => config.touch_fixing_type === "WALL",
    ],
    qty: 1,
    _description: "External console wall, dual touch",
  },
  {
    pn: PART_NUMBERS.EXTERNAL_CONSOLE_POST_DUAL_TOUCH,
    conditions: [
      usesDualTouch,
      (config) => config.touch_fixing_type === "POST",
    ],
    qty: 1,
    _description: "External console post, dual touch",
  },
  {
    pn: PART_NUMBERS.EXT_EMERGENCY_STOP_ASSY,
    conditions: [(config) => config.emergency_stop_qty > 0],
    qty: (config) => config.emergency_stop_qty,
    _description: "External emergency stop assembly",
  },
  {
    pn: PART_NUMBERS.COUPLING_RELAY_ASSY,
    conditions: [uses15kwOr30kwPump],
    qty: 1,
    _description: "Coupling relay assembly",
  },

  // Junction boxes
  {
    pn: PART_NUMBERS.JUNCTION_BOX_X14_X15,
    conditions: [usesEnergyChain],
    qty: 1,
    _description: "Junction box X14-X15",
  },
  {
    pn: PART_NUMBERS.JUNCTION_BOX_X16_X17,
    conditions: [
      usesEnergyChain,
      (config) => uses1ExternalTouch(config) || usesDualTouch(config),
    ],
    qty: 1,
    _description: "Junction box X16-X17",
  },
  {
    pn: PART_NUMBERS.JUNCTION_BOX_X20_X21,
    conditions: [() => true],
    qty: 1,
    _description: "Junction box X20-X21",
  },
  {
    pn: PART_NUMBERS.JUNCTION_BOX_X22_X23,
    conditions: [usesDualJunctionBoxes],
    qty: 1,
    _description: "Junction box X22-X23",
  },
  {
    pn: PART_NUMBERS.JUNCTION_BOX_X24_REM1,
    conditions: [isSTD],
    qty: 1,
    _description: "Junction box X24 REM1",
  },
  {
    pn: PART_NUMBERS.JUNCTION_BOX_X25_REM2,
    conditions: [usesDualJunctionBoxes],
    qty: 1,
    _description: "Junction box X25 REM2",
  },
  {
    pn: PART_NUMBERS.JUNCTION_BOX_ETH_ON_POST,
    conditions: [
      (config) => config.has_itecoweb,
      (config) => !usesDualJunctionBoxes(config),
    ],
    qty: 1,
    _description: "Junction box for ethernet on post",
  },
];
