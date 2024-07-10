import { brushBOM } from "@/lib/BOM/MaxBOM/brushBOM";
import { dosingPumpBom } from "@/lib/BOM/MaxBOM/dosingPumpBOM";
import { Configuration } from "@prisma/client";

export interface MaxBOMItem {
  pn: string;
  conditions: Array<(config: Configuration) => boolean>;
  qty: number | ((config: Configuration) => number);
  _description?: string;
}

export const MaxBOM: MaxBOMItem[] = [...brushBOM, ...dosingPumpBom];
