import type { GeneralBOMConfig } from "@/lib/BOM";

/**
 * Placeholder for rules whose catalog part number is not yet known. These are
 * live rules — selecting the option emits a real BOM row carrying this
 * sentinel — so the single convention keeps them machine-detectable:
 * `warnMissingPns` (lib/BOM/index.ts) flags them explicitly and
 * `collectMaxBomPns` (lib/pricing.ts) excludes them from coefficient lookups.
 */
export const TODO_PN = (name: string): string => `TODO_PN:${name}`;

export const isTodoPn = (pn: string): boolean => pn.startsWith("TODO_PN:");

export const isOMZ = (config: GeneralBOMConfig): boolean =>
  config.machine_type === "OMZ";

export const isSTD = (config: GeneralBOMConfig): boolean =>
  config.machine_type === "STD";

export const usesOMZPump = (config: GeneralBOMConfig): boolean =>
  config.has_omz_pump;

export const usesHPRoofBar = (config: GeneralBOMConfig): boolean =>
  usesOMZPump(config) &&
  (config.pump_outlet_omz === "HP_ROOF_BAR" ||
    config.pump_outlet_omz === "HP_ROOF_BAR_SPINNERS");

export const usesEnergyChain = (config: GeneralBOMConfig): boolean => {
  return config.supply_type === "ENERGY_CHAIN";
};

export const uses15kwOr30kwPump = (config: GeneralBOMConfig): boolean =>
  config.has_15kw_pump || config.has_30kw_pump;

export const uses75kwPump = (config: GeneralBOMConfig): boolean =>
  config.has_75kw_pump;

export const usesAnyHpPump = (config: GeneralBOMConfig): boolean =>
  config.has_15kw_pump || config.has_30kw_pump || config.has_75kw_pump;
