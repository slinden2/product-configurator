import type { GeneralBOMConfig } from "@/lib/BOM";
import type { MaxBOMItem } from "@/lib/BOM/max-bom";
import { isOMZ, isSTD } from "./conditions";

const PART_NUMBERS = {
  ZERO_BRUSHES: "450.0E.GRU0",
  TWO_BRUSHES: "450.0E.GRU2",
  THREE_BRUSHES: "450.0E.GRU",
  SHORT_PHOTOCELL_SUPPORTS: "925.00.000",
  STANDARD_BANNER: "450.25.018", // TODO Add to Excel
  OMZ_BANNER: "450.25.026", // TODO Add to Excel
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
  {
    pn: PART_NUMBERS.STANDARD_BANNER,
    conditions: [isSTD],
    qty: 1,
    _description: "Standard banner",
  },
  {
    pn: PART_NUMBERS.OMZ_BANNER,
    conditions: [isOMZ],
    qty: 1,
    _description: "OMZ banner",
  },
];
