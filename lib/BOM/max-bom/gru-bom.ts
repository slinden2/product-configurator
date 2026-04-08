import type { GeneralBOMConfig } from "@/lib/BOM";
import type { MaxBOMItem } from "@/lib/BOM/max-bom";

const PART_NUMBERS = {
  ZERO_BRUSHES: "450.0E.GRU0",
  TWO_BRUSHES: "450.0E.GRU2",
  THREE_BRUSHES: "450.0E.GRU",
  SHORT_PHOTOCELL_SUPPORTS: "925.00.000",
} as const satisfies Record<string, string>;

export const gruBOM: MaxBOMItem<GeneralBOMConfig>[] = [
  {
    pn: PART_NUMBERS.ZERO_BRUSHES,
    conditions: [(config) => config.brush_qty === 0],
    qty: 1,
    _description: "GRU - zero brushes",
  },
  {
    pn: PART_NUMBERS.TWO_BRUSHES,
    conditions: [(config) => config.brush_qty === 2],
    qty: 1,
    _description: "GRU - two brushes",
  },
  {
    pn: PART_NUMBERS.THREE_BRUSHES,
    conditions: [(config) => config.brush_qty === 3],
    qty: 1,
    _description: "GRU - three brushes",
  },
  {
    pn: PART_NUMBERS.SHORT_PHOTOCELL_SUPPORTS,
    conditions: [(config) => !config.is_fast],
    qty: 1,
    _description: "Short photocell supports",
  },
];
