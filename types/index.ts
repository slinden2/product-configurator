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
  "IN_SALES_REVIEW",
  "SALES_APPROVED",
  "IN_TECH_REVIEW",
  "TECH_APPROVED",
  "CLOSED",
] as const;
export type ConfigurationStatusType = (typeof ConfigurationStatus)[number];

/**
 * Discriminates how a configuration came into being and which lifecycle governs it:
 *
 * - STANDALONE — a pure technical configuration created directly by Engineer/Admin for
 *   internal evaluation. It runs only the engineering sub-chain
 *   `DRAFT → IN_TECH_REVIEW → TECH_APPROVED → CLOSED` and never touches the two sales
 *   statuses (`IN_SALES_REVIEW`, `SALES_APPROVED`).
 * - OFFER — a configuration owned by a specific offer revision (via offer_revision_lines).
 *   Before `SALES_APPROVED` its editability is governed by the parent offer revision (editable
 *   only while the revision is `DRAFT`); at `SALES_APPROVED`+ it is governed by
 *   `ConfigurationStatus` (the engineering rules), exactly like a standalone config. The offer's
 *   own lifecycle (see `OfferStatus`) lives on the revision, not on the configuration.
 */
export const ConfigOrigins = ["STANDALONE", "OFFER"] as const;
export type ConfigOrigin = (typeof ConfigOrigins)[number];

export const ConfigOriginLabels: Record<ConfigOrigin, string> = {
  STANDALONE: "Autonoma",
  OFFER: "Offerta",
};

export const Roles = [
  "ADMIN",
  "ENGINEER",
  "SALES",
  "SALES_MANAGER",
  "SALES_DIRECTOR",
] as const;
export type Role = (typeof Roles)[number];

export const ActivityActions = [
  "CONFIG_CREATE",
  "CONFIG_EDIT",
  "CONFIG_DELETE",
  "CONFIG_DUPLICATE",
  "CONFIG_STATUS_CHANGE",
  "ROLE_CHANGE",
  "MANAGER_ASSIGN",
  "PASSWORD_RESET",
  "BOM_GENERATE",
  "BOM_REGENERATE",
  "BOM_ITEM_ADD",
  "BOM_ITEM_QTY_UPDATE",
  "BOM_ITEM_TOGGLE_DELETE",
  "COEFFICIENT_CREATE",
  "COEFFICIENT_UPDATE",
  "COEFFICIENT_DELETE",
  "COEFFICIENT_RESET",
  "COEFFICIENT_SYNC",
  "OFFER_GENERATE",
  "OFFER_REGENERATE",
  "OFFER_FREEZE",
  "OFFER_THAW",
  "OFFER_DISCOUNT_SET",
  "OFFER_SETTINGS_SET",
  "SURCHARGE_UPDATE",
  "INSTALLATION_ITEM_UPDATE",
] as const;
export type ActivityAction = (typeof ActivityActions)[number];

export const ActivityActionLabels: Record<ActivityAction, string> = {
  CONFIG_CREATE: "Creazione configurazione",
  CONFIG_EDIT: "Modifica configurazione",
  CONFIG_DELETE: "Eliminazione configurazione",
  CONFIG_DUPLICATE: "Duplicazione configurazione",
  CONFIG_STATUS_CHANGE: "Cambio stato",
  ROLE_CHANGE: "Cambio ruolo",
  MANAGER_ASSIGN: "Assegnazione responsabile",
  PASSWORD_RESET: "Reset password",
  BOM_GENERATE: "Generazione distinta",
  BOM_REGENERATE: "Rigenerazione distinta",
  BOM_ITEM_ADD: "Aggiunta riga distinta",
  BOM_ITEM_QTY_UPDATE: "Modifica quantità riga distinta",
  BOM_ITEM_TOGGLE_DELETE: "Eliminazione/ripristino riga distinta",
  COEFFICIENT_CREATE: "Creazione coefficiente",
  COEFFICIENT_UPDATE: "Modifica coefficiente",
  COEFFICIENT_DELETE: "Eliminazione coefficiente",
  COEFFICIENT_RESET: "Ripristino coefficiente",
  COEFFICIENT_SYNC: "Sincronizzazione coefficienti MaxBOM",
  OFFER_GENERATE: "Generazione offerta",
  OFFER_REGENERATE: "Rigenerazione offerta",
  OFFER_FREEZE: "Congelamento offerta",
  OFFER_THAW: "Scongelamento offerta",
  OFFER_DISCOUNT_SET: "Impostazione sconto offerta",
  OFFER_SETTINGS_SET: "Impostazione opzioni offerta",
  SURCHARGE_UPDATE: "Modifica maggiorazione",
  INSTALLATION_ITEM_UPDATE: "Modifica costo installazione",
};

export const CoefficientSources = ["MAXBOM", "MANUAL"] as const;
export type CoefficientSource = (typeof CoefficientSources)[number];

export const OfferSources = ["EBOM", "LIVE"] as const;
export type OfferSource = (typeof OfferSources)[number];

/**
 * Per-revision offer lifecycle. The status is carried by `offer_revisions`, not by the offer
 * header — each revision is approved and sent independently, so revision 1 can be SENT/REJECTED
 * while revision 2 is still DRAFT.
 *
 * `DRAFT → PENDING_APPROVAL → APPROVED_TO_SEND → SENT → ACCEPTED / REJECTED / EXPIRED`
 *
 * Manager approval is required on every revision before send (scoped to direct reports). On
 * ACCEPTED, each line configuration fans out into the existing per-config approval flow
 * (`SALES_APPROVED` + the as-sold freeze), then engineering proceeds unchanged.
 */
export const OfferStatus = [
  "DRAFT",
  "PENDING_APPROVAL",
  "APPROVED_TO_SEND",
  "SENT",
  "ACCEPTED",
  "REJECTED",
  "EXPIRED",
] as const;
export type OfferStatusType = (typeof OfferStatus)[number];

export const OfferStatusLabels: Record<OfferStatusType, string> = {
  DRAFT: "Bozza",
  PENDING_APPROVAL: "In approvazione",
  APPROVED_TO_SEND: "Approvata per invio",
  SENT: "Inviata",
  ACCEPTED: "Accettata",
  REJECTED: "Rifiutata",
  EXPIRED: "Scaduta",
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

export const STANDARD_MACHINE_HEIGHT_MM = 5506;
export const WASH_HEIGHT_OFFSET_MM = 1294;

export const SurchargeKinds = ["HEIGHT", "PAINT"] as const;
export type SurchargeKind = (typeof SurchargeKinds)[number];

export const SurchargeKindLabels: Record<SurchargeKind, string> = {
  HEIGHT: "Altezza non standard",
  PAINT: "Verniciatura personalizzata",
};

export const TransportModes = ["INCLUDED", "SEPARATE", "TBD"] as const;
export type TransportMode = (typeof TransportModes)[number];

export const TransportModeLabels: Record<TransportMode, string> = {
  INCLUDED: "Compreso",
  SEPARATE: "A parte",
  TBD: "Da definire",
};

// Installation shares the transport mode values; INCLUDED uses the feminine form.
export const InstallationModeLabels: Record<TransportMode, string> = {
  INCLUDED: "Compresa",
  SEPARATE: "A parte",
  TBD: "Da definire",
};

export const InstallationItemKinds = ["BASE_SYSTEM", "HP_ROOF_BAR"] as const;
export type InstallationItemKind = (typeof InstallationItemKinds)[number];

export const InstallationItemKindLabels: Record<InstallationItemKind, string> =
  {
    BASE_SYSTEM: "Impianto di base",
    HP_ROOF_BAR: "Barra oscillante",
  };

export interface SelectOption {
  value: string | number;
  label: string;
}

export interface SelectOptionGroup {
  [key: string]: SelectOption[];
}
