import { brushBOM } from "@/lib/BOM/MaxBOM/brushBOM";
import { dosingPumpBom } from "@/lib/BOM/MaxBOM/dosingPumpBOM";
import { electricBOM } from "@/lib/BOM/MaxBOM/electricBOM";
import { fastBOM } from "@/lib/BOM/MaxBOM/fastBOM";
import { hpPumpBOM } from "@/lib/BOM/MaxBOM/hpPumpBOM";
import { nozzleBarBOM } from "@/lib/BOM/MaxBOM/nozzleBarBOM";
import { railBOM } from "@/lib/BOM/MaxBOM/railBOM";
import { supplyBOM } from "@/lib/BOM/MaxBOM/supplyBOM";
import { waterSupplyBOM } from "@/lib/BOM/MaxBOM/waterSupplyBOM";
import { Configuration } from "@prisma/client";

export interface ValidationFn {
  (config: Configuration): boolean;
}

export interface MaxBOMItem {
  pn: string;
  conditions: Array<ValidationFn>;
  qty: number | ((config: Configuration) => number);
  _description?: string;
}

export const MaxBOM: MaxBOMItem[] = [
  ...brushBOM,
  ...dosingPumpBom,
  ...waterSupplyBOM,
  ...nozzleBarBOM,
  ...supplyBOM,
  ...railBOM,
  ...electricBOM,
  ...fastBOM,
  ...hpPumpBOM,
];
