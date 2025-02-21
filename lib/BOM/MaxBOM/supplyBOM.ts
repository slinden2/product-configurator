import { Configuration } from "@/db/schemas";
import { MaxBOMItem } from "@/lib/BOM/MaxBOM";
import { EnergyChainWidthType } from "@/types";

const PART_NUMBERS: Record<string, string> = {
  STRAIGH_SHELF: "1100.019.000",
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
  CHAIN_150: "CP-150", // TODO Create in TSE
  CHAIN_200: "CP-200", // TODO Create in TSE
  CHAIN_250: "CP-250", // TODO Create in TSE
  CHAIN_300: "CP-300", // TODO Create in TSE
  REINFORCED_SHELF_ASSY_L: "1100.019.016",
  REINFORCED_SHELF_ASSY_R: "1100.019.017",
};

const usesStraightShelf = (config: Configuration): boolean => {
  return config.supply_type === "STRAIGHT_SHELF";
};

const usesBoom = (config: Configuration): boolean => {
  return config.supply_type === "BOOM";
};

const usesPost = (config: Configuration): boolean => {
  return config.supply_fixing_type === "POST";
};

const usesShelf = (config: Configuration): boolean => {
  return config.supply_fixing_type === "WALL";
};

const usesCableChain = (
  config: Configuration,
  width?: EnergyChainWidthType
): boolean => {
  if (!width) return config.supply_type === "CABLE_CHAIN";
  return (
    config.supply_type === "CABLE_CHAIN" && config.energy_chain_width === width
  );
};

const hasDoubleWaterSupply = (config: Configuration): boolean => {
  return !!config.water_2_type;
};

const has15kWPump = (config: Configuration): boolean => {
  return (
    config.has_15kw_pump &&
    ((config.pump_outlet_1_15kw !== null &&
      config.pump_outlet_1_15kw !== "CHASSIS_WASH") ||
      (config.pump_outlet_2_15kw !== null &&
        config.pump_outlet_2_15kw !== "CHASSIS_WASH"))
  );
};

export const supplyBOM: MaxBOMItem<Configuration>[] = [
  // Straight shelf
  {
    pn: PART_NUMBERS.STRAIGH_SHELF,
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
    pn: PART_NUMBERS.SUPPLY_POLE_2_WATER,
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
    pn: PART_NUMBERS.SUPPLY_POLE_1_WATER_HP,
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
    pn: PART_NUMBERS.SUPPLY_POLE_2_WATER_HP,
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
  {
    pn: PART_NUMBERS.CHAIN_150,
    conditions: [(config) => usesCableChain(config, "L150")],
    qty: 1,
    _description: "Cable chain (150mm)",
  },
  {
    pn: PART_NUMBERS.CHAIN_200,
    conditions: [(config) => usesCableChain(config, "L200")],
    qty: 1,
    _description: "Cable chain (200mm)",
  },
  {
    pn: PART_NUMBERS.CHAIN_250,
    conditions: [(config) => usesCableChain(config, "L250")],
    qty: 1,
    _description: "Cable chain (250mm)",
  },
  {
    pn: PART_NUMBERS.CHAIN_300,
    conditions: [(config) => usesCableChain(config, "L300")],
    qty: 1,
    _description: "Cable chain (300mm)",
  },
  {
    pn: PART_NUMBERS.REINFORCED_SHELF_ASSY_L,
    conditions: [usesCableChain, (config) => config.supply_side === "LEFT"],
    qty: 1,
    _description: "Reinforced shelf (L)",
  },
  {
    pn: PART_NUMBERS.REINFORCED_SHELF_ASSY_R,
    conditions: [usesCableChain, (config) => config.supply_side === "RIGHT"],
    qty: 1,
    _description: "Reinforced shelf (R)",
  },
];
