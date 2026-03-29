import { WashBay, WaterTank } from "@/db/schemas";
import { GeneralBOMConfig, WithSupplyData } from "@/lib/BOM";
import { BomTag } from "@/types";
import { brushBOM } from "@/lib/BOM/max-bom/brush-bom";
import { dosingPumpBOM } from "@/lib/BOM/max-bom/dosing-pump-bom";
import { electricBOM } from "@/lib/BOM/max-bom/electric-bom";
import { fastBOM } from "@/lib/BOM/max-bom/fast-bom";
import { gruBOM } from "@/lib/BOM/max-bom/gru-bom";
import { hpPumpBOM } from "@/lib/BOM/max-bom/hp-pump-bom";
import { nozzleBarBOM } from "@/lib/BOM/max-bom/nozzle-bar-bom";
import { railBOM } from "@/lib/BOM/max-bom/rail-bom";
import { supplyBOM } from "@/lib/BOM/max-bom/supply-bom";
import { washBayBOM } from "@/lib/BOM/max-bom/wash-bay-bom";
import { waterSupplyBOM } from "@/lib/BOM/max-bom/water-supply-bom";
import { waterTankBOM } from "@/lib/BOM/max-bom/water-tank-bom";

/**
 * Bump this version every time any BOM rule file under `lib/BOM/max-bom/` is modified.
 * It is stored on engineering BOM snapshots so engineers can tell which rule set produced the BOM.
 */
export const BOM_RULES_VERSION = "260330";

export interface ValidationFn<T> {
  (config: T): boolean;
}

export interface MaxBOMItem<T> {
  pn: string;
  conditions: Array<ValidationFn<T>>;
  qty: number | ((config: T) => number);
  _description: string;
  tag?: BomTag;
}

export const GeneralMaxBOM: MaxBOMItem<GeneralBOMConfig>[] = [
  ...gruBOM.map((item) => ({ ...item, tag: "FRAME" as const })),
  ...brushBOM.map((item) => ({ ...item, tag: "BRUSHES" as const })),
  ...dosingPumpBOM.map((item) => ({ ...item, tag: "DOSING_PUMPS" as const })),
  ...waterSupplyBOM.map((item) => ({ ...item, tag: "WATER_SUPPLY" as const })),
  ...nozzleBarBOM,
  ...supplyBOM.map((item) => ({ ...item, tag: "SUPPLY" as const })),
  ...railBOM.map((item) => ({ ...item, tag: "RAILS" as const })),
  ...electricBOM.map((item) => ({ ...item, tag: "ELECTRICAL" as const })),
  ...fastBOM.map((item) => ({ ...item, tag: "FAST" as const })),
  ...hpPumpBOM.map((item) => ({ ...item, tag: "HP_PUMPS" as const })),
];

export const WaterTankMaxBOM: MaxBOMItem<WaterTank>[] = [...waterTankBOM];

export const WashBayMaxBOM: MaxBOMItem<WashBay & WithSupplyData>[] = [
  ...washBayBOM,
];
