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
  // Boom tubes & cables
  BOOM_WATER_TUBE_LEFT: "450.29.101",
  BOOM_WATER_TUBE_RIGHT: "450.29.102",
  BOOM_AIR_TUBE_LEFT: "450.29.103",
  BOOM_AIR_TUBE_RIGHT: "450.29.104",
  BOOM_POWER_CABLE_LEFT: "450.29.105",
  BOOM_SIGNAL_CABLE_LEFT: "450.29.106",
  BOOM_POWER_CABLE_RIGHT: "450.29.107",
  BOOM_SIGNAL_CABLE_RIGHT: "450.29.108",
  BOOM_PROFINET_CABLE_LEFT: "450.29.109",
  BOOM_PROFINET_CABLE_RIGHT: "450.29.110",
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

const needsAir = (config: GeneralBOMConfig): boolean => {
  return (
    config.has_foam ||
    (config.has_omz_pump && config.pump_outlet_omz === "HP_ROOF_BAR_SPINNERS")
  );
};

const needsProfinet = (config: GeneralBOMConfig): boolean => {
  return (
    config.touch_pos === "EXTERNAL" ||
    config.touch_qty >= 2 ||
    config.has_itecoweb
  );
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
  // Boom tubes & cables
  {
    pn: PART_NUMBERS.BOOM_WATER_TUBE_LEFT,
    conditions: [usesBoom, (config) => config.supply_side === "LEFT"],
    qty: 1,
    _description: 'Water tube 1" for boom (left post)',
  },
  {
    pn: PART_NUMBERS.BOOM_WATER_TUBE_RIGHT,
    conditions: [usesBoom, (config) => config.supply_side === "RIGHT"],
    qty: 1,
    _description: 'Water tube 1" for boom (right post)',
  },
  {
    pn: PART_NUMBERS.BOOM_AIR_TUBE_LEFT,
    conditions: [usesBoom, (config) => config.supply_side === "LEFT", needsAir],
    qty: 1,
    _description: "Air tube for boom (left post)",
  },
  {
    pn: PART_NUMBERS.BOOM_AIR_TUBE_RIGHT,
    conditions: [usesBoom, (config) => config.supply_side === "RIGHT", needsAir],
    qty: 1,
    _description: "Air tube for boom (right post)",
  },
  {
    pn: PART_NUMBERS.BOOM_POWER_CABLE_LEFT,
    conditions: [usesBoom, (config) => config.supply_side === "LEFT"],
    qty: 1,
    _description: "Power cable 5G2.5 for boom (left post)",
  },
  {
    pn: PART_NUMBERS.BOOM_SIGNAL_CABLE_LEFT,
    conditions: [usesBoom, (config) => config.supply_side === "LEFT"],
    qty: 1,
    _description: "Signal cable 12G1 for boom (left post)",
  },
  {
    pn: PART_NUMBERS.BOOM_POWER_CABLE_RIGHT,
    conditions: [usesBoom, (config) => config.supply_side === "RIGHT"],
    qty: 1,
    _description: "Power cable 5G2.5 for boom (right post)",
  },
  {
    pn: PART_NUMBERS.BOOM_SIGNAL_CABLE_RIGHT,
    conditions: [usesBoom, (config) => config.supply_side === "RIGHT"],
    qty: 1,
    _description: "Signal cable 12G1 for boom (right post)",
  },
  {
    pn: PART_NUMBERS.BOOM_PROFINET_CABLE_LEFT,
    conditions: [usesBoom, (config) => config.supply_side === "LEFT", needsProfinet],
    qty: 1,
    _description: "Profinet cable for boom (left post)",
  },
  {
    pn: PART_NUMBERS.BOOM_PROFINET_CABLE_RIGHT,
    conditions: [usesBoom, (config) => config.supply_side === "RIGHT", needsProfinet],
    qty: 1,
    _description: "Profinet cable for boom (right post)",
  },
];
