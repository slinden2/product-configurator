import { WithSupplyData } from "@/lib/BOM/BOM";
import { brushBOM } from "@/lib/BOM/MaxBOM/brushBOM";
import { dosingPumpBOM } from "@/lib/BOM/MaxBOM/dosingPumpBOM";
import { electricBOM } from "@/lib/BOM/MaxBOM/electricBOM";
import { fastBOM } from "@/lib/BOM/MaxBOM/fastBOM";
import { hpPumpBOM } from "@/lib/BOM/MaxBOM/hpPumpBOM";
import { nozzleBarBOM } from "@/lib/BOM/MaxBOM/nozzleBarBOM";
import { railBOM } from "@/lib/BOM/MaxBOM/railBOM";
import { supplyBOM } from "@/lib/BOM/MaxBOM/supplyBOM";
import { washBayBOM } from "@/lib/BOM/MaxBOM/washBayBOM";
import { waterSupplyBOM } from "@/lib/BOM/MaxBOM/waterSupplyBOM";
import { waterTankBOM } from "@/lib/BOM/MaxBOM/waterTankBOM";
import { Configuration, WashBay, WaterTank } from "@prisma/client";

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
