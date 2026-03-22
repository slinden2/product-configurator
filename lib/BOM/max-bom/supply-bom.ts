import { GeneralBOMConfig } from "@/lib/BOM";
import { MaxBOMItem } from "@/lib/BOM/max-bom";

const PART_NUMBERS = {
  STRAIGHT_SHELF: "1100.019.000",
  SUPPLY_POLE_1_WATER: "1100.049.001",
  SUPPLY_POLE_2_WATER: "1100.049.002",
  SUPPLY_POLE_1_WATER_HP: "1100.049.003",
  SUPPLY_POLE_2_WATER_HP: "1100.049.004",
  WALL_SHELF_1_WATER: "1100.049.005",
  WALL_SHELF_2_WATER: "1100.049.006",
  WALL_SHELF_1_WATER_HP: "1100.049.007",
  WALL_SHELF_2_WATER_HP: "1100.049.008",
  FRAME_AND_COVER: "1100.049.009",
  ANCHOR_KIT: "1100.049.010",
  BOOM: "450.29.000",
  BOOM_HP: "450.39.000",
  REINFORCED_SHELF_ASSY_L: "1100.019.016",
  REINFORCED_SHELF_ASSY_R: "1100.019.017",
} as const satisfies Record<string, string>;

const usesStraightShelf = (config: GeneralBOMConfig): boolean => {
  return config.supply_type === "STRAIGHT_SHELF";
};

const usesBoom = (config: GeneralBOMConfig): boolean => {
  return config.supply_type === "BOOM";
};

const usesPost = (config: GeneralBOMConfig): boolean => {
  return config.supply_fixing_type === "POST";
};

const usesShelf = (config: GeneralBOMConfig): boolean => {
  return config.supply_fixing_type === "WALL";
};

const usesEnergyChain = (config: GeneralBOMConfig): boolean => {
  return config.supply_type === "ENERGY_CHAIN";
};

const hasDoubleWaterSupply = (config: GeneralBOMConfig): boolean => {
  return !!config.water_2_type;
};

const has15kWPump = (config: GeneralBOMConfig): boolean => {
  return (
    config.has_15kw_pump &&
    ((config.pump_outlet_1_15kw !== null &&
      config.pump_outlet_1_15kw !== "CHASSIS_WASH") ||
      (config.pump_outlet_2_15kw !== null &&
        config.pump_outlet_2_15kw !== "CHASSIS_WASH"))
  );
};

export const supplyBOM: MaxBOMItem<GeneralBOMConfig>[] = [
  // Straight shelf
  {
    pn: PART_NUMBERS.STRAIGHT_SHELF,
    conditions: [usesStraightShelf],
    qty: 1,
    _description: "Straight shelf",
  },
  // Boom
  {
    pn: PART_NUMBERS.SUPPLY_POLE_1_WATER,
    conditions: [
      usesBoom,
      usesPost,
      (config) => !hasDoubleWaterSupply(config),
      (config) => !has15kWPump(config),
    ],
    qty: 1,
    _description: "Supply pole (1 water)",
  },
  {
    pn: PART_NUMBERS.SUPPLY_POLE_2_WATER,
    conditions: [
      usesBoom,
      usesPost,
      hasDoubleWaterSupply,
      (config) => !has15kWPump(config),
    ],
    qty: 1,
    _description: "Supply pole (2 waters)",
  },
  {
    pn: PART_NUMBERS.SUPPLY_POLE_1_WATER_HP,
    conditions: [
      usesBoom,
      usesPost,
      (config) => !hasDoubleWaterSupply(config),
      has15kWPump,
    ],
    qty: 1,
    _description: "Supply pole (1 water + hp)",
  },
  {
    pn: PART_NUMBERS.SUPPLY_POLE_2_WATER_HP,
    conditions: [usesBoom, usesPost, hasDoubleWaterSupply, has15kWPump],
    qty: 1,
    _description: "Supply pole (2 waters + hp)",
  },
  {
    pn: PART_NUMBERS.WALL_SHELF_1_WATER,
    conditions: [
      usesBoom,
      usesShelf,
      (config) => !hasDoubleWaterSupply(config),
      (config) => !has15kWPump(config),
    ],
    qty: 1,
    _description: "Wall shelf (1 water)",
  },
  {
    pn: PART_NUMBERS.WALL_SHELF_2_WATER,
    conditions: [
      usesBoom,
      usesShelf,
      hasDoubleWaterSupply,
      (config) => !has15kWPump(config),
    ],
    qty: 1,
    _description: "Wall shelf (2 waters)",
  },
  {
    pn: PART_NUMBERS.WALL_SHELF_1_WATER_HP,
    conditions: [
      usesBoom,
      usesShelf,
      (config) => !hasDoubleWaterSupply(config),
      has15kWPump,
    ],
    qty: 1,
    _description: "Wall shelf (1 water + hp)",
  },
  {
    pn: PART_NUMBERS.WALL_SHELF_2_WATER_HP,
    conditions: [usesBoom, usesShelf, hasDoubleWaterSupply, has15kWPump],
    qty: 1,
    _description: "Wall shelf (2 waters + hp)",
  },
  {
    pn: PART_NUMBERS.FRAME_AND_COVER,
    conditions: [usesBoom, usesPost, (config) => config.has_post_frame],
    qty: 1,
    _description: "Frame and cover",
  },
  {
    pn: PART_NUMBERS.ANCHOR_KIT,
    conditions: [usesBoom, usesPost, (config) => !config.has_post_frame],
    qty: 1,
    _description: "Anchor kit",
  },
  {
    pn: PART_NUMBERS.BOOM,
    conditions: [usesBoom, (config) => !has15kWPump(config)],
    qty: 1,
    _description: "Boom",
  },
  {
    pn: PART_NUMBERS.BOOM_HP,
    conditions: [usesBoom, has15kWPump],
    qty: 1,
    _description: "Boom",
  },
  // Energy chain reinforced shelf (chain items are per wash bay, in wash-bay-bom.ts)
  {
    pn: PART_NUMBERS.REINFORCED_SHELF_ASSY_L,
    conditions: [usesEnergyChain, (config) => config.supply_side === "LEFT"],
    qty: 1,
    _description: "Reinforced shelf (L)",
  },
  {
    pn: PART_NUMBERS.REINFORCED_SHELF_ASSY_R,
    conditions: [usesEnergyChain, (config) => config.supply_side === "RIGHT"],
    qty: 1,
    _description: "Reinforced shelf (R)",
  },
];
