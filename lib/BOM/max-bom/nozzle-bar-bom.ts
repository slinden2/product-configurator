import { Configuration } from "@/db/schemas";
import { MaxBOMItem } from "@/lib/BOM/max-bom";

const PART_NUMBERS: Record<string, string> = {
  PREWASH_ARCH: "450.36.000",
  RINSE_ARCH: "450.36.001",
  RINSE_ARCH_INOX: "450.36.001IN", // TODO To be added in BOM.
  POSTERIOR_LATERAL_PREWASH_BARS: "450.36.002",
  POSTERIOR_LATERAL_PREWASH_BARS_INOX: "450.36.002IN", // TODO To be added in BOM.
  PREWASH_ARCH_ACID_INOX: "450.36.003IN", // TODO Add form validation rules regarding this option
  LATERAL_PREWASH_BARS: "450.36.004",
  LATERAL_RINSE_BARS: "450.36.005",
  LOW_PREWASH_BARS: "450.36.006",
  LOW_POSTERIOR_PREWASH_BARS: "450.36.008", // TODO To be added in Excel or add form validation rules regarding this option
  POSTERIOR_LATERAL_PREWASH_BARS_7_NOZZLES: "450.36.009",
  FLOW_SWITCH: "450.36.060",
  FLOW_SWITCH_INOX: "450.36.060IN", // TODO To be added in BOM.
  RINSE_SOLENOIDS_PREWASH_ABOARD: "450.36.070",
  RINSE_SOLENOIDS_PREWASH_ABOARD_INOX: "450.36.070IN", // TODO To be added in BOM.
  RINSE_SOLENOID_PREWASH_WASH_BAY: "450.36.071",
  RINSE_SOLENOID_PREWASH_INOX: "450.36.071IN", // TODO To be added in BOM.
  PREWASH_SOLENOID_PREWASH_ABOARD: "450.36.072",
  PREWASH_SOLENOID_PREWASH_ABOARD_INOX: "450.36.072IN", // TODO To abe added in BOM.
  PREWASH_SOLENOIDS_HP_ROOF_BAR_PREWASH_ABOARD: "450.36.073",
  PREWASH_SOLENOIDS_HP_ROOF_BAR_PREWASH_ABOARD_INOX: "450.36.073IN", // TODO To be added in BOM.
  FITTINGS_FOR_PREWASH_WASH_BAY: "450.36.074",
  FITTINGS_FOR_PREWASH_WASH_BAY_INOX: "450.36.074IN", // TODO To be added in BOM.
  PREWASH_SOLENOIDS_HP_ROOF_BAR_PREWASH_WASH_BAY: "450.36.075",
  PREWASH_SOLENOIDS_HP_ROOF_BAR_PREWASH_WASH_BAY_INOX: "450.36.075IN", // TODO To be added in BOM.
  FITTINGS_FOR_WAX_PUMP: "450.36.076",
  FITTINGS_FOR_RINSE_WITHOUT_PREWASH: "450.36.077",
  FITTINGS_FOR_DOUBLE_SUPPLY: "450.36.078",
  SUPPLEMENTARY_RINSE_ARCH_FAST: "450.65.000",
  SUPPLEMENTARY_LATERAL_RINSE_BARS_FAST: "450.65.002",
};

const hasHpRoofBar = (config: Configuration): boolean =>
  config.pump_outlet_omz === "HP_ROOF_BAR" ||
  config.pump_outlet_omz === "HP_ROOF_BAR_SPINNERS";

const hasChemicalRoofBar = (config: Configuration): boolean =>
  hasHpRoofBar(config) && config.has_chemical_roof_bar;

const hasPrewashOrAcidOnBoard = (config: Configuration): boolean =>
  config.chemical_pump_pos === "ABOARD" || config.acid_pump_pos === "ABOARD";

const hasOneChemical = (config: Configuration): boolean =>
  config.has_chemical_pump && config.chemical_qty === 1;

const hasTwoChemicals = (config: Configuration): boolean =>
  config.has_chemical_pump && config.chemical_qty === 2;

export const nozzleBarBOM: MaxBOMItem<Configuration>[] = [
  // Rinse
  {
    pn: PART_NUMBERS.RINSE_ARCH,
    conditions: [(config) => config.brush_qty === 3],
    qty: 1,
    _description: "Rinse Arch",
  },
  {
    pn: PART_NUMBERS.LATERAL_RINSE_BARS,
    conditions: [(config) => config.brush_qty === 2],
    qty: 1,
    _description: "Lateral rinse bars",
  },
  {
    pn: PART_NUMBERS.RINSE_SOLENOIDS_PREWASH_ABOARD,
    conditions: [
      (config) => config.brush_qty > 0,
      (config) => config.has_chemical_pump || config.has_acid_pump,
      hasPrewashOrAcidOnBoard,
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
    ],
    qty: 1,
    _description: "Prewash Arch",
  },
  {
    pn: PART_NUMBERS.POSTERIOR_LATERAL_PREWASH_BARS,
    conditions: [hasOneChemical, hasChemicalRoofBar],
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
    pn: PART_NUMBERS.LOW_PREWASH_BARS,
    conditions: [hasTwoChemicals, (config) => !hasChemicalRoofBar(config)],
    qty: 1,
    _description: "Low prewash bars",
  },
  {
    pn: PART_NUMBERS.LOW_POSTERIOR_PREWASH_BARS,
    conditions: [hasTwoChemicals, hasChemicalRoofBar],
    qty: 1,
    _description: "Low posterior prewash bars",
  },
  {
    pn: PART_NUMBERS.PREWASH_ARCH_7_NOZZLES,
    conditions: [
      (config) => config.brush_qty !== 2,
      hasTwoChemicals,
      (config) => !hasChemicalRoofBar(config),
    ],
    qty: 1,
    _description: "Prewash Arch with 7 nozzles",
  },
  {
    pn: PART_NUMBERS.POSTERIOR_LATERAL_PREWASH_BARS_7_NOZZLES,
    conditions: [hasTwoChemicals, hasChemicalRoofBar],
    qty: 1,
    _description: "Posterior prewash bars with 7 nozzles",
  },
  {
    pn: PART_NUMBERS.FLOW_SWITCH,
    conditions: [(config) => config.has_itecoweb],
    qty: 1,
    _description: "Float switch",
  },
  {
    pn: PART_NUMBERS.PREWASH_SOLENOID_PREWASH_ABOARD,
    conditions: [
      (config) => config.has_chemical_pump,
      (config) => config.chemical_pump_pos === "ABOARD",
      (config) => !hasChemicalRoofBar(config),
    ],
    qty: (config) => config.chemical_qty || 1,
    _description: "Prewash solenoid (prewash onboard)",
  },
  {
    pn: PART_NUMBERS.PREWASH_SOLENOID_PREWASH_ABOARD,
    conditions: [
      hasTwoChemicals,
      (config) => config.chemical_pump_pos === "ABOARD",
      hasChemicalRoofBar,
    ],
    qty: 1,
    _description:
      "Prewash solenoid (prewash onboard) (only when double prewash and hp roof bar with chemical)",
  },
  {
    pn: PART_NUMBERS.PREWASH_SOLENOIDS_HP_ROOF_BAR_PREWASH_ABOARD,
    conditions: [
      (config) => config.has_chemical_pump,
      (config) => config.chemical_pump_pos === "ABOARD",
      hasChemicalRoofBar,
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
    ],
    qty: 1,
    _description: "Prewash solenoids (hp roof bar and prewash in wash bay)",
  },

  // Acid
  {
    pn: PART_NUMBERS.PREWASH_ARCH_ACID_INOX,
    conditions: [(config) => config.has_acid_pump],
    qty: 1,
    _description: "Prewash Arch with acid",
  },
  {
    pn: PART_NUMBERS.PREWASH_SOLENOID_PREWASH_ABOARD_INOX,
    conditions: [
      (config) => config.has_acid_pump,
      (config) => config.acid_pump_pos === "ABOARD",
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
    conditions: [(config) => config.has_wax_pump],
    qty: 1,
    _description: "Fittings for wax pump",
  },

  {
    pn: PART_NUMBERS.FITTINGS_FOR_DOUBLE_SUPPLY,
    conditions: [
      (config) => !!config.water_2_type,
      (config) => config.supply_type !== "CABLE_CHAIN",
    ],
    qty: 1,
    _description: "Fittings for double supply",
  },

  // Fast
  {
    pn: PART_NUMBERS.SUPPLEMENTARY_RINSE_ARCH_FAST,
    conditions: [
      (config) => config.is_fast,
      (config) => config.brush_qty === 3,
    ],
    qty: 1,
    _description: "Supplementary rinse arch (fast)",
  },
  {
    pn: PART_NUMBERS.SUPPLEMENTARY_LATERAL_RINSE_BARS_FAST,
    conditions: [
      (config) => config.is_fast,
      (config) => config.brush_qty === 2,
    ],
    qty: 1,
    _description: "Supplementary rinse bars (fast)",
  },
];
