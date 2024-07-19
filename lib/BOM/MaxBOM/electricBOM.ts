import { MaxBOMItem } from "@/lib/BOM/MaxBOM";
import { $Enums, Configuration } from "@prisma/client";
import { config } from "process";

const PART_NUMBERS: Record<string, string> = {
  RFID_READER: "890.10.003",
  RFID_CARD: "890.10.005",
  HP_ROOF_BAR_COMMANDS: "890.10.013",
  THERMOSTAT: "890.10.014",
  ITECOWEB_ACCESSORIES: "890.10.015",
  ITECOWEB_ONBOARD: "890.10.017",
  WASH_BAY_MANAGEMENT_EXTENSION: "890.10.021",
  SUNSHADE: "450.02.053",
  CLOSING_PLATE: "1100.050.004",
  BOX_FOR_TOUCH_ON_DET_CAB: "1100.057.000", // TODO Add option for this in the config form
  BOX_FOR_EXTERNAL_CONSOLE: "NO_PN",
  POST_FOR_EXTERNAL_CONSOLE: "NO_PN",
  WALL_KIT_FOR_EXTERNAL_CONSOLE: "NO_PN",
};

const uses1ExternalTouch = (config: Configuration): boolean => {
  return config.touch_qty === 1 && config.touch_pos === "EXTERNAL";
};

const usesDoubleTouch = (config: Configuration): boolean =>
  config.touch_qty === 2;

const usesOnboardTouch = (config: Configuration): boolean =>
  (config.touch_qty === 1 && config.touch_pos === "INTERNAL") ||
  config.touch_qty === 2;

const usesExternalTouch = (config: Configuration): boolean =>
  uses1ExternalTouch(config) || config.touch_qty === 2;

export const electricBOM: MaxBOMItem[] = [
  {
    pn: PART_NUMBERS.RFID_READER,
    conditions: [(config) => config.has_card_reader],
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
        config.pump_outlet_omz === $Enums.HpPumpOMZOutletType.HP_ROOF_BAR ||
        config.pump_outlet_omz ===
          $Enums.HpPumpOMZOutletType.HP_ROOF_BAR_SPINNERS,
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
    conditions: [usesDoubleTouch],
    qty: 1,
    _description: "Wash bay management extension",
  },
  {
    pn: PART_NUMBERS.SUNSHADE,
    conditions: [usesOnboardTouch],
    qty: 1,
    _description: "Sunshade",
  },
  {
    pn: PART_NUMBERS.CLOSING_PLATE,
    conditions: [uses1ExternalTouch],
    qty: 1,
    _description: "Closing plate",
  },
  {
    pn: PART_NUMBERS.BOX_FOR_EXTERNAL_CONSOLE,
    conditions: [usesExternalTouch],
    qty: 1,
    _description: "Box for external console",
  },
  {
    pn: PART_NUMBERS.POST_FOR_EXTERNAL_CONSOLE,
    conditions: [
      usesExternalTouch,
      (config) => config.touch_fixing_type === $Enums.TouchFixingType.POST,
    ],
    qty: 1,
    _description: "Post for external console",
  },
  {
    pn: PART_NUMBERS.WALL_KIT_FOR_EXTERNAL_CONSOLE,
    conditions: [
      usesExternalTouch,
      (config) => config.touch_fixing_type === $Enums.TouchFixingType.WALL,
    ],
    qty: 1,
    _description: "Wall fixing kit for external console",
  },
];
