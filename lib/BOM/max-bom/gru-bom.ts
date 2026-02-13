import { Configuration } from "@/db/schemas";
import { MaxBOMItem } from "@/lib/BOM/max-bom";

const PART_NUMBERS = {
  ZERO_BRUSHES: "450.0E.GRU0",
  TWO_BRUSHES: "450.0E.GRU2",
  THREE_BRUSHES: "450.0E.GRU",
} as const satisfies Record<string, string>;

export const gruBOM: MaxBOMItem<Configuration>[] = [
  {
    pn: PART_NUMBERS.ZERO_BRUSHES,
    conditions: [(config) => config.brush_qty === 0],
    qty: 1,
    _description: "GRU - Zero brushes",
  },
  {
    pn: PART_NUMBERS.TWO_BRUSHES,
    conditions: [(config) => config.brush_qty === 2],
    qty: 1,
    _description: "GRU - Two brushes",
  },
  {
    pn: PART_NUMBERS.THREE_BRUSHES,
    conditions: [(config) => config.brush_qty === 3],
    qty: 1,
    _description: "GRU - Three brushes",
  },
];
