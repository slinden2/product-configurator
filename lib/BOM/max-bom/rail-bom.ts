import { GeneralBOMConfig } from "@/lib/BOM";
import { MaxBOMItem } from "@/lib/BOM/max-bom";
import { isOMZ, isSTD } from "@/lib/BOM/max-bom/conditions";

const PART_NUMBERS = {
  ANCHORED_RAIL_TERMINALS: "450.45.031",
  ANCHORED_RAILS_1M: "450.45.030",
  ANCHORED_RAILS_3M: "450.45.035",
  WELDED_RECESSED_RAIL_TERMINALS: "450.46.032",
  WELDED_RECESSED_RAILS_1M: "450.46.030",
  WELDED_RECESSED_RAILS_3M: "450.46.031",
  SHIM_KIT_FOR_RECESSED_RAILS: "450.35.011",
  WELDED_RAIL_TERMINALS: "450.49.031",
  WELDED_RAILS_1M: "450.49.030",
  WELDED_RAILS_3M: "450.49.035",
  RAIL_GUIDES: "1100.035.000",
  PROXIMITY_PLATES: "450.35.010",
  ZINC_ANCHOR: "934.04.010",
  STAINLESS_ANCHOR: "934.04.015",
  RESIN_ANCHOR: "934.10.003",
  RESIN: "934.10.002",
  COUNTERSUNK_ANCHOR: "934.05.004",
  COUNTERSUNK_ANCHOR_INOX: "934.05.005",
  ZINC_ANCHORS_RAIL_GUIDES: "934.04.012",
  STAINLESS_ANCHORS_RAIL_GUIDES: "934.04.014",
} as const satisfies Record<string, string>;

const ANCHORS_FOR_TERMINAL_RAILS = 44 as const;
const ANCHORS_PER_1M_RAIL = 12 as const;
const ANCHORS_PER_3M_RAIL = 20 as const;
const ANCHORS_FOR_STORM_BRACKET = 2 as const;
const RESIN_CARTRIDGE_SIZE = 500 as const; // ml
const RESIN_PER_ANCHOR = 9 as const;

export const calculate3mRailQty = (config: GeneralBOMConfig): number =>
  Math.floor((config.rail_length - 6) / 3);

export const calculate1mRailQty = (config: GeneralBOMConfig): number =>
  (config.rail_length - 6) % 3;

export const calculateAnchorQty = (config: GeneralBOMConfig): number =>
  ANCHORS_FOR_STORM_BRACKET +
  ANCHORS_FOR_TERMINAL_RAILS +
  calculate1mRailQty(config) * ANCHORS_PER_1M_RAIL +
  calculate3mRailQty(config) * ANCHORS_PER_3M_RAIL;

export const calculateResinQty = (config: GeneralBOMConfig): number =>
  Math.ceil(
    (calculateAnchorQty(config) * RESIN_PER_ANCHOR) / RESIN_CARTRIDGE_SIZE,
  );

export const railBOM: MaxBOMItem<GeneralBOMConfig>[] = [
  {
    pn: PART_NUMBERS.ANCHORED_RAIL_TERMINALS,
    conditions: [(config) => config.rail_type === "ANCHORED"],
    qty: 1,
    _description: "Anchored rail terminals",
  },
  {
    pn: PART_NUMBERS.ANCHORED_RAILS_3M,
    conditions: [
      (config) => config.rail_type === "ANCHORED",
      (config) => config.rail_length > 7,
    ],
    qty: calculate3mRailQty,
    _description: "Anchored rail 3m",
  },
  {
    pn: PART_NUMBERS.ANCHORED_RAILS_1M,
    conditions: [
      (config) => config.rail_type === "ANCHORED",
      (config) => !!(config.rail_length % 3),
    ],
    qty: calculate1mRailQty,
    _description: "Anchored rail 1m",
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
    pn: PART_NUMBERS.COUNTERSUNK_ANCHOR,
    conditions: [isSTD],
    qty: 4,
    _description: "Countersunk anchors for proximity plates",
  },
  {
    pn: PART_NUMBERS.COUNTERSUNK_ANCHOR_INOX,
    conditions: [isOMZ],
    qty: 4,
    _description: "Stainless steel countersunk anchors for proximity plates",
  },
  {
    pn: PART_NUMBERS.RAIL_GUIDES,
    conditions: [(config) => config.rail_guide_qty > 0],
    qty: (config) => config.rail_guide_qty,
    _description: "Rail guides",
  },
  {
    pn: PART_NUMBERS.ZINC_ANCHORS_RAIL_GUIDES,
    conditions: [(config) => config.rail_guide_qty > 0, isSTD],
    qty: (config) => config.rail_guide_qty * 8,
    _description: "Zinc anchors for rail guides",
  },
  {
    pn: PART_NUMBERS.STAINLESS_ANCHORS_RAIL_GUIDES,
    conditions: [(config) => config.rail_guide_qty > 0, isOMZ],
    qty: (config) => config.rail_guide_qty * 8,
    _description: "Stainless anchors for rail guides",
  },
  {
    pn: PART_NUMBERS.SHIM_KIT_FOR_RECESSED_RAILS,
    conditions: [(config) => config.rail_type === "WELDED_RECESSED"],
    qty: 1,
    _description: "Shim kit for recessed rails",
  },
  // Rail anchors: ZINC type — zinc for STD, stainless for OMZ (automatic upgrade)
  {
    pn: PART_NUMBERS.ZINC_ANCHOR,
    conditions: [
      (config) => config.rail_type === "ANCHORED",
      (config) => config.anchor_type === "ZINC",
      isSTD,
    ],
    qty: calculateAnchorQty,
    _description: "Zinc anchors for rails",
  },
  {
    pn: PART_NUMBERS.STAINLESS_ANCHOR,
    conditions: [
      (config) => config.rail_type === "ANCHORED",
      (config) => config.anchor_type === "ZINC",
      isOMZ,
    ],
    qty: calculateAnchorQty,
    _description: "Stainless steel anchors for rails (OMZ automatic upgrade)",
  },
  // Rail anchors: CHEMICAL type — resin anchors regardless of machine type
  {
    pn: PART_NUMBERS.RESIN_ANCHOR,
    conditions: [
      (config) => config.rail_type === "ANCHORED",
      (config) => config.anchor_type === "CHEMICAL",
    ],
    qty: calculateAnchorQty,
    _description: "Chemical resin anchors for rails",
  },
  {
    pn: PART_NUMBERS.RESIN,
    conditions: [
      (config) => config.rail_type === "ANCHORED",
      (config) => config.anchor_type === "CHEMICAL",
    ],
    qty: calculateResinQty,
    _description: "Resin for chemical anchors",
  },
];
