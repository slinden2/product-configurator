import { GeneralBOMConfig } from "@/lib/BOM";
import { MaxBOMItem } from "@/lib/BOM/max-bom";
import { BrushColorType, BrushType } from "@/types";

// TODO Add part numbers where missing
const PART_NUMBERS: Record<
  BrushColorType,
  Record<BrushType, Record<"VERTICAL" | "HORIZONTAL", string>>
> = {
  BLUE_SILVER: {
    THREAD: {
      VERTICAL: "450.16.003",
      HORIZONTAL: "450.17.001",
    },
    MIXED: {
      VERTICAL: "NO_PN",
      HORIZONTAL: "NO_PN",
    },
    CARLITE: {
      VERTICAL: "450.16.004",
      HORIZONTAL: "450.17.004",
    },
  },
  GREEN_BLACK: {
    THREAD: {
      VERTICAL: "450.16.007",
      HORIZONTAL: "450.17.006",
    },
    MIXED: {
      VERTICAL: "NO_PN",
      HORIZONTAL: "NO_PN",
    },
    CARLITE: {
      VERTICAL: "NO_PN",
      HORIZONTAL: "NO_PN",
    },
  },
  GREEN_SILVER: {
    THREAD: {
      VERTICAL: "NO_PN",
      HORIZONTAL: "NO_PN",
    },
    MIXED: {
      VERTICAL: "NO_PN",
      HORIZONTAL: "NO_PN",
    },
    CARLITE: {
      VERTICAL: "NO_PN",
      HORIZONTAL: "NO_PN",
    },
  },
  RED: {
    THREAD: {
      VERTICAL: "450.16.005",
      HORIZONTAL: "450.17.005",
    },
    MIXED: {
      VERTICAL: "NO_PN",
      HORIZONTAL: "NO_PN",
    },
    CARLITE: {
      VERTICAL: "NO_PN",
      HORIZONTAL: "NO_PN",
    },
  },
};

const blueSilver: MaxBOMItem<GeneralBOMConfig>[] = [
  // Thread
  {
    pn: PART_NUMBERS.BLUE_SILVER.THREAD.VERTICAL,
    conditions: [
      (config) => config.brush_qty > 0,
      (config) => config.brush_type === "THREAD",
      (config) => config.brush_color === "BLUE_SILVER",
    ],
    qty: 2,
    _description: "Vertical brush, thread, blue-silver",
  },
  {
    pn: PART_NUMBERS.BLUE_SILVER.THREAD.HORIZONTAL,
    conditions: [
      (config) => config.brush_qty === 3,
      (config) => config.brush_type === "THREAD",
      (config) => config.brush_color === "BLUE_SILVER",
    ],
    qty: 1,
    _description: "Horizontal brush, thread, blue-silver",
  },
  //Mixed
  {
    pn: PART_NUMBERS.BLUE_SILVER.MIXED.VERTICAL,
    conditions: [
      (config) => config.brush_qty > 0,
      (config) => config.brush_type === "MIXED",
      (config) => config.brush_color === "BLUE_SILVER",
    ],
    qty: 2,
    _description: "Vertical brush, mixed, blue-silver",
  },
  {
    pn: PART_NUMBERS.BLUE_SILVER.MIXED.HORIZONTAL,
    conditions: [
      (config) => config.brush_qty === 3,
      (config) => config.brush_type === "MIXED",
      (config) => config.brush_color === "BLUE_SILVER",
    ],
    qty: 1,
    _description: "Horizontal brush, mixed, blue-silver",
  },
  // Carlite
  {
    pn: PART_NUMBERS.BLUE_SILVER.CARLITE.VERTICAL,
    conditions: [
      (config) => config.brush_qty > 0,
      (config) => config.brush_type === "CARLITE",
      (config) => config.brush_color === "BLUE_SILVER",
    ],
    qty: 2,
    _description: "Vertical brush, Carlite, blue-silver",
  },
  {
    pn: PART_NUMBERS.BLUE_SILVER.CARLITE.HORIZONTAL,
    conditions: [
      (config) => config.brush_qty === 3,
      (config) => config.brush_type === "CARLITE",
      (config) => config.brush_color === "BLUE_SILVER",
    ],
    qty: 1,
    _description: "Horizontal brush, Carlite, blue-silver",
  },
];

const greenBlack: MaxBOMItem<GeneralBOMConfig>[] = [
  // Thread
  {
    pn: PART_NUMBERS.GREEN_BLACK.THREAD.VERTICAL,
    conditions: [
      (config) => config.brush_qty > 0,
      (config) => config.brush_type === "THREAD",
      (config) => config.brush_color === "GREEN_BLACK",
    ],
    qty: 2,
    _description: "Vertical brush, thread, green-black",
  },
  {
    pn: PART_NUMBERS.GREEN_BLACK.THREAD.HORIZONTAL,
    conditions: [
      (config) => config.brush_qty === 3,
      (config) => config.brush_type === "THREAD",
      (config) => config.brush_color === "GREEN_BLACK",
    ],
    qty: 1,
    _description: "Horizontal brush, thread, green-black",
  },
  //Mixed
  {
    pn: PART_NUMBERS.GREEN_BLACK.MIXED.VERTICAL,
    conditions: [
      (config) => config.brush_qty > 0,
      (config) => config.brush_type === "MIXED",
      (config) => config.brush_color === "GREEN_BLACK",
    ],
    qty: 2,
    _description: "Vertical brush, mixed, green-black",
  },
  {
    pn: PART_NUMBERS.GREEN_BLACK.MIXED.HORIZONTAL,
    conditions: [
      (config) => config.brush_qty === 3,
      (config) => config.brush_type === "MIXED",
      (config) => config.brush_color === "GREEN_BLACK",
    ],
    qty: 1,
    _description: "Horizontal brush, mixed, green-black",
  },
  // Carlite
  {
    pn: PART_NUMBERS.GREEN_BLACK.CARLITE.VERTICAL,
    conditions: [
      (config) => config.brush_qty > 0,
      (config) => config.brush_type === "CARLITE",
      (config) => config.brush_color === "GREEN_BLACK",
    ],
    qty: 2,
    _description: "Vertical brush, Carlite, green-black",
  },

  {
    pn: PART_NUMBERS.GREEN_BLACK.CARLITE.HORIZONTAL,
    conditions: [
      (config) => config.brush_qty === 3,
      (config) => config.brush_type === "CARLITE",
      (config) => config.brush_color === "GREEN_BLACK",
    ],
    qty: 1,
    _description: "Horizontal brush, Carlite, green-black",
  },
];

const greenSilver: MaxBOMItem<GeneralBOMConfig>[] = [
  //Thread
  {
    pn: PART_NUMBERS.GREEN_SILVER.THREAD.VERTICAL,
    conditions: [
      (config) => config.brush_qty > 0,
      (config) => config.brush_type === "THREAD",
      (config) => config.brush_color === "GREEN_SILVER",
    ],
    qty: 2,
    _description: "Vertical brush, thread, green-silver",
  },
  {
    pn: PART_NUMBERS.GREEN_SILVER.THREAD.HORIZONTAL,
    conditions: [
      (config) => config.brush_qty === 3,
      (config) => config.brush_type === "THREAD",
      (config) => config.brush_color === "GREEN_SILVER",
    ],
    qty: 1,
    _description: "Horizontal brush, thread, green-silver",
  },
  //Mixed
  {
    pn: PART_NUMBERS.GREEN_SILVER.MIXED.VERTICAL,
    conditions: [
      (config) => config.brush_qty > 0,
      (config) => config.brush_type === "MIXED",
      (config) => config.brush_color === "GREEN_SILVER",
    ],
    qty: 2,
    _description: "Vertical brush, mixed, green-silver",
  },
  {
    pn: PART_NUMBERS.GREEN_SILVER.MIXED.HORIZONTAL,
    conditions: [
      (config) => config.brush_qty === 3,
      (config) => config.brush_type === "MIXED",
      (config) => config.brush_color === "GREEN_SILVER",
    ],
    qty: 1,
    _description: "Horizontal brush, mixed, green-silver",
  },
  //Carlite
  {
    pn: PART_NUMBERS.GREEN_SILVER.CARLITE.VERTICAL,
    conditions: [
      (config) => config.brush_qty > 0,
      (config) => config.brush_type === "CARLITE",
      (config) => config.brush_color === "GREEN_SILVER",
    ],
    qty: 2,
    _description: "Vertical brush, Carlite, green-silver",
  },
  {
    pn: PART_NUMBERS.GREEN_SILVER.CARLITE.HORIZONTAL,
    conditions: [
      (config) => config.brush_qty === 3,
      (config) => config.brush_type === "CARLITE",
      (config) => config.brush_color === "GREEN_SILVER",
    ],
    qty: 1,
    _description: "Horizontal brush, Carlite, green-silver",
  },
];

const red: MaxBOMItem<GeneralBOMConfig>[] = [
  // Thread
  {
    pn: PART_NUMBERS.RED.THREAD.VERTICAL,
    conditions: [
      (config) => config.brush_qty > 0,
      (config) => config.brush_type === "THREAD",
      (config) => config.brush_color === "RED",
    ],
    qty: 2,
    _description: "Vertical brush, thread, red",
  },
  {
    pn: PART_NUMBERS.RED.THREAD.HORIZONTAL,
    conditions: [
      (config) => config.brush_qty === 3,
      (config) => config.brush_type === "THREAD",
      (config) => config.brush_color === "RED",
    ],
    qty: 1,
    _description: "Horizontal brush, thread, red",
  },
  //Mixed
  {
    pn: PART_NUMBERS.RED.MIXED.VERTICAL,
    conditions: [
      (config) => config.brush_qty > 0,
      (config) => config.brush_type === "MIXED",
      (config) => config.brush_color === "RED",
    ],
    qty: 2,
    _description: "Vertical brush, mixed, red",
  },
  {
    pn: PART_NUMBERS.RED.MIXED.HORIZONTAL,
    conditions: [
      (config) => config.brush_qty === 3,
      (config) => config.brush_type === "MIXED",
      (config) => config.brush_color === "RED",
    ],
    qty: 1,
    _description: "Horizontal brush, mixed, red",
  },
  //Carlite
  {
    pn: PART_NUMBERS.RED.CARLITE.VERTICAL,
    conditions: [
      (config) => config.brush_qty > 0,
      (config) => config.brush_type === "CARLITE",
      (config) => config.brush_color === "RED",
    ],
    qty: 2,
    _description: "Vertical brush, Carlite, red",
  },
  {
    pn: PART_NUMBERS.RED.CARLITE.HORIZONTAL,
    conditions: [
      (config) => config.brush_qty === 3,
      (config) => config.brush_type === "CARLITE",
      (config) => config.brush_color === "RED",
    ],
    qty: 1,
    _description: "Horizontal brush, Carlite, red",
  },
];

export const brushBOM: MaxBOMItem<GeneralBOMConfig>[] = [
  ...blueSilver,
  ...greenBlack,
  ...greenSilver,
  ...red,
];
