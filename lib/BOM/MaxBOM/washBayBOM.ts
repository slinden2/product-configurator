import { WashBay } from "@/db/schemas";
import { WithSupplyData } from "@/lib/BOM";
import { MaxBOMItem } from "@/lib/BOM/MaxBOM";

const PART_NUMBERS: Record<string, string> = {
  // TODO Create all these in TSE. Remember also chains in supplyBOM.
  LINE_POST_ASSY_H2500: "2500-PL",
  LINE_POST_ASSY_H2500_PANEL_READY: "2500-PL-PP",
  CENTRAL_POST_ASSY_H2500_PANEL_READY: "2500-PC-PP",
  LINE_POST_ASSY_H3000_PANEL_READY: "3000-PL-PP",
  CENTRAL_POST_ASSY_H3000_PANEL_READY: "3000-PC-PP",
  FESTOON_LINE_WITH_SHORT_SHELVES: "LT-INF",
  FESTOON_LINE_WITH_SHORT_SHELVES_FOR_POST_LINE_WITH_CENTRAL_POST: "LT-INF-PC",
  FESTOON_LINE_WITH_LONG_SHELVES: "LT-SUP",
  FESTOON_LINE_WITH_LONG_SHELVES_FOR_POST_LINE_WITH_CENTRAL_POST: "LT-SUP-PC",
  HP_LANCE_ASSY: "LT-IDRO",
  DETERGENT_LANCE_ASSY: "LT-DET",
  HP_LANCE_ASSY_WEEPING: "LT-IDRO-P", // TODO Add selections in front
  DETERGENT_LANCE_ASSY_WEEPING: "LT-DET-P", // TODO Add selections in front
  HOSE_REEL_ASSY: "AM",
  HOSE_REEL_ASSY_FOR_POST_PANEL_READY: "AM-PN",
  SIDE_PANEL_ASSY: "PN",
  SIDE_PANEL_ASSY_FOR_CENTRAL_POST_LINE: "PN-PC",
  SLIDING_BRACKETS_FOR_FESTOON_LINE_WITH_BOOM: "AS",
};

const usesCableChain = (config: WashBay & WithSupplyData) =>
  config.supply_type === "CABLE_CHAIN" && config.supply_fixing_type === "POST";

const hasCableChain = (config: WashBay & WithSupplyData) =>
  usesCableChain(config) &&
  (config.has_gantry || config.uses_cable_chain_without_washbay);

const usesCentralPost = (config: WashBay & WithSupplyData) =>
  hasCableChain(config) && config.energy_chain_width !== "L150";

const uses2500posts = (config: WashBay & WithSupplyData) =>
  (config.hp_lance_qty + config.det_lance_qty === 2 &&
    !config.uses_3000_posts) ||
  config.uses_cable_chain_without_washbay;

const usesShortShelves = (config: WashBay & WithSupplyData) =>
  config.hp_lance_qty + config.det_lance_qty === 2;

const usesLongShelves = (config: WashBay & WithSupplyData) =>
  config.hp_lance_qty + config.det_lance_qty > 2;

const usesPanels = (config: WashBay & WithSupplyData) =>
  config.has_bay_dividers;

const usesSlidingBrackets = (config: WashBay & WithSupplyData) =>
  config.supply_type === "BOOM" && config.has_gantry;

const calculateLinePostAssyQty = (config: WashBay & WithSupplyData) => {
  if (config.is_first_bay && hasCableChain(config) && usesCentralPost(config))
    return 17;
  if (config.is_first_bay && hasCableChain(config) && !usesCentralPost(config))
    return 18;
  if (config.is_first_bay && !hasCableChain(config) && !usesCentralPost(config))
    return 16;
  if (!config.is_first_bay && hasCableChain(config) && usesCentralPost(config))
    return 9;
  if (!config.is_first_bay && hasCableChain(config) && !usesCentralPost(config))
    return 10;
  return 8;
};

const calculateLinePostAssyQtyWithPanels = (
  config: WashBay & WithSupplyData
) => {
  if (config.is_first_bay && hasCableChain(config) && usesCentralPost(config))
    return 19;
  if (config.is_first_bay) return 20;
  if (!config.is_first_bay && hasCableChain(config) && usesCentralPost(config))
    return 9;
  return 10;
};

const calculateSidePanelQty = (config: WashBay & WithSupplyData) => {
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
    conditions: [(config) => usesShortShelves(config)],
    qty: (config) => (usesCentralPost(config) ? 1 : 2),
    _description: "Festoon line with short shelves",
  },
  {
    pn: PART_NUMBERS.FESTOON_LINE_WITH_SHORT_SHELVES_FOR_POST_LINE_WITH_CENTRAL_POST,
    conditions: [
      (config) => usesShortShelves(config),
      (config) => usesCentralPost(config),
    ],
    qty: 1,
    _description:
      "Festoon line with short shelves for post line with central post",
  },
  {
    pn: PART_NUMBERS.FESTOON_LINE_WITH_LONG_SHELVES,
    conditions: [(config) => usesLongShelves(config)],
    qty: (config) => (usesCentralPost(config) ? 1 : 2),
    _description: "Festoon line with long shelves",
  },
  {
    pn: PART_NUMBERS.FESTOON_LINE_WITH_LONG_SHELVES_FOR_POST_LINE_WITH_CENTRAL_POST,
    conditions: [
      (config) => usesLongShelves(config),
      (config) => usesCentralPost(config),
    ],
    qty: 1,
    _description:
      "Festoon line with long shelves for post line with central post",
  },
  {
    pn: PART_NUMBERS.HP_LANCE_ASSY,
    conditions: [(config) => config.hp_lance_qty > 0],
    qty: (config) => config.hp_lance_qty,
    _description: "HP lance assembly",
  },
  {
    pn: PART_NUMBERS.DETERGENT_LANCE_ASSY,
    conditions: [(config) => config.det_lance_qty > 0],
    qty: (config) => config.det_lance_qty,
    _description: "Detergent lance assembly",
  },
  {
    pn: PART_NUMBERS.HOSE_REEL_ASSY,
    conditions: [
      (config) => config.hose_reel_qty > 0,
      (config) => !usesPanels(config),
    ],
    qty: (config) => config.hose_reel_qty,
    _description: "Hose reel assembly",
  },
  {
    pn: PART_NUMBERS.HOSE_REEL_ASSY_FOR_POST_PANEL_READY,
    conditions: [
      (config) => config.hose_reel_qty > 0,
      (config) => usesPanels(config),
    ],
    qty: (config) => config.hose_reel_qty,
    _description: "Hose reel assembly for post, panel ready",
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
];
