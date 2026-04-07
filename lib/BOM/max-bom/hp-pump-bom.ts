import type { GeneralBOMConfig } from "@/lib/BOM";
import type { MaxBOMItem } from "@/lib/BOM/max-bom";
import {
  isOMZ,
  usesHPRoofBar,
  usesOMZPump,
} from "@/lib/BOM/max-bom/conditions";
import type { HpPump15kwOutletType, HpPump30kwOutletType } from "@/types";

const PART_NUMBERS = {
  PUMP_75KW: "1100.024.033", // TODO Add this in the form
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
  CHASSIS_WASH_75KW: "1100.024.130",
  CHASSIS_WASH_15KW: "1100.024.004",
  CHASSIS_WASH_30KW_HORIZONTAL: "1100.024.100",
  CHASSIS_WASH_30KW_WITH_LATERAL_BARS: "1100.024.003",
  CHASSIS_WASH_PLATES_75KW: "1100.024.021", // TODO Add this in the BOM
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
  HP_ROOF_BAR: "450.50.000",
  CHEMICAL_ROOF_BAR: "450.50.300",
  HIGH_SPINNERS_4X43L: "940.12.000",
  HP_VALVE_ASSY: "450.50.301",
  HOSE_RIGHT_SHELF_TO_VALVE_ASSY_4_SPINNERS: "9000.530.030",
  HOSE_LEFT_SHELF_TO_VALVE_ASSY_4_SPINNERS: "9000.530.031",
  HOSE_SHELF_TO_T_FITTING_2_SPINNERS: "9000.530.024",
  HOSE_RIGHT_SHELF_TO_VALVE_ASSY_4_SPINNERS_W_EXT: "9000.530.036", // W_EXT = with extension, meaning that these are used only if has_shelf_extenion is true.
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
} as const satisfies Record<string, string>;

const uses15kwPump = (config: GeneralBOMConfig): boolean =>
  config.has_15kw_pump;
const uses30kwPump = (config: GeneralBOMConfig): boolean =>
  config.has_30kw_pump;
const uses15kwOr30kwPump = (config: GeneralBOMConfig): boolean =>
  config.has_15kw_pump || config.has_30kw_pump;

const usesHPDeviationValveKit = (config: GeneralBOMConfig) => {
  return (
    usesOMZPump(config) && config.pump_outlet_omz === "HP_ROOF_BAR_SPINNERS"
  );
};

const usesHoseFromShelfToTFitting = (config: GeneralBOMConfig): boolean => {
  return (
    isOneOfOutlets(
      [config.pump_outlet_1_15kw, config.pump_outlet_2_15kw],
      "LOW_SPINNERS",
    ) ||
    isOneOfOutlets(
      [config.pump_outlet_1_15kw, config.pump_outlet_2_15kw],
      "HIGH_BARS",
    ) ||
    isOneOfOutlets(
      [config.pump_outlet_1_15kw, config.pump_outlet_2_15kw],
      "LOW_BARS",
    ) ||
    isOneOfOutlets(
      [config.pump_outlet_1_30kw, config.pump_outlet_2_30kw],
      "HIGH_MEDIUM_SPINNERS",
    ) ||
    isOneOfOutlets(
      [config.pump_outlet_1_30kw, config.pump_outlet_2_30kw],
      "LOW_MEDIUM_SPINNERS",
    ) ||
    isOneOfOutlets(
      [config.pump_outlet_1_30kw, config.pump_outlet_2_30kw],
      "LOW_SPINNERS_HIGH_BARS",
    )
  );
};

type TOutlet = HpPump15kwOutletType | HpPump30kwOutletType | null;
const hasOneOutlet = (outlet1: TOutlet, outlet2: TOutlet): boolean => {
  const boolA = !!outlet1;
  const boolB = !!outlet2;
  return boolA !== boolB; // true if exactly one of them is truthy
};

const hasTwoOutlets = (outlet1: TOutlet, outlet2: TOutlet): boolean => {
  return !!outlet1 && !!outlet2;
};

const isOneOfOutlets = (outletArray: TOutlet[], value: TOutlet): boolean => {
  return outletArray.some((outlet) => outlet === value);
};

export const hpPumpBOM: MaxBOMItem<GeneralBOMConfig>[] = [
  {
    pn: PART_NUMBERS.PUMP_15KW,
    conditions: [uses15kwPump, (config) => !config.has_15kw_pump_softstart],
    qty: 1,
    _description: "15kW pump",
  },
  {
    pn: PART_NUMBERS.PUMP_15KW_WITH_SOFTSTART,
    conditions: [uses15kwPump, (config) => config.has_15kw_pump_softstart],
    qty: 1,
    _description: "15kW pump with softstart",
  },
  {
    pn: PART_NUMBERS.PUMP_30KW,
    conditions: [uses30kwPump],
    qty: 1,
    _description: "30kW pump",
  },
  {
    pn: PART_NUMBERS.OMZ_PUMP,
    conditions: [usesOMZPump],
    qty: 1,
    _description: "OMZ pump",
  },
  {
    pn: PART_NUMBERS.PNEUMATIC_VALVE_15KW_WITH_ANTIFREEZE,
    conditions: [
      uses15kwPump,
      (config) =>
        hasOneOutlet(config.pump_outlet_1_15kw, config.pump_outlet_2_15kw),
      (config) => config.has_antifreeze,
    ],
    qty: 1,
    _description: "15kW pump outlet, with antifreeze",
  },
  {
    pn: PART_NUMBERS.PNEUMATIC_VALVE_15KW_NO_ANTIFREEZE,
    conditions: [
      uses15kwPump,
      (config) =>
        hasOneOutlet(config.pump_outlet_1_15kw, config.pump_outlet_2_15kw),
      (config) => !config.has_antifreeze,
    ],
    qty: 1,
    _description: "15kW pump outlet, no antifreeze",
  },
  {
    pn: PART_NUMBERS.TWO_PNEUMATIC_VALVES_15KW_WITH_ANTIFREEZE,
    conditions: [
      uses15kwPump,
      (config) =>
        hasTwoOutlets(config.pump_outlet_1_15kw, config.pump_outlet_2_15kw),
      (config) => config.has_antifreeze,
    ],
    qty: 1,
    _description: "2 x 15kW pump outlet, with antifreeze",
  },
  {
    pn: PART_NUMBERS.TWO_PNEUMATIC_VALVES_15KW_NO_ANTIFREEZE,
    conditions: [
      uses15kwPump,
      (config) =>
        hasTwoOutlets(config.pump_outlet_1_15kw, config.pump_outlet_2_15kw),
      (config) => !config.has_antifreeze,
    ],
    qty: 1,
    _description: "2 x 15kW pump outlet, no antifreeze",
  },
  {
    pn: PART_NUMBERS.PNEUMATIC_VALVE_30KW_WITH_ANTIFREEZE,
    conditions: [
      uses30kwPump,
      (config) =>
        hasOneOutlet(config.pump_outlet_1_30kw, config.pump_outlet_2_30kw),
      (config) => config.has_antifreeze,
    ],
    qty: 1,
    _description: "30kW pump outlet, with antifreeze",
  },
  {
    pn: PART_NUMBERS.PNEUMATIC_VALVE_30KW_NO_ANTIFREEZE,
    conditions: [
      uses30kwPump,
      (config) =>
        hasOneOutlet(config.pump_outlet_1_30kw, config.pump_outlet_2_30kw),
      (config) => !config.has_antifreeze,
    ],
    qty: 1,
    _description: "30kW pump outlet, no antifreeze",
  },
  {
    pn: PART_NUMBERS.TWO_PNEUMATIC_VALVES_30KW_WITH_ANTIFREEZE,
    conditions: [
      uses30kwPump,
      (config) =>
        hasTwoOutlets(config.pump_outlet_1_30kw, config.pump_outlet_2_30kw),
      (config) => config.has_antifreeze,
    ],
    qty: 1,
    _description: "2 x 30kW pump outlet, with antifreeze",
  },
  {
    pn: PART_NUMBERS.TWO_PNEUMATIC_VALVES_30KW_NO_ANTIFREEZE,
    conditions: [
      uses30kwPump,
      (config) =>
        hasTwoOutlets(config.pump_outlet_1_30kw, config.pump_outlet_2_30kw),
      (config) => !config.has_antifreeze,
    ],
    qty: 1,
    _description: "2 x 30kW pump outlet, no antifreeze",
  },
  {
    pn: PART_NUMBERS.CHASSIS_WASH_15KW,
    conditions: [
      uses15kwPump,
      (config) =>
        isOneOfOutlets(
          [config.pump_outlet_1_15kw, config.pump_outlet_2_15kw],
          "CHASSIS_WASH",
        ),
    ],
    qty: 1,
    _description: "Chassis wash (15kW)",
  },
  {
    pn: PART_NUMBERS.CHASSIS_WASH_30KW_HORIZONTAL,
    conditions: [
      uses30kwPump,
      (config) =>
        isOneOfOutlets(
          [config.pump_outlet_1_30kw, config.pump_outlet_2_30kw],
          "CHASSIS_WASH_HORIZONTAL",
        ),
    ],
    qty: 1,
    _description: "Chassis wash (30kW), horizontal",
  },
  {
    pn: PART_NUMBERS.CHASSIS_WASH_30KW_WITH_LATERAL_BARS,
    conditions: [
      uses30kwPump,
      (config) =>
        isOneOfOutlets(
          [config.pump_outlet_1_30kw, config.pump_outlet_2_30kw],
          "CHASSIS_WASH_LATERAL_HORIZONTAL",
        ),
    ],
    qty: 1,
    _description: "Chassis wash (30kW), lateral + horizontal",
  },
  {
    pn: PART_NUMBERS.CHASSIS_WASH_PLATES_15KW,
    conditions: [
      uses15kwPump,
      (config) =>
        isOneOfOutlets(
          [config.pump_outlet_1_15kw, config.pump_outlet_2_15kw],
          "CHASSIS_WASH",
        ),
      (config) => config.has_chassis_wash_plates,
    ],
    qty: 1,
    _description: "Chassis wash plates (15kW)",
  },
  {
    pn: PART_NUMBERS.CHASSIS_WASH_PLATES_30KW,
    conditions: [
      uses30kwPump,
      (config) =>
        isOneOfOutlets(
          [config.pump_outlet_1_30kw, config.pump_outlet_2_30kw],
          "CHASSIS_WASH_HORIZONTAL",
        ) ||
        isOneOfOutlets(
          [config.pump_outlet_1_30kw, config.pump_outlet_2_30kw],
          "CHASSIS_WASH_LATERAL_HORIZONTAL",
        ),
      (config) => config.has_chassis_wash_plates,
    ],
    qty: 1,
    _description: "Chassis wash plates (30kW)",
  },
  {
    pn: PART_NUMBERS.ULTRASONIC_SENSOR_POST,
    conditions: [
      uses15kwOr30kwPump,
      (config) => config.chassis_wash_sensor_type === "SINGLE_POST",
    ],
    qty: 1,
    _description: "Ultrasonic sensor - single post",
  },
  {
    pn: PART_NUMBERS.DUAL_ULTRASONIC_SENSORS_POST,
    conditions: [
      uses15kwOr30kwPump,
      (config) => config.chassis_wash_sensor_type === "DOUBLE_POST",
    ],
    qty: 1,
    _description: "Ultrasonic sensors - double post",
  },
  {
    pn: PART_NUMBERS.ULTRASONIC_SENSOR_WALL,
    conditions: [
      uses15kwOr30kwPump,
      (config) => config.chassis_wash_sensor_type === "SINGLE_WALL",
    ],
    qty: 1,
    _description: "Ultrasonic sensor - single wall",
  },
  {
    pn: PART_NUMBERS.DUAL_ULTRASONIC_SENSORS_WALL,
    conditions: [
      uses15kwOr30kwPump,
      (config) => config.chassis_wash_sensor_type === "DOUBLE_WALL",
    ],
    qty: 1,
    _description: "Ultrasonic sensors - double wall",
  },
  {
    pn: PART_NUMBERS.MID_HEIGHT_HP_BARS,
    conditions: [
      uses15kwPump,
      (config) =>
        isOneOfOutlets(
          [config.pump_outlet_1_15kw, config.pump_outlet_2_15kw],
          "LOW_BARS",
        ),
    ],
    qty: 1,
    _description: "Mid-height HP bars",
  },
  {
    pn: PART_NUMBERS.FULL_HEIGHT_HP_BARS,
    conditions: [
      uses15kwPump,
      (config) =>
        isOneOfOutlets(
          [config.pump_outlet_1_15kw, config.pump_outlet_2_15kw],
          "HIGH_BARS",
        ),
    ],
    qty: 1,
    _description: "Full-height HP bars",
  },
  {
    pn: PART_NUMBERS.LOW_SPINNERS_2X150L,
    conditions: [
      uses15kwPump,
      (config) =>
        isOneOfOutlets(
          [config.pump_outlet_1_15kw, config.pump_outlet_2_15kw],
          "LOW_SPINNERS",
        ),
    ],
    qty: 1,
    _description: "Low spinners (2x150l)",
  },
  {
    pn: PART_NUMBERS.HIGH_BARS_2X150L_LOW_SPINNERS_2X150,
    conditions: [
      uses30kwPump,
      (config) =>
        isOneOfOutlets(
          [config.pump_outlet_1_30kw, config.pump_outlet_2_30kw],
          "LOW_SPINNERS_HIGH_BARS",
        ),
    ],
    qty: 1,
    _description: "High bars (2x150l)",
  },
  {
    pn: PART_NUMBERS.LOW_MEDIUM_SPINNERS_4X150L,
    conditions: [
      uses30kwPump,
      (config) =>
        isOneOfOutlets(
          [config.pump_outlet_1_30kw, config.pump_outlet_2_30kw],
          "LOW_MEDIUM_SPINNERS",
        ),
    ],
    qty: 1,
    _description: "Low and medium spinners (4x150l)",
  },
  {
    pn: PART_NUMBERS.HIGH_MEDIUM_SPINNERS_4X150L,
    conditions: [
      uses30kwPump,
      (config) =>
        isOneOfOutlets(
          [config.pump_outlet_1_30kw, config.pump_outlet_2_30kw],
          "HIGH_MEDIUM_SPINNERS",
        ),
    ],
    qty: 1,
    _description: "High and medium spinners (4x150l)",
  },
  {
    pn: PART_NUMBERS.HP_ROOF_BAR,
    conditions: [usesOMZPump, usesHPRoofBar],
    qty: 1,
    _description: "HP roof bar",
  },
  {
    pn: PART_NUMBERS.CHEMICAL_ROOF_BAR,
    conditions: [usesHPRoofBar, (config) => config.has_chemical_roof_bar],
    qty: 1,
    _description: "Chemical roof bar",
  },
  {
    pn: PART_NUMBERS.HIGH_SPINNERS_4X43L,
    conditions: [
      usesOMZPump,
      (config) =>
        config.pump_outlet_omz === "HP_ROOF_BAR_SPINNERS" ||
        config.pump_outlet_omz === "SPINNERS",
    ],
    qty: 1,
    _description: "High spinners (4x43l)",
  },
  {
    pn: PART_NUMBERS.HP_VALVE_ASSY,
    conditions: [usesHPDeviationValveKit],
    qty: 1,
    _description: "HP deviation kit",
  },
  {
    pn: PART_NUMBERS.HOSE_RIGHT_SHELF_TO_VALVE_ASSY_4_SPINNERS,
    conditions: [
      usesHPDeviationValveKit,
      (config) => !config.has_shelf_extension,
      (config) => config.supply_side === "RIGHT",
    ],
    qty: 1,
    _description: "Hose from right shelf to valve assembly (4 spinners)",
  },
  {
    pn: PART_NUMBERS.HOSE_LEFT_SHELF_TO_VALVE_ASSY_4_SPINNERS,
    conditions: [
      usesHPDeviationValveKit,
      (config) => !config.has_shelf_extension,
      (config) => config.supply_side === "LEFT",
    ],
    qty: 1,
    _description: "Hose from left shelf to valve assembly (4 spinners)",
  },
  {
    pn: PART_NUMBERS.HOSE_SHELF_TO_T_FITTING_2_SPINNERS,
    conditions: [
      uses15kwOr30kwPump,
      (config) => !config.has_shelf_extension,
      usesHoseFromShelfToTFitting,
    ],
    qty: (config) => (uses30kwPump(config) ? 2 : 1),
    _description: "Hose from shelf to T fitting (2 spinners)",
  },
  {
    pn: PART_NUMBERS.HOSE_RIGHT_SHELF_TO_VALVE_ASSY_4_SPINNERS_W_EXT,
    conditions: [
      usesHPDeviationValveKit,
      (config) => config.has_shelf_extension,
      (config) => config.supply_side === "RIGHT",
    ],
    qty: 1,
    _description:
      "Hose from right shelf to valve assembly (4 spinners) with extension",
  },
  {
    pn: PART_NUMBERS.HOSE_LEFT_SHELF_TO_VALVE_ASSY_4_SPINNERS_W_EXT,
    conditions: [
      usesHPDeviationValveKit,
      (config) => config.has_shelf_extension,
      (config) => config.supply_side === "LEFT",
    ],
    qty: 1,
    _description:
      "Hose from left shelf to valve assembly (4 spinners) with extension",
  },
  {
    pn: PART_NUMBERS.HOSE_SHELF_TO_T_FITTING_2_SPINNERS_W_EXT,
    conditions: [
      uses15kwOr30kwPump,
      (config) => config.has_shelf_extension,
      usesHoseFromShelfToTFitting,
    ],
    qty: (config) => (uses30kwPump(config) ? 2 : 1),
    _description: "Hose from shelf to T fitting (2 spinners) with extension",
  },
  // OMZ machine type
  {
    pn: PART_NUMBERS.LOW_SPINNER_ASSY_OMZ,
    conditions: [isOMZ],
    qty: 1,
    _description: "Low spinner assembly OMZ",
  },
  {
    pn: PART_NUMBERS.HIGH_SPINNER_ASSY_OMZ,
    conditions: [isOMZ],
    qty: 1,
    _description: "High spinner assembly OMZ",
  },
  {
    pn: PART_NUMBERS.HP_VALVE_ASSY_INOX,
    conditions: [isOMZ],
    qty: 1,
    _description: "HP valve assembly INOX OMZ",
  },
  {
    pn: PART_NUMBERS.HOSE_SHELF_TO_T_FITTING_2_SPINNERS_OMZ,
    conditions: [isOMZ, (config) => !config.has_shelf_extension],
    qty: 1,
    _description: "Hose from shelf to T fitting (2 spinners) OMZ",
  },
  {
    pn: PART_NUMBERS.HOSE_SHELF_TO_T_FITTING_2_SPINNERS_OMZ_W_EXT,
    conditions: [isOMZ, (config) => config.has_shelf_extension],
    qty: 1,
    _description:
      "Hose from shelf to T fitting (2 spinners) OMZ with extension",
  },
  {
    pn: PART_NUMBERS.HOSE_RIGHT_SHELF_TO_VALVE_ASSY_4_SPINNERS_OMZ,
    conditions: [
      isOMZ,
      (config) => !config.has_shelf_extension,
      (config) => config.supply_side === "RIGHT",
    ],
    qty: 2,
    _description: "Hose from right shelf to valve assembly (4 spinners) OMZ",
  },
  {
    pn: PART_NUMBERS.HOSE_RIGHT_SHELF_TO_VALVE_ASSY_4_SPINNERS_OMZ_W_EXT,
    conditions: [
      isOMZ,
      (config) => config.has_shelf_extension,
      (config) => config.supply_side === "RIGHT",
    ],
    qty: 2,
    _description:
      "Hose from right shelf to valve assembly (4 spinners) OMZ with extension",
  },
  {
    pn: PART_NUMBERS.HOSE_LEFT_SHELF_TO_VALVE_ASSY_4_SPINNERS_OMZ,
    conditions: [
      isOMZ,
      (config) => !config.has_shelf_extension,
      (config) => config.supply_side === "LEFT",
    ],
    qty: 2,
    _description: "Hose from left shelf to valve assembly (4 spinners) OMZ",
  },
  {
    pn: PART_NUMBERS.HOSE_LEFT_SHELF_TO_VALVE_ASSY_4_SPINNERS_OMZ_W_EXT,
    conditions: [
      isOMZ,
      (config) => config.has_shelf_extension,
      (config) => config.supply_side === "LEFT",
    ],
    qty: 2,
    _description:
      "Hose from left shelf to valve assembly (4 spinners) OMZ with extension",
  },
];
