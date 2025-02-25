export const BrushTypes = ["THREAD", "MIXED", "CARLITE"] as const;
export type BrushType = (typeof BrushTypes)[number];

export const BrushColors = [
  "BLUE_SILVER",
  "GREEN_SILVER",
  "RED",
  "GREEN_BLACK",
] as const;
export type BrushColorType = (typeof BrushColors)[number];

export const ChemPumpPos = ["ABOARD", "WASH_BAY"] as const;
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

export const SupplyTypes = ["STRAIGHT_SHELF", "BOOM", "CABLE_CHAIN"] as const;
export type SupplyType = (typeof SupplyTypes)[number];

export const SupplySides = ["TBD", "LEFT", "RIGHT"] as const;
export type SupplySide = (typeof SupplySides)[number];

export const SupplyFixTypes = ["POST", "WALL"] as const;
export type SupplyFixType = (typeof SupplyFixTypes)[number];

export const EnergyChainWidths = ["L150", "L200", "L250", "L300"] as const;
export type EnergyChainWidthType = (typeof EnergyChainWidths)[number];

export const RailTypes = ["DOWELED", "WELDED"] as const;
export type RailTypeType = (typeof RailTypes)[number];

export const TouchPos = ["INTERNAL", "EXTERNAL"] as const;
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
  "HIGH_MEDIUM_SPINNERS",
] as const;
export type HpPump30kwOutletType = (typeof HpPump30kwOutlets)[number];

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
  "L4500",
] as const;
export type WaterTankType = (typeof WaterTankTypes)[number];

export const PressureWashers = ["L21_150BAR", "L21_200BAR"] as const;
export type PressureWasherType = (typeof PressureWashers)[number];

export const ConfigurationStatus = [
  "DRAFT",
  "OPEN",
  "LOCKED",
  "CLOSED",
] as const;
export type ConfigurationStatusType = (typeof ConfigurationStatus)[number];

export const Roles = ["ADMIN", "INTERNAL", "EXTERNAL"] as const;
export type Role = (typeof Roles)[number];

export interface SelectOption {
  value: string | number;
  label: string;
}

export interface SelectOptionGroup {
  [key: string]: SelectOption[];
}
