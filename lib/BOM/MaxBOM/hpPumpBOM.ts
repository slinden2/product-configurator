import { MaxBOMItem } from "@/lib/BOM/MaxBOM";
import { $Enums, Configuration } from "@prisma/client";

const PART_NUMBERS: Record<string, string> = {
  PUMP_15KW: "1100.024.030",
  PUMP_15KW_WITH_SOFTSTART: "1100.024.032", // TODO Add this in the form
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
  COVER_PLATE_KIT: "1100.024.008", // TODO Add option for this in the form
  ULTRASONIC_SENSOR_POST: "1100.021.000", // TODO Now this is automatically chosen with lavachassis. Missing logic for wall sensor and double sensors.
  ULTRASONIC_SENSOR_WALL: "1100.052.000", // TODO Add this in the form
  DUAL_ULTRASONIC_SENSORS_POST: "1100.021.001", // TODO Add this in the form
  DUAL_ULTRASONIC_SENSORS_WALL: "1100.052.004", // TODO Add this in the form
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
};

const uses15kwPump = (config: Configuration): boolean => config.has_15kw_pump;
const uses30kwPump = (config: Configuration): boolean => config.has_30kw_pump;
const uses15kwOr30kwPump = (config: Configuration): boolean =>
  config.has_15kw_pump || config.has_30kw_pump;
const usesOMZPump = (config: Configuration): boolean => config.has_omz_pump;
const usesHPRoofBar = (config: Configuration): boolean => {
  return (
    usesOMZPump(config) &&
    (config.pump_outlet_omz === $Enums.HpPumpOMZOutletType.HP_ROOF_BAR ||
      config.pump_outlet_omz ===
        $Enums.HpPumpOMZOutletType.HP_ROOF_BAR_SPINNERS)
  );
};
const usesHPDeviationValveKit = (config: Configuration) => {
  return (
    usesOMZPump(config) &&
    config.pump_outlet_omz === $Enums.HpPumpOMZOutletType.HP_ROOF_BAR_SPINNERS
  );
};

type TOutlet = $Enums.HpPump15kwOutletType | $Enums.HpPump30kwOutletType | null;
const hasOneOutlet = (outlet1: TOutlet, outlet2: TOutlet): boolean => {
  const boolA = !!outlet1;
  const boolB = !!outlet2;
  return boolA !== boolB && (boolA || boolB);
};

const hasTwoOutlets = (outlet1: TOutlet, outlet2: TOutlet): boolean => {
  return !!outlet1 && !!outlet2;
};

const isOneOfOutlets = (outletArray: TOutlet[], value: TOutlet): boolean => {
  return outletArray.some((outlet) => outlet === value);
};

export const hpPumpBOM: MaxBOMItem<Configuration>[] = [
  {
    pn: PART_NUMBERS.PUMP_15KW,
    conditions: [uses15kwPump],
    qty: 1,
    _description: "15kW pump",
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
    _description: "15kW pump outlet with antifreeze",
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
    _description: "15kW pump outlet no antifreeze",
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
    _description: "2 x 15kW pump outlet with antifreeze",
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
    _description: "2 x 15kW pump outlet no antifreeze",
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
    _description: "30kW pump outlet with antifreeze",
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
    _description: "30kW pump outlet no antifreeze",
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
    _description: "2 x 30kW pump outlet with antifreeze",
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
    _description: "2 x 30kW pump outlet no antifreeze",
  },
  {
    pn: PART_NUMBERS.CHASSIS_WASH_15KW,
    conditions: [
      uses15kwPump,
      (config) =>
        isOneOfOutlets(
          [config.pump_outlet_1_15kw, config.pump_outlet_2_15kw],
          $Enums.HpPump15kwOutletType.CHASSIS_WASH
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
          $Enums.HpPump30kwOutletType.CHASSIS_WASH_HORIZONTAL
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
          $Enums.HpPump30kwOutletType.CHASSIS_WASH_LATERAL_HORIZONTAL
        ),
    ],
    qty: 1,
    _description: "Chassis wash (30kW), lateral+horizontal",
  },
  {
    pn: PART_NUMBERS.ULTRASONIC_SENSOR_POST,
    conditions: [
      uses15kwOr30kwPump,
      (config) =>
        isOneOfOutlets(
          [config.pump_outlet_1_30kw, config.pump_outlet_2_30kw],
          $Enums.HpPump15kwOutletType.CHASSIS_WASH
        ) ||
        isOneOfOutlets(
          [config.pump_outlet_1_30kw, config.pump_outlet_2_30kw],
          $Enums.HpPump30kwOutletType.CHASSIS_WASH_HORIZONTAL
        ) ||
        isOneOfOutlets(
          [config.pump_outlet_1_30kw, config.pump_outlet_2_30kw],
          $Enums.HpPump30kwOutletType.CHASSIS_WASH_LATERAL_HORIZONTAL
        ),
    ],
    qty: 1,
    _description: "Ultrasonic sensor post",
  },
  {
    pn: PART_NUMBERS.MID_HEIGHT_HP_BARS,
    conditions: [
      uses15kwPump,
      (config) =>
        isOneOfOutlets(
          [config.pump_outlet_1_15kw, config.pump_outlet_2_15kw],
          $Enums.HpPump15kwOutletType.LOW_BARS
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
          $Enums.HpPump15kwOutletType.HIGH_BARS
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
          $Enums.HpPump15kwOutletType.LOW_SPINNERS
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
          $Enums.HpPump30kwOutletType.LOW_SPINNERS_HIGH_BARS
        ),
    ],
    qty: 1,
    _description: "High bars (2x150)",
  },
  {
    pn: PART_NUMBERS.LOW_MEDIUM_SPINNERS_4X150L,
    conditions: [
      uses30kwPump,
      (config) =>
        isOneOfOutlets(
          [config.pump_outlet_1_30kw, config.pump_outlet_2_30kw],
          $Enums.HpPump30kwOutletType.LOW_MEDIUM_SPINNERS
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
          $Enums.HpPump30kwOutletType.HIGH_MEDIUM_SPINNERS
        ),
    ],
    qty: 1,
    _description: "Low and medium spinners (4x150l)",
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
        config.pump_outlet_omz ===
          $Enums.HpPumpOMZOutletType.HP_ROOF_BAR_SPINNERS ||
        config.pump_outlet_omz === $Enums.HpPumpOMZOutletType.SPINNERS,
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
      (config) => config.supply_side === $Enums.SupplySide.RIGHT,
    ],
    qty: 1,
    _description: "Hose from right shelf to valve assy (4 spinners)",
  },
  {
    pn: PART_NUMBERS.HOSE_LEFT_SHELF_TO_VALVE_ASSY_4_SPINNERS,
    conditions: [
      usesHPDeviationValveKit,
      (config) => config.supply_side === $Enums.SupplySide.LEFT,
    ],
    qty: 1,
    _description: "Hose from left shelf to valve assy (4 spinners)",
  },
  {
    pn: PART_NUMBERS.HOSE_SHELF_TO_T_FITTING_2_SPINNERS,
    conditions: [
      uses15kwOr30kwPump,
      (config) =>
        isOneOfOutlets(
          [config.pump_outlet_1_15kw, config.pump_outlet_2_15kw],
          $Enums.HpPump15kwOutletType.LOW_SPINNERS
        ) ||
        isOneOfOutlets(
          [config.pump_outlet_1_15kw, config.pump_outlet_2_15kw],
          $Enums.HpPump15kwOutletType.HIGH_BARS
        ) ||
        isOneOfOutlets(
          [config.pump_outlet_1_15kw, config.pump_outlet_2_15kw],
          $Enums.HpPump15kwOutletType.LOW_BARS
        ) ||
        isOneOfOutlets(
          [config.pump_outlet_1_30kw, config.pump_outlet_2_30kw],
          $Enums.HpPump30kwOutletType.HIGH_MEDIUM_SPINNERS
        ) ||
        isOneOfOutlets(
          [config.pump_outlet_1_30kw, config.pump_outlet_2_30kw],
          $Enums.HpPump30kwOutletType.LOW_MEDIUM_SPINNERS
        ) ||
        isOneOfOutlets(
          [config.pump_outlet_1_30kw, config.pump_outlet_2_30kw],
          $Enums.HpPump30kwOutletType.LOW_SPINNERS_HIGH_BARS
        ),
    ],
    qty: (config) => (uses30kwPump(config) ? 2 : 1),
    _description: "Hose from shelf to T fitting (2 spinners)",
  },
];
