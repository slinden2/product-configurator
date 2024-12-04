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
  CHASSIS_WASH_30KW: "1100.024.100",
  CHASSIS_WASH_30KW_WITH_LATERAL_BARS: "1100.024.XXX", // TODO Add option for this in the form
  COVER_PLATE_KIT: "1100.024.008", // TODO Add option for this in the form
  ULTRASONIC_SENSOR_POST: "1100.021.000", // TODO Now this is automatically chosen with lavachassis. Missing logic for wall sensor and double sensors.
  ULTRASONIC_SENSOR_WALL: "1100.052.000",
  DOUBLE_ULTRASONIC_SENSORS: "1100.024.XXX",
  MID_HEIGHT_HP_BARS: "1100.036.005",
  FULL_HEIGHT_HP_BARS: "1100.036.000",
  LOW_SPINNERS_2X150L: "940.11.000",
  HIGH_SPINNERS_4X75L: "940.12.001",
  HIGH_BARS_2X150L: "XXX",
  HP_ROOF_BAR: "450.50.000",
  CHEMICAL_ROOF_BAR: "450.50.XXX",
  HIGH_SPINNERS_4X43L: "940.12.000",
  HP_DEVIATION_KIT: "XXX",
};

const uses15kwPump = (config: Configuration): boolean => config.has_15kw_pump;
const uses30kwPump = (config: Configuration): boolean => config.has_30kw_pump;
const uses15kwOr30kwPump = (config: Configuration): boolean =>
  config.has_15kw_pump || config.has_30kw_pump;
const usesOMZPump = (config: Configuration): boolean => config.has_omz_pump;

type TOutlet = $Enums.HpPump15kwOutletType | $Enums.HpPump30kwOutletType | null;
const hasOneOutlet = (outlet1: TOutlet, outlet2: TOutlet): boolean => {
  const boolA = !!outlet1;
  const boolB = !!outlet2;
  return boolA !== boolB && (boolA || boolB);
};

const hasTwoOutlets = (outlet1: TOutlet, outlet2: TOutlet): boolean => {
  return !!outlet1 && !!outlet2;
};

const hasChassisWash = (outlet1: TOutlet, outlet2: TOutlet): boolean =>
  outlet1 === "CHASSIS_WASH" || outlet2 === "CHASSIS_WASH";

const hasLowSpinners = (outlet1: TOutlet, outlet2: TOutlet): boolean => {
  const possibleChoices: (
    | $Enums.HpPump15kwOutletType
    | $Enums.HpPump30kwOutletType
  )[] = [
    $Enums.HpPump15kwOutletType.LOW_SPINNERS,
    $Enums.HpPump30kwOutletType.LOW_HIGH_SPINNERS,
    $Enums.HpPump30kwOutletType.LOW_SPINNERS_HIGH_BARS,
  ];
  return (
    (outlet1 ? possibleChoices.includes(outlet1) : false) ||
    (outlet2 ? possibleChoices.includes(outlet2) : false)
  );
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
        hasChassisWash(config.pump_outlet_1_15kw, config.pump_outlet_2_15kw),
    ],
    qty: 1,
    _description: "Chassis wash (15kW)",
  },
  {
    pn: PART_NUMBERS.CHASSIS_WASH_30KW,
    conditions: [
      uses30kwPump,
      (config) =>
        hasChassisWash(config.pump_outlet_1_30kw, config.pump_outlet_2_30kw),
    ],
    qty: 1,
    _description: "Chassis wash (30kW)",
  },
  {
    pn: PART_NUMBERS.ULTRASONIC_SENSOR_POST,
    conditions: [
      uses15kwOr30kwPump,
      (config) =>
        hasChassisWash(config.pump_outlet_1_15kw, config.pump_outlet_2_15kw) ||
        hasChassisWash(config.pump_outlet_1_30kw, config.pump_outlet_2_30kw),
    ],
    qty: 1,
    _description: "Ultrasonic sensor post",
  },
  {
    pn: PART_NUMBERS.MID_HEIGHT_HP_BARS,
    conditions: [
      uses15kwPump,
      (config) =>
        config.pump_outlet_1_15kw === $Enums.HpPump15kwOutletType.LOW_BARS ||
        config.pump_outlet_2_15kw === $Enums.HpPump15kwOutletType.LOW_BARS,
    ],
    qty: 1,
    _description: "Mid-height HP bars",
  },
  {
    pn: PART_NUMBERS.FULL_HEIGHT_HP_BARS,
    conditions: [
      uses15kwPump,
      (config) =>
        config.pump_outlet_1_15kw === $Enums.HpPump15kwOutletType.HIGH_BARS ||
        config.pump_outlet_2_15kw === $Enums.HpPump15kwOutletType.HIGH_BARS,
    ],
    qty: 1,
    _description: "Full-height HP bars",
  },
  {
    pn: PART_NUMBERS.LOW_SPINNERS_2X150L,
    conditions: [
      uses15kwOr30kwPump,
      (config) =>
        hasLowSpinners(config.pump_outlet_1_15kw, config.pump_outlet_2_15kw) ||
        hasLowSpinners(config.pump_outlet_1_30kw, config.pump_outlet_2_30kw),
    ],
    qty: 1,
    _description: "Low spinners (2x150l)",
  },
  {
    pn: PART_NUMBERS.HIGH_SPINNERS_4X75L,
    conditions: [
      uses30kwPump,
      (config) =>
        config.pump_outlet_1_30kw ===
          $Enums.HpPump30kwOutletType.LOW_HIGH_SPINNERS ||
        config.pump_outlet_2_30kw ===
          $Enums.HpPump30kwOutletType.LOW_HIGH_SPINNERS,
    ],
    qty: 1,
    _description: "High spinners (4x75l)",
  },
  {
    pn: PART_NUMBERS.HIGH_BARS_2X150L,
    conditions: [
      uses30kwPump,
      (config) =>
        config.pump_outlet_1_30kw ===
          $Enums.HpPump30kwOutletType.LOW_SPINNERS_HIGH_BARS ||
        config.pump_outlet_2_30kw ===
          $Enums.HpPump30kwOutletType.LOW_SPINNERS_HIGH_BARS,
    ],
    qty: 1,
    _description: "High bars (2x150)",
  },
  {
    pn: PART_NUMBERS.HP_ROOF_BAR,
    conditions: [
      usesOMZPump,
      (config) =>
        config.pump_outlet_omz === $Enums.HpPumpOMZOutletType.HP_ROOF_BAR ||
        config.pump_outlet_omz ===
          $Enums.HpPumpOMZOutletType.HP_ROOF_BAR_SPINNERS,
    ],
    qty: 1,
    _description: "HP roof bar",
  },
  {
    pn: PART_NUMBERS.CHEMICAL_ROOF_BAR,
    conditions: [(config) => config.has_chemical_roof_bar],
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
    pn: PART_NUMBERS.HP_DEVIATION_KIT,
    conditions: [
      usesOMZPump,
      (config) =>
        config.pump_outlet_omz ===
        $Enums.HpPumpOMZOutletType.HP_ROOF_BAR_SPINNERS,
    ],
    qty: 1,
    _description: "HP deviation kit",
  },
];
