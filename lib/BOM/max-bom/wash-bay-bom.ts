import type { WashBay } from "@/db/schemas";
import type { WithSupplyData } from "@/lib/BOM";
import type { MaxBOMItem } from "@/lib/BOM/max-bom";

const PART_NUMBERS = {
  LINE_POST_ASSY_H2500: "1100.300.001",
  LINE_POST_ASSY_H2500_PANEL_READY: "1100.300.002",
  CENTRAL_POST_ASSY_H2500_PANEL_READY: "1100.300.004",
  LINE_POST_ASSY_H3000_PANEL_READY: "1100.300.012",
  CENTRAL_POST_ASSY_H3000_PANEL_READY: "1100.300.014",
  FESTOON_LINE_WITH_SHORT_SHELVES: "1100.300.041",
  FESTOON_LINE_WITH_SHORT_SHELVES_FOR_POST_LINE_WITH_CENTRAL_POST:
    "1100.300.042",
  FESTOON_LINE_WITH_LONG_SHELVES: "1100.300.051",
  FESTOON_LINE_WITH_LONG_SHELVES_FOR_POST_LINE_WITH_CENTRAL_POST:
    "1100.300.052",
  HP_LANCE_ASSY: "1100.300.081",
  DETERGENT_LANCE_ASSY: "1100.300.082",
  HP_WEEPING_LANCE_ASSY: "1100.300.083",
  HOSE_REEL_HP_WITH_POST_ASSY: "TODO-HP-WITH-POST", // TODO Replace with real PN and add to Excel
  HOSE_REEL_HP_WITHOUT_POST_ASSY: "TODO-HP-WITHOUT-POST", // TODO Replace with real PN and add to Excel
  HOSE_REEL_DET_WITH_POST_ASSY: "TODO-DET-WITH-POST", // TODO Replace with real PN and add to Excel
  HOSE_REEL_DET_WITHOUT_POST_ASSY: "TODO-DET-WITHOUT-POST", // TODO Replace with real PN and add to Excel
  HOSE_REEL_HP_DET_WITH_POST_ASSY: "TODO-HP-DET-WITH-POST", // TODO Replace with real PN and add to Excel
  SIDE_PANEL_ASSY: "1100.300.021",
  SIDE_PANEL_ASSY_FOR_CENTRAL_POST_LINE: "1100.300.022",
  SLIDING_BRACKETS_FOR_FESTOON_LINE_WITH_BOOM: "1100.300.061",
  CHAIN_150: "1100.300.035",
  CHAIN_200: "1100.300.037",
  CHAIN_250: "1100.300.038",
  CHAIN_300: "1100.300.039",
  // Energy chain hoses & cables
  EC_PROFINET_CABLE_LEFT: "1100.112.003",
  EC_PROFINET_CABLE_RIGHT: "1100.112.004",
  EC_POWER_CABLE: "1100.112.001",
  EC_SIGNAL_CABLE: "1100.112.002",
  EC_WATER_1_TUBE: "1100.113.001",
  EC_WATER_34_TUBE: "1100.113.002",
  EC_AIR_TUBE: "1100.113.003",
  EC_R1_1_TUBE: "9000.530.038",
  EC_R2_1_TUBE: "9000.530.034",
  EC_R2_34_INOX_TUBE: "9000.525.015",
  // Pressure washer stuff
  PW_21L_150BAR: "510.12.001", // TODO Add rules for this
  PW_21L_200BAR: "510.12.003", // TODO Add rules for this
  PW_INLET_OUTLET_W_ANTIFREEZE: "1100.062.001", // TODO Add rules for this
  PW_INLET_OUTLET_WO_ANTIFREEZE: "1100.062.002", // TODO Add rules for this
  PW_INLET_OUTLET_W_ANTIFREEZE_WO_P_RELEASE: "1100.062.003", // TODO Add rules for this
  PW_INLET_OUTLET_WO_ANTIFREEZE_WO_P_RELEASE: "1100.062.004", // TODO Add rules for this
  PW_INLET_OUTLET_W_MANUAL_ANTIFREEZE: "1100.062.005", // TODO Add rules for this
  PW_ELECTRIC_PANEL_1PW_WO_P_RELEASE: "890.03.001", // TODO Add rules for this
  PW_ELECTRIC_PANEL_2PW_WO_P_RELEASE: "890.03.002", // TODO Add rules for this
  PW_ELECTRIC_PANEL_1PW_W_P_RELEASE: "890.03.021", // TODO Add rules for this
  PW_ELECTRIC_PANEL_2PW_W_P_RELEASE: "890.03.022", // TODO Add rules for this
  PW_MUSHROOM_BUTTON_ASSY: "1100.055.011", // TODO Add rules for this
} as const satisfies Record<string, string>;

const hasEnergyChain = (config: WashBay & WithSupplyData) =>
  config.supply_type === "ENERGY_CHAIN" && config.has_gantry;

const hasNoFestoons = (config: WashBay) =>
  config.hp_lance_qty + config.det_lance_qty === 0;

const usesCentralPost = (config: WashBay & WithSupplyData) =>
  hasEnergyChain(config) && config.energy_chain_width !== "L150";

const uses2500posts = (config: WashBay & WithSupplyData) =>
  (config.hp_lance_qty + config.det_lance_qty === 2 ||
    hasEnergyChain(config)) &&
  !config.uses_3000_posts;

const usesShortShelves = (config: WashBay) =>
  config.hp_lance_qty + config.det_lance_qty === 2;

const usesShortAndLongShelves = (config: WashBay) =>
  config.hp_lance_qty + config.det_lance_qty > 2;

const usesPanels = (config: WashBay) => config.has_bay_dividers;

const calculateHpLanceQty = (config: WashBay) =>
  config.hp_lance_qty +
  config.hose_reel_hp_with_post_qty +
  config.hose_reel_hp_without_post_qty +
  config.hose_reel_hp_det_with_post_qty;

const calculateDetLanceQty = (config: WashBay) =>
  config.det_lance_qty +
  config.hose_reel_det_with_post_qty +
  config.hose_reel_det_without_post_qty +
  config.hose_reel_hp_det_with_post_qty;

const usesSlidingBrackets = (config: WashBay & WithSupplyData) =>
  config.supply_type === "BOOM" && config.has_gantry;

export const calculateLinePostAssyQty = (config: WashBay & WithSupplyData) => {
  if (
    hasNoFestoons(config) &&
    hasEnergyChain(config) &&
    usesCentralPost(config)
  )
    return 8;
  if (
    hasNoFestoons(config) &&
    hasEnergyChain(config) &&
    !usesCentralPost(config)
  )
    return 9;
  if (config.is_first_bay && hasEnergyChain(config) && usesCentralPost(config))
    return 17;
  if (config.is_first_bay && hasEnergyChain(config) && !usesCentralPost(config))
    return 18;
  if (
    config.is_first_bay &&
    !hasEnergyChain(config) &&
    !usesCentralPost(config)
  )
    return 16;
  if (!config.is_first_bay && hasEnergyChain(config) && usesCentralPost(config))
    return 9;
  if (
    !config.is_first_bay &&
    hasEnergyChain(config) &&
    !usesCentralPost(config)
  )
    return 10;
  return 8;
};

export const calculateLinePostAssyQtyWithPanels = (
  config: WashBay & WithSupplyData,
) => {
  if (config.is_first_bay && hasEnergyChain(config) && usesCentralPost(config))
    return 19;
  if (config.is_first_bay) return 20;
  if (!config.is_first_bay && hasEnergyChain(config) && usesCentralPost(config))
    return 9;
  return 10;
};

export const calculateSidePanelQty = (config: WashBay & WithSupplyData) => {
  if (!config.is_first_bay && usesCentralPost(config)) return 0;
  if (config.is_first_bay && usesCentralPost(config)) return 1;
  if (!config.is_first_bay && !usesCentralPost(config)) return 1;
  return 2;
};

export const washBayBOM: MaxBOMItem<WashBay & WithSupplyData>[] = [
  {
    pn: PART_NUMBERS.LINE_POST_ASSY_H2500,
    conditions: [
      (config) => uses2500posts(config),
      (config) => !usesPanels(config),
    ],
    qty: (config) => calculateLinePostAssyQty(config),
    _description: "Line post assembly, 2500",
  },
  {
    pn: PART_NUMBERS.LINE_POST_ASSY_H2500_PANEL_READY,
    conditions: [
      (config) => uses2500posts(config),
      (config) => usesPanels(config),
    ],
    qty: (config) => calculateLinePostAssyQtyWithPanels(config),
    _description: "Line post assembly, 2500, panel ready",
  },
  {
    pn: PART_NUMBERS.CENTRAL_POST_ASSY_H2500_PANEL_READY,
    conditions: [
      (config) => uses2500posts(config),
      (config) => usesCentralPost(config),
    ],
    qty: 1,
    _description: "Central post assembly, 2500, panel ready",
  },
  {
    pn: PART_NUMBERS.LINE_POST_ASSY_H3000_PANEL_READY,
    conditions: [(config) => config.uses_3000_posts],
    qty: (config) =>
      usesPanels(config)
        ? calculateLinePostAssyQtyWithPanels(config)
        : calculateLinePostAssyQty(config),
    _description: "Line post assembly, 3000, panel ready",
  },
  {
    pn: PART_NUMBERS.CENTRAL_POST_ASSY_H3000_PANEL_READY,
    conditions: [
      (config) => config.uses_3000_posts,
      (config) => usesCentralPost(config),
    ],
    qty: 1,
    _description: "Central post assembly, 3000, panel ready",
  },
  {
    pn: PART_NUMBERS.FESTOON_LINE_WITH_SHORT_SHELVES,
    conditions: [
      (config) => usesShortShelves(config) || usesShortAndLongShelves(config),
    ],
    qty: (config) => (usesCentralPost(config) ? 1 : 2),
    _description: "Festoon line with short shelves",
  },
  {
    pn: PART_NUMBERS.FESTOON_LINE_WITH_SHORT_SHELVES_FOR_POST_LINE_WITH_CENTRAL_POST,
    conditions: [
      (config) => usesShortShelves(config) || usesShortAndLongShelves(config),
      (config) => usesCentralPost(config),
    ],
    qty: 1,
    _description:
      "Festoon line with short shelves for post line with central post",
  },
  {
    pn: PART_NUMBERS.FESTOON_LINE_WITH_LONG_SHELVES,
    conditions: [(config) => usesShortAndLongShelves(config)],
    qty: (config) => (usesCentralPost(config) ? 1 : 2),
    _description: "Festoon line with long shelves",
  },
  {
    pn: PART_NUMBERS.FESTOON_LINE_WITH_LONG_SHELVES_FOR_POST_LINE_WITH_CENTRAL_POST,
    conditions: [
      (config) => usesShortAndLongShelves(config),
      (config) => usesCentralPost(config),
    ],
    qty: 1,
    _description:
      "Festoon line with long shelves for post line with central post",
  },
  {
    pn: PART_NUMBERS.HP_LANCE_ASSY,
    conditions: [
      (config) => calculateHpLanceQty(config) > 0,
      (config) => !config.has_weeping_lances,
    ],
    qty: (config) => calculateHpLanceQty(config),
    _description: "HP lance assembly",
  },
  {
    pn: PART_NUMBERS.HP_WEEPING_LANCE_ASSY,
    conditions: [
      (config) => calculateHpLanceQty(config) > 0,
      (config) => config.has_weeping_lances,
    ],
    qty: (config) => calculateHpLanceQty(config),
    _description: "HP weeping lance assembly",
  },
  {
    pn: PART_NUMBERS.DETERGENT_LANCE_ASSY,
    conditions: [(config) => calculateDetLanceQty(config) > 0],
    qty: (config) => calculateDetLanceQty(config),
    _description: "Detergent lance assembly",
  },
  {
    pn: PART_NUMBERS.HOSE_REEL_HP_WITH_POST_ASSY,
    conditions: [(config) => config.hose_reel_hp_with_post_qty > 0],
    qty: (config) => config.hose_reel_hp_with_post_qty,
    _description: "Hose reel HP with post",
  },
  {
    pn: PART_NUMBERS.HOSE_REEL_HP_WITHOUT_POST_ASSY,
    conditions: [(config) => config.hose_reel_hp_without_post_qty > 0],
    qty: (config) => config.hose_reel_hp_without_post_qty,
    _description: "Hose reel HP without post",
  },
  {
    pn: PART_NUMBERS.HOSE_REEL_DET_WITH_POST_ASSY,
    conditions: [(config) => config.hose_reel_det_with_post_qty > 0],
    qty: (config) => config.hose_reel_det_with_post_qty,
    _description: "Hose reel detergent with post",
  },
  {
    pn: PART_NUMBERS.HOSE_REEL_DET_WITHOUT_POST_ASSY,
    conditions: [(config) => config.hose_reel_det_without_post_qty > 0],
    qty: (config) => config.hose_reel_det_without_post_qty,
    _description: "Hose reel detergent without post",
  },
  {
    pn: PART_NUMBERS.HOSE_REEL_HP_DET_WITH_POST_ASSY,
    conditions: [(config) => config.hose_reel_hp_det_with_post_qty > 0],
    qty: (config) => config.hose_reel_hp_det_with_post_qty,
    _description: "Hose reel HP+detergent with post",
  },
  {
    pn: PART_NUMBERS.SIDE_PANEL_ASSY,
    conditions: [(config) => usesPanels(config)],
    qty: (config) => calculateSidePanelQty(config),
    _description: "Side panel assembly",
  },
  {
    pn: PART_NUMBERS.SIDE_PANEL_ASSY_FOR_CENTRAL_POST_LINE,
    conditions: [
      (config) => usesPanels(config),
      (config) => usesCentralPost(config),
    ],
    qty: 1,
    _description: "Side panel assembly for central post line",
  },
  {
    pn: PART_NUMBERS.SLIDING_BRACKETS_FOR_FESTOON_LINE_WITH_BOOM,
    conditions: [(config) => usesSlidingBrackets(config)],
    qty: 1,
    _description: "Sliding brackets for festoon line with boom",
  },
  {
    pn: PART_NUMBERS.CHAIN_150,
    conditions: [
      hasEnergyChain,
      (config) => config.energy_chain_width === "L150",
    ],
    qty: 1,
    _description: "Cable chain (150mm)",
  },
  {
    pn: PART_NUMBERS.CHAIN_200,
    conditions: [
      hasEnergyChain,
      (config) => config.energy_chain_width === "L200",
    ],
    qty: 1,
    _description: "Cable chain (200mm)",
  },
  {
    pn: PART_NUMBERS.CHAIN_250,
    conditions: [
      hasEnergyChain,
      (config) => config.energy_chain_width === "L250",
    ],
    qty: 1,
    _description: "Cable chain (250mm)",
  },
  {
    pn: PART_NUMBERS.CHAIN_300,
    conditions: [
      hasEnergyChain,
      (config) => config.energy_chain_width === "L300",
    ],
    qty: 1,
    _description: "Cable chain (300mm)",
  },
  // Energy chain hoses & cables
  {
    pn: PART_NUMBERS.EC_PROFINET_CABLE_LEFT,
    conditions: [
      hasEnergyChain,
      (config) => (config.ec_profinet_cable_qty ?? 0) > 0,
      (config) => config.supply_side === "LEFT",
    ],
    qty: (config) => config.ec_profinet_cable_qty ?? 0,
    _description: "Profinet cable for energy chain (left post)",
  },
  {
    pn: PART_NUMBERS.EC_PROFINET_CABLE_RIGHT,
    conditions: [
      hasEnergyChain,
      (config) => (config.ec_profinet_cable_qty ?? 0) > 0,
      (config) => config.supply_side === "RIGHT",
    ],
    qty: (config) => config.ec_profinet_cable_qty ?? 0,
    _description: "Profinet cable for energy chain (right post)",
  },
  {
    pn: PART_NUMBERS.EC_POWER_CABLE,
    conditions: [hasEnergyChain],
    qty: 1,
    _description: "Power cable 5G2.5 for energy chain",
  },
  {
    pn: PART_NUMBERS.EC_SIGNAL_CABLE,
    conditions: [
      hasEnergyChain,
      (config) => (config.ec_signal_cable_qty ?? 0) > 0,
    ],
    qty: (config) => config.ec_signal_cable_qty ?? 0,
    _description: "Signal cable 12G1 for energy chain",
  },
  {
    pn: PART_NUMBERS.EC_WATER_1_TUBE,
    conditions: [
      hasEnergyChain,
      (config) => (config.ec_water_1_tube_qty ?? 0) > 0,
    ],
    qty: (config) => config.ec_water_1_tube_qty ?? 0,
    _description: 'Water tube 1" for energy chain',
  },
  {
    pn: PART_NUMBERS.EC_WATER_34_TUBE,
    conditions: [
      hasEnergyChain,
      (config) => (config.ec_water_34_tube_qty ?? 0) > 0,
    ],
    qty: (config) => config.ec_water_34_tube_qty ?? 0,
    _description: 'Water tube 3/4" for energy chain',
  },
  {
    pn: PART_NUMBERS.EC_AIR_TUBE,
    conditions: [hasEnergyChain, (config) => (config.ec_air_tube_qty ?? 0) > 0],
    qty: (config) => config.ec_air_tube_qty ?? 0,
    _description: "Air tube 8x17 for energy chain",
  },
  {
    pn: PART_NUMBERS.EC_R1_1_TUBE,
    conditions: [
      hasEnergyChain,
      (config) => (config.ec_r1_1_tube_qty ?? 0) > 0,
    ],
    qty: (config) => config.ec_r1_1_tube_qty ?? 0,
    _description: 'R1 tube 1" for energy chain',
  },
  {
    pn: PART_NUMBERS.EC_R2_1_TUBE,
    conditions: [
      hasEnergyChain,
      (config) => (config.ec_r2_1_tube_qty ?? 0) > 0,
    ],
    qty: (config) => config.ec_r2_1_tube_qty ?? 0,
    _description: 'R2 tube 1" for energy chain',
  },
  {
    pn: PART_NUMBERS.EC_R2_34_INOX_TUBE,
    conditions: [
      hasEnergyChain,
      (config) => (config.ec_r2_34_inox_tube_qty ?? 0) > 0,
    ],
    qty: (config) => config.ec_r2_34_inox_tube_qty ?? 0,
    _description: 'R2 tube 3/4" INOX for energy chain',
  },
];
