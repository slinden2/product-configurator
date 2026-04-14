export const MachineTypes = ["STD", "OMZ"] as const;
export type MachineType = (typeof MachineTypes)[number];

export const BrushTypes = ["THREAD", "MIXED", "CARLITE"] as const;
export type BrushType = (typeof BrushTypes)[number];

export const BrushColors = [
  "BLUE_SILVER",
  "GREEN_SILVER",
  "RED",
  "GREEN_BLACK",
] as const;
export type BrushColorType = (typeof BrushColors)[number];

export const ChemPumpPos = ["ONBOARD", "WASH_BAY"] as const;
export type ChemPumpPosType = (typeof ChemPumpPos)[number];

export const WaterTypes = ["NETWORK", "RECYCLED", "DEMINERALIZED"] as const;
export type WaterType = (typeof WaterTypes)[number];

export const Water1Pumps = [
  "BOOST_15KW",
  "BOOST_22KW",
  "INV_3KW_200L",
  "INV_3KW_250L",
] as const;
export type Water1PumpType = (typeof Water1Pumps)[number];

export const Water2Pumps = ["BOOST_15KW", "BOOST_22KW"] as const;
export type Water2PumpType = (typeof Water2Pumps)[number];

export const SupplyTypes = ["STRAIGHT_SHELF", "BOOM", "ENERGY_CHAIN"] as const;
export type SupplyType = (typeof SupplyTypes)[number];

export const SupplySides = ["TBD", "LEFT", "RIGHT"] as const;
export type SupplySide = (typeof SupplySides)[number];

export const SupplyFixTypes = ["POST", "WALL"] as const;
export type SupplyFixType = (typeof SupplyFixTypes)[number];

export const EnergyChainWidths = ["L150", "L200", "L250", "L300"] as const;
export type EnergyChainWidthType = (typeof EnergyChainWidths)[number];

export const RailTypes = ["ANCHORED", "WELDED", "WELDED_RECESSED"] as const;
export type RailTypeType = (typeof RailTypes)[number];

export const AnchorTypes = ["ZINC", "CHEMICAL"] as const;
export type AnchorType = (typeof AnchorTypes)[number];

export const TouchPos = ["ON_PANEL", "ON_DET_CAB", "EXTERNAL"] as const;
export type TouchPosType = (typeof TouchPos)[number];

export const TouchFixTypes = ["POST", "WALL"] as const;
export type TouchFixType = (typeof TouchFixTypes)[number];

export const HpPump15kwOutlets = [
  "CHASSIS_WASH",
  "LOW_SPINNERS",
  "LOW_BARS",
  "HIGH_BARS",
] as const;
export type HpPump15kwOutletType = (typeof HpPump15kwOutlets)[number];

export const HpPump30kwOutlets = [
  "CHASSIS_WASH_HORIZONTAL",
  "CHASSIS_WASH_LATERAL_HORIZONTAL",
  "LOW_SPINNERS_HIGH_BARS",
  "LOW_MEDIUM_SPINNERS",
  "FULL_ARCH",
] as const;
export type HpPump30kwOutletType = (typeof HpPump30kwOutlets)[number];

export const HpPump75kwOutlets = ["CHASSIS_WASH", "LOW_BARS"] as const;
export type HpPump75kwOutletType = (typeof HpPump75kwOutlets)[number];

export const ChassisWashSensorTypes = [
  "SINGLE_POST",
  "DOUBLE_POST",
  "SINGLE_WALL",
  "DOUBLE_WALL",
] as const;
export type ChassisWashSensorType = (typeof ChassisWashSensorTypes)[number];

export const HpPumpOMZkwOutlets = [
  "HP_ROOF_BAR",
  "SPINNERS",
  "HP_ROOF_BAR_SPINNERS",
] as const;
export type HpPumpOMZkwOutletType = (typeof HpPumpOMZkwOutlets)[number];

export const WaterTankTypes = [
  "L2000",
  "L2000_JOLLY",
  "L2500",
  "L3000",
  "L4500",
  "L5000",
  "L7000",
  "L9000",
] as const;
export type WaterTankType = (typeof WaterTankTypes)[number];

export const PressureWashers = ["L21_150BAR", "L21_200BAR"] as const;
export type PressureWasherType = (typeof PressureWashers)[number];

export const ConfigurationStatus = [
  "DRAFT",
  "SUBMITTED",
  "IN_REVIEW",
  "APPROVED",
  "CLOSED",
] as const;
export type ConfigurationStatusType = (typeof ConfigurationStatus)[number];

export const Roles = ["ADMIN", "ENGINEER", "SALES"] as const;
export type Role = (typeof Roles)[number];

export const ActivityActions = [
  "CONFIG_CREATE",
  "CONFIG_EDIT",
  "CONFIG_DELETE",
  "CONFIG_STATUS_CHANGE",
  "ROLE_CHANGE",
  "PASSWORD_RESET",
  "BOM_GENERATE",
  "BOM_REGENERATE",
] as const;
export type ActivityAction = (typeof ActivityActions)[number];

export const ActivityActionLabels: Record<ActivityAction, string> = {
  CONFIG_CREATE: "Creazione configurazione",
  CONFIG_EDIT: "Modifica configurazione",
  CONFIG_DELETE: "Eliminazione configurazione",
  CONFIG_STATUS_CHANGE: "Cambio stato",
  ROLE_CHANGE: "Cambio ruolo",
  PASSWORD_RESET: "Reset password",
  BOM_GENERATE: "Generazione distinta",
  BOM_REGENERATE: "Rigenerazione distinta",
};

export const BomTags = [
  "FRAME",
  "BRUSHES",
  "RINSE_BARS",
  "PREWASH_BARS",
  "ACID_BARS",
  "DOSING_PUMPS",
  "FAST",
  "ELECTRICAL",
  "HP_PUMPS",
  "RAILS",
  "SUPPLY",
  "WATER_SUPPLY",
  "MISC",
] as const;
export type BomTag = (typeof BomTags)[number];

export const BomTagLabels: Record<BomTag, string> = {
  FRAME: "Struttura",
  BRUSHES: "Spazzole",
  RINSE_BARS: "Barre risciacquo",
  PREWASH_BARS: "Barre prelavaggio",
  ACID_BARS: "Barre acido",
  DOSING_PUMPS: "Pompe dosatrici",
  FAST: "Fast",
  ELECTRICAL: "Elettrica",
  HP_PUMPS: "Pompe HP",
  RAILS: "Rotaie",
  SUPPLY: "Alimentazione portale",
  WATER_SUPPLY: "Alimentazione acqua",
  MISC: "Varie",
};

export interface SelectOption {
  value: string | number;
  label: string;
}

export interface SelectOptionGroup {
  [key: string]: SelectOption[];
}
