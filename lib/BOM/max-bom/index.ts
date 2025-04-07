import { Configuration, WashBay, WaterTank } from "@/db/schemas";
import { WithSupplyData } from "@/lib/BOM";
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

export interface ValidationFn<T> {
  (config: T): boolean;
}

export interface MaxBOMItem<T> {
  pn: string;
  conditions: Array<ValidationFn<T>>;
  qty: number | ((config: T) => number);
  _description: string;
}

export const GeneralMaxBOM: MaxBOMItem<Configuration>[] = [
  ...gruBOM,
  ...brushBOM,
  ...dosingPumpBOM,
  ...waterSupplyBOM,
  ...nozzleBarBOM,
  ...supplyBOM,
  ...railBOM,
  ...electricBOM,
  ...fastBOM,
  ...hpPumpBOM,
];

export const WaterTankMaxBOM: MaxBOMItem<WaterTank>[] = [...waterTankBOM];

export const WashBayMaxBOM: MaxBOMItem<WashBay & WithSupplyData>[] = [
  ...washBayBOM,
];
