import { GeneralBOMConfig } from "@/lib/BOM";
import { MaxBOMItem } from "@/lib/BOM/max-bom";

const PART_NUMBERS = {
  DOWELED_RAIL_TERMINALS: "450.45.031",
  DOWELED_RAILS_1M: "450.45.030",
  DOWELED_RAILS_3M: "450.45.035",
  WELDED_RECESSED_RAIL_TERMINALS: "450.46.032",
  WELDED_RECESSED_RAILS_1M: "450.46.030",
  WELDED_RECESSED_RAILS_3M: "450.46.031",
  WELDED_RAIL_TERMINALS: "450.49.031",
  WELDED_RAILS_1M: "450.49.030",
  WELDED_RAILS_3M: "450.49.035",
  SHIM_KIT_FOR_RECESSED_RAILS: "450.35.011",
  PROXIMITY_PLATES: "450.35.010",
  ZINC_DOWEL: "XXX", // TODO Add part number
  STAINLESS_DOWEL: "XXX", // TODO Add part number
  RESIN_DOWEL: "XXX", // TODO Add part number
  RESIN: "XXX", // TODO Add part number
} as const satisfies Record<string, string>;

export const calculate3mRailQty = (config: GeneralBOMConfig): number =>
  Math.floor((config.rail_length - 6) / 3);

export const calculate1mRailQty = (config: GeneralBOMConfig): number =>
  (config.rail_length - 6) % 3;

export const calculateDowelQty = (config: GeneralBOMConfig): number =>
  44 + calculate1mRailQty(config) * 6 + calculate3mRailQty(config) * 10;

export const railBOM: MaxBOMItem<GeneralBOMConfig>[] = [
  {
    pn: PART_NUMBERS.DOWELED_RAIL_TERMINALS,
    conditions: [(config) => config.rail_type === "DOWELED"],
    qty: 1,
    _description: "Dowelled rail terminals",
  },
  {
    pn: PART_NUMBERS.DOWELED_RAILS_3M,
    conditions: [
      (config) => config.rail_type === "DOWELED",
      (config) => config.rail_length > 7,
    ],
    qty: calculate3mRailQty,
    _description: "Dowelled rail 3m",
  },
  {
    pn: PART_NUMBERS.DOWELED_RAILS_1M,
    conditions: [
      (config) => config.rail_type === "DOWELED",
      (config) => !!(config.rail_length % 3),
    ],
    qty: calculate1mRailQty,
    _description: "Dowelled rail 1m",
  },
  {
    pn: PART_NUMBERS.WELDED_RECESSED_RAIL_TERMINALS,
    conditions: [(config) => config.rail_type === "WELDED_RECESSED"],
    qty: 1,
    _description: "Welded recessed rail terminals",
  },
  {
    pn: PART_NUMBERS.WELDED_RECESSED_RAILS_3M,
    conditions: [
      (config) => config.rail_type === "WELDED_RECESSED",
      (config) => config.rail_length > 7,
    ],
    qty: calculate3mRailQty,
    _description: "Welded recessed rail 3m",
  },
  {
    pn: PART_NUMBERS.WELDED_RECESSED_RAILS_1M,
    conditions: [
      (config) => config.rail_type === "WELDED_RECESSED",
      (config) => !!(config.rail_length % 3),
    ],
    qty: calculate1mRailQty,
    _description: "Welded recessed rail 1m",
  },
  {
    pn: PART_NUMBERS.WELDED_RAIL_TERMINALS,
    conditions: [(config) => config.rail_type === "WELDED"],
    qty: 1,
    _description: "Welded rail terminals",
  },
  {
    pn: PART_NUMBERS.WELDED_RAILS_3M,
    conditions: [
      (config) => config.rail_type === "WELDED",
      (config) => config.rail_length > 7,
    ],
    qty: calculate3mRailQty,
    _description: "Welded rail 3m",
  },
  {
    pn: PART_NUMBERS.WELDED_RAILS_1M,
    conditions: [
      (config) => config.rail_type === "WELDED",
      (config) => !!(config.rail_length % 3),
    ],
    qty: calculate1mRailQty,
    _description: "Welded rail 1m",
  },
  {
    pn: PART_NUMBERS.PROXIMITY_PLATES,
    conditions: [() => true], // These are always in BOM.
    qty: 1,
    _description: "Proximity plates",
  },
  {
    pn: PART_NUMBERS.SHIM_KIT_FOR_RECESSED_RAILS,
    conditions: [(config) => config.rail_type === "WELDED_RECESSED"],
    qty: 1,
    _description: "Shim kit for recessed rails",
  },
  {
    pn: PART_NUMBERS.ZINC_DOWEL,
    conditions: [
      (config) => config.rail_type === "DOWELED",
      (config) => config.dowel_type === "ZINCATO",
    ],
    qty: calculateDowelQty,
    _description: "Zinc dowels",
  },
  {
    pn: PART_NUMBERS.STAINLESS_DOWEL,
    conditions: [
      (config) => config.rail_type === "DOWELED",
      (config) => config.dowel_type === "INOX",
    ],
    qty: calculateDowelQty,
    _description: "Stainless steel dowels",
  },
  {
    pn: PART_NUMBERS.RESIN_DOWEL,
    conditions: [
      (config) => config.rail_type === "DOWELED",
      (config) => config.dowel_type === "CHIMICO",
    ],
    qty: calculateDowelQty,
    _description: "Resin dowels",
  },
  {
    // TODO: Adjust resin quantity rules
    pn: PART_NUMBERS.RESIN,
    conditions: [
      (config) => config.rail_type === "DOWELED",
      (config) => config.dowel_type === "CHIMICO",
    ],
    qty: 1,
    _description: "Resin for chemical dowels",
  },
];
