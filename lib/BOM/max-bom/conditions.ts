import type { GeneralBOMConfig } from "@/lib/BOM";

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
