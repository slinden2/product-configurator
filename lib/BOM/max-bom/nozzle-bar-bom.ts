import { GeneralBOMConfig } from "@/lib/BOM";
import { MaxBOMItem } from "@/lib/BOM/max-bom";

const PART_NUMBERS = {
  PREWASH_ARCH: "450.36.000",
  PREWASH_ARCH_INOX: "450.36.000IN",
  RINSE_ARCH: "450.36.001",
  RINSE_ARCH_INOX: "450.36.001IN",
  POSTERIOR_LATERAL_PREWASH_BARS: "450.36.002",
  POSTERIOR_LATERAL_PREWASH_BARS_INOX: "450.36.002IN",
  PREWASH_ARCH_ACID_INOX: "450.36.003IN",
  LATERAL_PREWASH_BARS: "450.36.004",
  LATERAL_RINSE_BARS: "450.36.005",
  LOW_PREWASH_BARS: "450.36.006",
  PREWASH_ARCH_2_CHEMICALS: "450.36.007",
  POSTERIOR_LATERAL_PREWASH_BARS_2_CHEMICALS: "450.36.008",
  FLOW_SWITCH: "450.36.060",
  FLOW_SWITCH_INOX: "450.36.060IN",
  RINSE_SOLENOIDS_PREWASH_ONBOARD: "450.36.070",
  RINSE_SOLENOIDS_PREWASH_ONBOARD_INOX: "450.36.070IN",
  RINSE_SOLENOID_PREWASH_WASH_BAY: "450.36.071",
  RINSE_SOLENOID_PREWASH_WASH_BAY_INOX: "450.36.071IN",
  PREWASH_SOLENOID_PREWASH_ONBOARD: "450.36.072",
  PREWASH_SOLENOID_PREWASH_ONBOARD_INOX: "450.36.072IN",
  PREWASH_SOLENOIDS_HP_ROOF_BAR_PREWASH_ONBOARD: "450.36.073",
  PREWASH_SOLENOIDS_HP_ROOF_BAR_PREWASH_ONBOARD_INOX: "450.36.073IN",
  FITTINGS_FOR_PREWASH_WASH_BAY: "450.36.074",
  FITTINGS_FOR_PREWASH_WASH_BAY_INOX: "450.36.074IN",
  PREWASH_SOLENOIDS_HP_ROOF_BAR_PREWASH_WASH_BAY: "450.36.075",
  PREWASH_SOLENOIDS_HP_ROOF_BAR_PREWASH_WASH_BAY_INOX: "450.36.075IN",
  FITTINGS_FOR_WAX_PUMP: "450.36.076",
  FITTINGS_FOR_WAX_PUMP_INOX: "450.36.076IN",
  FITTINGS_FOR_RINSE_WITHOUT_PREWASH: "450.36.077",
  FITTINGS_FOR_RINSE_WITHOUT_PREWASH_INOX: "450.36.077IN",
  FITTINGS_FOR_DOUBLE_SUPPLY: "450.36.078",
  FITTINGS_FOR_DOUBLE_SUPPLY_INOX: "450.36.078IN",
} as const satisfies Record<string, string>;

const hasHpRoofBar = (config: GeneralBOMConfig): boolean =>
  config.pump_outlet_omz === "HP_ROOF_BAR" ||
  config.pump_outlet_omz === "HP_ROOF_BAR_SPINNERS";

const hasChemicalRoofBar = (config: GeneralBOMConfig): boolean =>
  hasHpRoofBar(config) && config.has_chemical_roof_bar;

const hasPrewashOrAcidOnBoard = (config: GeneralBOMConfig): boolean =>
  config.chemical_pump_pos === "ONBOARD" || config.acid_pump_pos === "ONBOARD";

const hasOneChemical = (config: GeneralBOMConfig): boolean =>
  config.has_chemical_pump && config.chemical_qty === 1;

const hasTwoChemicals = (config: GeneralBOMConfig): boolean =>
  config.has_chemical_pump && config.chemical_qty === 2;

const isOMZ = (config: GeneralBOMConfig): boolean =>
  config.machine_type === "OMZ";

export const nozzleBarBOM: MaxBOMItem<GeneralBOMConfig>[] = [
  // Rinse
  {
    pn: PART_NUMBERS.RINSE_ARCH,
    conditions: [(config) => config.brush_qty === 3, (config) => !isOMZ(config)],
    qty: 1,
    _description: "Rinse arch",
  },
  {
    pn: PART_NUMBERS.RINSE_ARCH_INOX,
    conditions: [(config) => config.brush_qty === 3, (config) => isOMZ(config)],
    qty: 1,
    _description: "Rinse arch",
  },
  {
    pn: PART_NUMBERS.LATERAL_RINSE_BARS,
    conditions: [(config) => config.brush_qty === 2],
    qty: 1,
    _description: "Lateral rinse bars",
  },
  {
    pn: PART_NUMBERS.RINSE_SOLENOIDS_PREWASH_ONBOARD,
    conditions: [
      (config) => config.brush_qty > 0,
      (config) => config.has_chemical_pump || config.has_acid_pump,
      hasPrewashOrAcidOnBoard,
      config => !isOMZ(config),
    ],
    qty: 1,
    _description: "Rinse solenoids (prewash onboard)",
  },
  {
    pn: PART_NUMBERS.RINSE_SOLENOIDS_PREWASH_ONBOARD_INOX,
    conditions: [
      (config) => config.brush_qty > 0,
      (config) => config.has_chemical_pump || config.has_acid_pump,
      hasPrewashOrAcidOnBoard,
      isOMZ
    ],
    qty: 1,
    _description: "Rinse solenoids (prewash onboard)",
  },
  {
    pn: PART_NUMBERS.RINSE_SOLENOID_PREWASH_WASH_BAY,
    conditions: [
      (config) => config.brush_qty > 0,
      (config) => config.has_chemical_pump || config.has_acid_pump,
      (config) => !hasPrewashOrAcidOnBoard(config),
      config => !isOMZ(config),
    ],
    qty: 1,
    _description: "Rinse solenoid (prewash in wash bay)",
  },
  {
    pn: PART_NUMBERS.RINSE_SOLENOID_PREWASH_WASH_BAY_INOX,
    conditions: [
      (config) => config.brush_qty > 0,
      (config) => config.has_chemical_pump || config.has_acid_pump,
      (config) => !hasPrewashOrAcidOnBoard(config),
      isOMZ
    ],
    qty: 1,
    _description: "Rinse solenoid (prewash in wash bay)",
  },
  {
    pn: PART_NUMBERS.FITTINGS_FOR_RINSE_WITHOUT_PREWASH,
    conditions: [
      (config) => config.brush_qty > 0,
      (config) => !config.has_chemical_pump,
      (config) => !config.has_acid_pump,
      (config) => !isOMZ(config),
    ],
    qty: 1,
    _description: "Fittings for rinse without prewash",
  },
  {
    pn: PART_NUMBERS.FITTINGS_FOR_RINSE_WITHOUT_PREWASH_INOX,
    conditions: [
      (config) => config.brush_qty > 0,
      (config) => !config.has_chemical_pump,
      (config) => !config.has_acid_pump,
      isOMZ,
    ],
    qty: 1,
    _description: "Fittings for rinse without prewash",
  },

  // Prewash
  {
    pn: PART_NUMBERS.PREWASH_ARCH,
    conditions: [
      (config) => config.brush_qty !== 2,
      hasOneChemical,
      (config) => !hasChemicalRoofBar(config),
      (config) => !isOMZ(config),
    ],
    qty: 1,
    _description: "Prewash arch",
  },
  {
    pn: PART_NUMBERS.PREWASH_ARCH_INOX,
    conditions: [
      (config) => config.brush_qty !== 2,
      hasOneChemical,
      (config) => !hasChemicalRoofBar(config),
      (config) => isOMZ(config),
    ],
    qty: 1,
    _description: "Prewash arch",
  },
  {
    pn: PART_NUMBERS.POSTERIOR_LATERAL_PREWASH_BARS,
    conditions: [hasOneChemical, hasChemicalRoofBar, (config) => !isOMZ(config)],
    qty: 1,
    _description: "Posterior lateral prewash bars",
  },
  {
    pn: PART_NUMBERS.POSTERIOR_LATERAL_PREWASH_BARS_INOX,
    conditions: [hasOneChemical, hasChemicalRoofBar, isOMZ],
    qty: 1,
    _description: "Posterior lateral prewash bars",
  },
  {
    pn: PART_NUMBERS.LATERAL_PREWASH_BARS,
    conditions: [
      (config) => config.has_chemical_pump,
      (config) => config.brush_qty === 2,
      (config) => !hasChemicalRoofBar(config),
    ],
    qty: 1,
    _description: "Lateral prewash bars",
  },
  {
    pn: PART_NUMBERS.PREWASH_ARCH_2_CHEMICALS,
    conditions: [
      (config) => config.brush_qty !== 2,
      hasTwoChemicals,
      (config) => !hasChemicalRoofBar(config),
    ],
    qty: 1,
    _description: "Prewash arch for dual chemical",
  },
  {
    pn: PART_NUMBERS.POSTERIOR_LATERAL_PREWASH_BARS_2_CHEMICALS,
    conditions: [hasTwoChemicals, hasChemicalRoofBar],
    qty: 1,
    _description: "Posterior lateral prewash bars for dual chemical",
  },
  {
    pn: PART_NUMBERS.FLOW_SWITCH,
    conditions: [(config) => config.has_itecoweb, (config) => !isOMZ(config)],
    qty: 1,
    _description: "Float switch",
  },
  {
    pn: PART_NUMBERS.FLOW_SWITCH_INOX,
    conditions: [(config) => config.has_itecoweb, isOMZ],
    qty: 1,
    _description: "Float switch",
  },
  {
    pn: PART_NUMBERS.PREWASH_SOLENOID_PREWASH_ONBOARD,
    conditions: [
      (config) => config.has_chemical_pump,
      (config) => config.chemical_pump_pos === "ONBOARD",
      (config) => !hasChemicalRoofBar(config),
      (config) => !isOMZ(config),
    ],
    qty: (config) => config.chemical_qty || 1,
    _description: "Prewash solenoid (prewash onboard)",
  },
  {
    pn: PART_NUMBERS.PREWASH_SOLENOID_PREWASH_ONBOARD,
    conditions: [
      hasTwoChemicals,
      (config) => config.chemical_pump_pos === "ONBOARD",
      hasChemicalRoofBar,
      (config) => !isOMZ(config),
    ],
    qty: 1,
    _description:
      "Prewash solenoid (prewash onboard) (only when double prewash and hp roof bar with chemical)",
  },
  {
    pn: PART_NUMBERS.PREWASH_SOLENOID_PREWASH_ONBOARD_INOX,
    conditions: [
      (config) => config.has_chemical_pump,
      (config) => config.chemical_pump_pos === "ONBOARD",
      (config) => !hasChemicalRoofBar(config),
      isOMZ,
    ],
    qty: (config) => config.chemical_qty || 1,
    _description: "Prewash solenoid (prewash onboard)",
  },
  {
    pn: PART_NUMBERS.PREWASH_SOLENOID_PREWASH_ONBOARD_INOX,
    conditions: [
      hasTwoChemicals,
      (config) => config.chemical_pump_pos === "ONBOARD",
      hasChemicalRoofBar,
      isOMZ,
    ],
    qty: 1,
    _description:
      "Prewash solenoid (prewash onboard) (only when double prewash and hp roof bar with chemical)",
  },
  {
    pn: PART_NUMBERS.PREWASH_SOLENOIDS_HP_ROOF_BAR_PREWASH_ONBOARD,
    conditions: [
      (config) => config.has_chemical_pump,
      (config) => config.chemical_pump_pos === "ONBOARD",
      hasChemicalRoofBar,
      (config) => !isOMZ(config),
    ],
    qty: 1,
    _description: "Prewash solenoids (hp roof bar prewash onboard)",
  },
  {
    pn: PART_NUMBERS.PREWASH_SOLENOIDS_HP_ROOF_BAR_PREWASH_ONBOARD_INOX,
    conditions: [
      (config) => config.has_chemical_pump,
      (config) => config.chemical_pump_pos === "ONBOARD",
      hasChemicalRoofBar,
      isOMZ
    ],
    qty: 1,
    _description: "Prewash solenoids (hp roof bar prewash onboard)",
  },
  {
    pn: PART_NUMBERS.FITTINGS_FOR_PREWASH_WASH_BAY,
    conditions: [
      (config) => config.has_chemical_pump,
      (config) => config.chemical_pump_pos === "WASH_BAY",
      (config) => !hasChemicalRoofBar(config),
      (config) => !isOMZ(config),
    ],
    qty: (config) => config.chemical_qty || 1,
    _description: "Fittings for prewash (prewash in wash bay)",
  },
  {
    pn: PART_NUMBERS.FITTINGS_FOR_PREWASH_WASH_BAY,
    conditions: [
      hasTwoChemicals,
      (config) => config.chemical_pump_pos === "WASH_BAY",
      hasChemicalRoofBar,
      (config) => !isOMZ(config),
    ],
    qty: 1,
    _description:
      "Fittings for prewash (prewash in wash bay) (only when double prewash and hp roof bar with chemical)",
  },
  {
    pn: PART_NUMBERS.FITTINGS_FOR_PREWASH_WASH_BAY_INOX,
    conditions: [
      (config) => config.has_chemical_pump,
      (config) => config.chemical_pump_pos === "WASH_BAY",
      (config) => !hasChemicalRoofBar(config),
      isOMZ
    ],
    qty: (config) => config.chemical_qty || 1,
    _description: "Fittings for prewash (prewash in wash bay)",
  },
  {
    pn: PART_NUMBERS.FITTINGS_FOR_PREWASH_WASH_BAY_INOX,
    conditions: [
      hasTwoChemicals,
      (config) => config.chemical_pump_pos === "WASH_BAY",
      hasChemicalRoofBar,
      isOMZ
    ],
    qty: 1,
    _description:
      "Fittings for prewash (prewash in wash bay) (only when double prewash and hp roof bar with chemical)",
  },
  {
    pn: PART_NUMBERS.PREWASH_SOLENOIDS_HP_ROOF_BAR_PREWASH_WASH_BAY,
    conditions: [
      (config) => config.has_chemical_pump,
      (config) => config.chemical_pump_pos === "WASH_BAY",
      hasChemicalRoofBar,
      (config) => !isOMZ(config),
    ],
    qty: 1,
    _description: "Prewash solenoids (hp roof bar and prewash in wash bay)",
  },
  {
    pn: PART_NUMBERS.PREWASH_SOLENOIDS_HP_ROOF_BAR_PREWASH_WASH_BAY_INOX,
    conditions: [
      (config) => config.has_chemical_pump,
      (config) => config.chemical_pump_pos === "WASH_BAY",
      hasChemicalRoofBar,
      isOMZ
    ],
    qty: 1,
    _description: "Prewash solenoids (hp roof bar and prewash in wash bay)",
  },

  // Acid
  {
    pn: PART_NUMBERS.PREWASH_ARCH_ACID_INOX,
    conditions: [(config) => config.has_acid_pump],
    qty: 1,
    _description: "Prewash arch with acid",
  },
  {
    pn: PART_NUMBERS.PREWASH_SOLENOID_PREWASH_ONBOARD_INOX,
    conditions: [
      (config) => config.has_acid_pump,
      (config) => config.acid_pump_pos === "ONBOARD",
    ],
    qty: 1,
    _description: "Acid solenoid (acid onboard)",
  },
  {
    pn: PART_NUMBERS.FITTINGS_FOR_PREWASH_WASH_BAY_INOX,
    conditions: [
      (config) => config.has_acid_pump,
      (config) => config.acid_pump_pos === "WASH_BAY",
    ],
    qty: 1,
    _description: "Fittings for acid (acid in wash bay)",
  },

  // Other
  {
    pn: PART_NUMBERS.FITTINGS_FOR_WAX_PUMP,
    conditions: [(config) => config.has_wax_pump, (config) => !isOMZ(config)],
    qty: 1,
    _description: "Fittings for wax pump",
  },
  {
    pn: PART_NUMBERS.FITTINGS_FOR_WAX_PUMP_INOX,
    conditions: [(config) => config.has_wax_pump, isOMZ],
    qty: 1,
    _description: "Fittings for wax pump",
  },
  {
    pn: PART_NUMBERS.FITTINGS_FOR_DOUBLE_SUPPLY,
    conditions: [
      (config) => !!config.water_2_type,
      (config) => config.supply_type !== "ENERGY_CHAIN",
      (config) => !isOMZ(config),
    ],
    qty: 1,
    _description: "Fittings for double supply",
  },
  {
    pn: PART_NUMBERS.FITTINGS_FOR_DOUBLE_SUPPLY_INOX,
    conditions: [
      (config) => !!config.water_2_type,
      (config) => config.supply_type !== "ENERGY_CHAIN",
      isOMZ,
    ],
    qty: 1,
    _description: "Fittings for double supply",
  },
];
