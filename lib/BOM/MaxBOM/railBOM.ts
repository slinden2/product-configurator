import { MaxBOMItem } from "@/lib/BOM/MaxBOM";
import { $Enums, Configuration } from "@prisma/client";

const PART_NUMBERS: Record<string, string> = {
  DOWELED_RAIL_TERMINALS: "450.45.031",
  DOWELED_RAILS_1M: "450.45.030",
  DOWELED_RAILS_3M: "450.45.035",
  WELDED_RAIL_TERMINALS: "450.46.032",
  WELDED_RAILS_1M: "450.46.030",
  WELDED_RAILS_3M: "450.46.031",
};

const calculate3mRailQty = (config: Configuration): number =>
  Math.floor((config.rail_length - 6) / 3);

const calculate1mRailQty = (config: Configuration): number =>
  (config.rail_length - 6) % 3;

export const railBOM: MaxBOMItem[] = [
  {
    pn: PART_NUMBERS.DOWELED_RAIL_TERMINALS,
    conditions: [(config) => config.rail_type === $Enums.RailType.DOWELED],
    qty: 1,
    _description: "Dowelled rail terminals",
  },
  {
    pn: PART_NUMBERS.DOWELED_RAILS_3M,
    conditions: [
      (config) => config.rail_type === $Enums.RailType.DOWELED,
      (config) => config.rail_length > 7,
    ],
    qty: calculate3mRailQty,
    _description: "Dowelled rail 3m",
  },
  {
    pn: PART_NUMBERS.DOWELED_RAILS_1M,
    conditions: [
      (config) => config.rail_type === $Enums.RailType.DOWELED,
      (config) => !!(config.rail_length % 3),
    ],
    qty: calculate1mRailQty,
    _description: "Dowelled rail 3m",
  },
  {
    pn: PART_NUMBERS.WELDED_RAIL_TERMINALS,
    conditions: [(config) => config.rail_type === $Enums.RailType.WELDED],
    qty: 1,
    _description: "Welded rail terminals",
  },
  {
    pn: PART_NUMBERS.WELDED_RAILS_3M,
    conditions: [
      (config) => config.rail_type === $Enums.RailType.WELDED,
      (config) => config.rail_length > 7,
    ],
    qty: calculate3mRailQty,
    _description: "Welded rail 3m",
  },
  {
    pn: PART_NUMBERS.WELDED_RAILS_1M,
    conditions: [(config) => config.rail_type === $Enums.RailType.WELDED],
    qty: calculate1mRailQty,
    _description: "Welded rail 3m",
  },
];
