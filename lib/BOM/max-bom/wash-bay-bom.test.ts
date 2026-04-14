import { describe, expect, test, vi } from "vitest";

// Mock @/db to prevent DATABASE_URL check on module load
vi.mock("@/db", () => ({
  db: { query: { partNumbers: { findMany: vi.fn().mockResolvedValue([]) } } },
}));
vi.mock("@/db/queries", () => ({
  getPartNumbersByArray: vi.fn().mockResolvedValue([]),
}));

import type { WashBay } from "@/db/schemas";
import type { WithSupplyData } from "@/lib/BOM";
import {
  calculateLinePostAssyQty,
  calculateLinePostAssyQtyWithPanels,
  calculateSidePanelQty,
  washBayBOM,
} from "@/lib/BOM/max-bom/wash-bay-bom";

type WashBayConfig = WashBay & WithSupplyData;

// Base config helper — produces a non-first, non-energy-chain bay with 2 lances
function makeConfig(overrides: Partial<WashBayConfig> = {}): WashBayConfig {
  return {
    id: 1,
    hp_lance_qty: 2,
    det_lance_qty: 0,
    hose_reel_hp_with_post_qty: 0,
    hose_reel_hp_without_post_qty: 0,
    hose_reel_det_with_post_qty: 0,
    hose_reel_det_without_post_qty: 0,
    hose_reel_hp_det_with_post_qty: 0,
    pressure_washer_type: null,
    pressure_washer_qty: null,
    has_gantry: false,
    energy_chain_width: null,
    has_shelf_extension: false,
    ec_profinet_cable_qty: null,
    ec_signal_cable_qty: null,
    ec_water_1_tube_qty: null,
    ec_water_34_tube_qty: null,
    ec_air_tube_qty: null,
    ec_r1_1_tube_qty: null,
    ec_r2_1_tube_qty: null,
    ec_r2_34_inox_tube_qty: null,
    is_first_bay: false,
    has_bay_dividers: false,
    has_weeping_lances: false,
    created_at: new Date(),
    updated_at: new Date(),
    configuration_id: 1,
    supply_type: "STRAIGHT_SHELF",
    supply_side: "LEFT",
    supply_fixing_type: null,
    uses_3000_posts: false,
    ...overrides,
  } as WashBayConfig;
}

// Shorthand helpers for common energy chain configs
const withEnergyChain = (extra: Partial<WashBayConfig> = {}) =>
  makeConfig({
    supply_type: "ENERGY_CHAIN",
    has_gantry: true,
    energy_chain_width: "L200", // non-L150 → central post
    ...extra,
  });

const withEnergyChainNoCentralPost = (extra: Partial<WashBayConfig> = {}) =>
  makeConfig({
    supply_type: "ENERGY_CHAIN",
    has_gantry: true,
    energy_chain_width: "L150", // L150 → no central post
    ...extra,
  });

describe("calculateLinePostAssyQty", () => {
  test("no festoons + energy chain + central post → 8", () => {
    const config = withEnergyChain({ hp_lance_qty: 0, det_lance_qty: 0 });
    expect(calculateLinePostAssyQty(config)).toBe(8);
  });

  test("no festoons + energy chain + no central post (L150) → 9", () => {
    const config = withEnergyChainNoCentralPost({
      hp_lance_qty: 0,
      det_lance_qty: 0,
    });
    expect(calculateLinePostAssyQty(config)).toBe(9);
  });

  test("first bay + energy chain + central post → 17", () => {
    const config = withEnergyChain({ is_first_bay: true });
    expect(calculateLinePostAssyQty(config)).toBe(17);
  });

  test("first bay + energy chain + no central post (L150) → 18", () => {
    const config = withEnergyChainNoCentralPost({ is_first_bay: true });
    expect(calculateLinePostAssyQty(config)).toBe(18);
  });

  test("first bay + no energy chain → 16", () => {
    const config = makeConfig({ is_first_bay: true });
    expect(calculateLinePostAssyQty(config)).toBe(16);
  });

  test("not first bay + energy chain + central post → 9", () => {
    const config = withEnergyChain({ is_first_bay: false });
    expect(calculateLinePostAssyQty(config)).toBe(9);
  });

  test("not first bay + energy chain + no central post (L150) → 10", () => {
    const config = withEnergyChainNoCentralPost({ is_first_bay: false });
    expect(calculateLinePostAssyQty(config)).toBe(10);
  });

  test("default: not first bay + no energy chain + has festoons → 8", () => {
    const config = makeConfig({ is_first_bay: false }); // has 2 lances (from base)
    expect(calculateLinePostAssyQty(config)).toBe(8);
  });
});

describe("calculateLinePostAssyQtyWithPanels", () => {
  test("first bay + energy chain + central post → 19", () => {
    const config = withEnergyChain({ is_first_bay: true });
    expect(calculateLinePostAssyQtyWithPanels(config)).toBe(19);
  });

  test("first bay + any other config → 20", () => {
    const config = makeConfig({ is_first_bay: true });
    expect(calculateLinePostAssyQtyWithPanels(config)).toBe(20);
  });

  test("not first bay + energy chain + central post → 9", () => {
    const config = withEnergyChain({ is_first_bay: false });
    expect(calculateLinePostAssyQtyWithPanels(config)).toBe(9);
  });

  test("default: not first bay + anything else → 10", () => {
    const config = makeConfig({ is_first_bay: false });
    expect(calculateLinePostAssyQtyWithPanels(config)).toBe(10);
  });
});

describe("calculateSidePanelQty", () => {
  test("not first bay + central post → 0", () => {
    const config = withEnergyChain({ is_first_bay: false });
    expect(calculateSidePanelQty(config)).toBe(0);
  });

  test("first bay + central post → 1", () => {
    const config = withEnergyChain({ is_first_bay: true });
    expect(calculateSidePanelQty(config)).toBe(1);
  });

  test("not first bay + no central post → 1", () => {
    const config = makeConfig({ is_first_bay: false });
    expect(calculateSidePanelQty(config)).toBe(1);
  });

  test("first bay + no central post → 2 (default)", () => {
    const config = makeConfig({ is_first_bay: true });
    expect(calculateSidePanelQty(config)).toBe(2);
  });
});

// Helper: filter washBayBOM for a given config, return matching items
function filterBOM(config: WashBayConfig) {
  return washBayBOM
    .filter((item) => item.conditions.every((fn) => fn(config)))
    .map((item) => ({
      pn: item.pn,
      qty: typeof item.qty === "function" ? item.qty(config) : item.qty,
      _description: item._description,
    }));
}

describe("Energy chain hoses & cables BOM", () => {
  test("power cable is always included when energy chain is active", () => {
    const config = withEnergyChain();
    const items = filterBOM(config);
    const powerCable = items.find((i) =>
      i._description.includes("Power cable"),
    );
    expect(powerCable).toBeDefined();
    expect(powerCable?.qty).toBe(1);
  });

  test("no energy chain items when supply_type is not ENERGY_CHAIN", () => {
    const config = makeConfig({ has_gantry: true });
    const items = filterBOM(config);
    const ecItems = items.filter((i) =>
      i._description.includes("energy chain"),
    );
    expect(ecItems).toHaveLength(0);
  });

  test("profinet cable LEFT variant when supply_side is LEFT", () => {
    const config = withEnergyChain({
      ec_profinet_cable_qty: 1,
      supply_side: "LEFT",
    });
    const items = filterBOM(config);
    const profinet = items.filter((i) =>
      i._description.includes("Profinet cable"),
    );
    expect(profinet).toHaveLength(1);
    expect(profinet[0]._description).toContain("left");
    expect(profinet[0].qty).toBe(1);
  });

  test("profinet cable RIGHT variant when supply_side is RIGHT", () => {
    const config = withEnergyChain({
      ec_profinet_cable_qty: 1,
      supply_side: "RIGHT",
    });
    const items = filterBOM(config);
    const profinet = items.filter((i) =>
      i._description.includes("Profinet cable"),
    );
    expect(profinet).toHaveLength(1);
    expect(profinet[0]._description).toContain("right");
  });

  test("no profinet cable when qty is 0", () => {
    const config = withEnergyChain({ ec_profinet_cable_qty: 0 });
    const items = filterBOM(config);
    const profinet = items.filter((i) =>
      i._description.includes("Profinet cable"),
    );
    expect(profinet).toHaveLength(0);
  });

  test("signal cable qty matches field value", () => {
    const config = withEnergyChain({ ec_signal_cable_qty: 2 });
    const items = filterBOM(config);
    const signal = items.find((i) => i._description.includes("Signal cable"));
    expect(signal).toBeDefined();
    expect(signal?.qty).toBe(2);
  });

  test("tube quantities match field values", () => {
    const config = withEnergyChain({
      ec_water_1_tube_qty: 2,
      ec_water_34_tube_qty: 1,
      ec_air_tube_qty: 1,
      ec_r1_1_tube_qty: 2,
      ec_r2_1_tube_qty: 1,
      ec_r2_34_inox_tube_qty: 3,
    });
    const items = filterBOM(config);

    expect(
      items.find((i) => i._description.includes('Water tube 1"'))?.qty,
    ).toBe(2);
    expect(
      items.find((i) => i._description.includes('Water tube 3/4"'))?.qty,
    ).toBe(1);
    expect(items.find((i) => i._description.includes("Air tube"))?.qty).toBe(1);
    expect(items.find((i) => i._description.includes('R1 tube 1"'))?.qty).toBe(
      2,
    );
    expect(items.find((i) => i._description.includes('R2 tube 1"'))?.qty).toBe(
      1,
    );
    expect(items.find((i) => i._description.includes("R2 tube 3/4"))?.qty).toBe(
      3,
    );
  });

  test("tubes with qty 0 or null are excluded", () => {
    const config = withEnergyChain({
      ec_water_34_tube_qty: 0,
      ec_air_tube_qty: null,
      ec_r1_1_tube_qty: null,
    });
    const items = filterBOM(config);
    expect(
      items.find((i) => i._description.includes('Water tube 3/4"')),
    ).toBeUndefined();
    expect(
      items.find((i) => i._description.includes("Air tube")),
    ).toBeUndefined();
    expect(
      items.find((i) => i._description.includes('R1 tube 1"')),
    ).toBeUndefined();
  });
});

describe("Hose reel BOM rules", () => {
  test("HP with post: emits correct pn and qty when > 0", () => {
    const config = makeConfig({ hose_reel_hp_with_post_qty: 2 });
    const items = filterBOM(config);
    const item = items.find((i) => i._description === "Hose reel HP with post");
    expect(item).toBeDefined();
    expect(item?.qty).toBe(2);
  });

  test("HP without post: emits correct pn and qty when > 0", () => {
    const config = makeConfig({ hose_reel_hp_without_post_qty: 1 });
    const items = filterBOM(config);
    const item = items.find(
      (i) => i._description === "Hose reel HP without post",
    );
    expect(item).toBeDefined();
    expect(item?.qty).toBe(1);
  });

  test("Detergent with post: emits correct pn and qty when > 0", () => {
    const config = makeConfig({ hose_reel_det_with_post_qty: 2 });
    const items = filterBOM(config);
    const item = items.find(
      (i) => i._description === "Hose reel detergent with post",
    );
    expect(item).toBeDefined();
    expect(item?.qty).toBe(2);
  });

  test("Detergent without post: emits correct pn and qty when > 0", () => {
    const config = makeConfig({ hose_reel_det_without_post_qty: 1 });
    const items = filterBOM(config);
    const item = items.find(
      (i) => i._description === "Hose reel detergent without post",
    );
    expect(item).toBeDefined();
    expect(item?.qty).toBe(1);
  });

  test("HP+Det with post: emits correct pn and qty when > 0", () => {
    const config = makeConfig({ hose_reel_hp_det_with_post_qty: 2 });
    const items = filterBOM(config);
    const item = items.find(
      (i) => i._description === "Hose reel HP+detergent with post",
    );
    expect(item).toBeDefined();
    expect(item?.qty).toBe(2);
  });

  test("all hose reel fields at 0 → no hose reel items emitted", () => {
    const config = makeConfig();
    const items = filterBOM(config);
    const hoseReelItems = items.filter((i) =>
      i._description.startsWith("Hose reel"),
    );
    expect(hoseReelItems).toHaveLength(0);
  });
});

describe("HP lance BOM formula (includes trolley + hose reels)", () => {
  test("hp_lance_qty=2, no reels → HP_LANCE_ASSY qty=2", () => {
    const config = makeConfig({ hp_lance_qty: 2 });
    const items = filterBOM(config);
    const item = items.find((i) => i._description === "HP lance assembly");
    expect(item?.qty).toBe(2);
  });

  test("hp_lance_qty=0, hose_reel_hp_with_post=1 → HP_LANCE_ASSY qty=1", () => {
    const config = makeConfig({
      hp_lance_qty: 0,
      hose_reel_hp_with_post_qty: 1,
    });
    const items = filterBOM(config);
    const item = items.find((i) => i._description === "HP lance assembly");
    expect(item?.qty).toBe(1);
  });

  test("hp_lance_qty=2, hose_reel_hp_without_post=1 → HP_LANCE_ASSY qty=3", () => {
    const config = makeConfig({
      hp_lance_qty: 2,
      hose_reel_hp_without_post_qty: 1,
    });
    const items = filterBOM(config);
    const item = items.find((i) => i._description === "HP lance assembly");
    expect(item?.qty).toBe(3);
  });

  test("combo reel contributes 1 HP lance → HP_LANCE_ASSY qty increments", () => {
    const config = makeConfig({
      hp_lance_qty: 0,
      hose_reel_hp_det_with_post_qty: 1,
    });
    const items = filterBOM(config);
    const item = items.find((i) => i._description === "HP lance assembly");
    expect(item?.qty).toBe(1);
  });

  test("all HP sources zero → HP_LANCE_ASSY absent", () => {
    const config = makeConfig({ hp_lance_qty: 0 });
    const items = filterBOM(config);
    expect(
      items.find((i) => i._description === "HP lance assembly"),
    ).toBeUndefined();
  });
});

describe("Detergent lance BOM formula (includes trolley + hose reels)", () => {
  test("det_lance_qty=2, no reels → DETERGENT_LANCE_ASSY qty=2", () => {
    const config = makeConfig({ hp_lance_qty: 0, det_lance_qty: 2 });
    const items = filterBOM(config);
    const item = items.find(
      (i) => i._description === "Detergent lance assembly",
    );
    expect(item?.qty).toBe(2);
  });

  test("det_lance_qty=0, hose_reel_det_with_post=2 → DETERGENT_LANCE_ASSY qty=2", () => {
    const config = makeConfig({
      hp_lance_qty: 0,
      det_lance_qty: 0,
      hose_reel_det_with_post_qty: 2,
    });
    const items = filterBOM(config);
    const item = items.find(
      (i) => i._description === "Detergent lance assembly",
    );
    expect(item?.qty).toBe(2);
  });

  test("combo reel contributes 1 det lance → DETERGENT_LANCE_ASSY qty increments", () => {
    const config = makeConfig({
      hp_lance_qty: 0,
      det_lance_qty: 0,
      hose_reel_hp_det_with_post_qty: 1,
    });
    const items = filterBOM(config);
    const item = items.find(
      (i) => i._description === "Detergent lance assembly",
    );
    expect(item?.qty).toBe(1);
  });

  test("all det sources zero → DETERGENT_LANCE_ASSY absent", () => {
    const config = makeConfig({ hp_lance_qty: 2, det_lance_qty: 0 });
    const items = filterBOM(config);
    expect(
      items.find((i) => i._description === "Detergent lance assembly"),
    ).toBeUndefined();
  });
});

describe("Weeping HP lances BOM swap", () => {
  test("has_weeping_lances=true → HP_WEEPING_LANCE_ASSY with same qty, HP_LANCE_ASSY absent", () => {
    const config = makeConfig({ hp_lance_qty: 2, has_weeping_lances: true });
    const items = filterBOM(config);
    expect(
      items.find((i) => i._description === "HP lance assembly"),
    ).toBeUndefined();
    const weeping = items.find(
      (i) => i._description === "HP weeping lance assembly",
    );
    expect(weeping).toBeDefined();
    expect(weeping?.qty).toBe(2);
  });

  test("has_weeping_lances=true with hose reels → weeping qty includes all HP sources", () => {
    const config = makeConfig({
      hp_lance_qty: 2,
      hose_reel_hp_with_post_qty: 1,
      hose_reel_hp_det_with_post_qty: 1,
      has_weeping_lances: true,
    });
    const items = filterBOM(config);
    const weeping = items.find(
      (i) => i._description === "HP weeping lance assembly",
    );
    expect(weeping?.qty).toBe(4); // 2 + 1 + 1
  });

  test("has_weeping_lances=false → HP_LANCE_ASSY present, HP_WEEPING_LANCE_ASSY absent", () => {
    const config = makeConfig({ hp_lance_qty: 2, has_weeping_lances: false });
    const items = filterBOM(config);
    expect(
      items.find((i) => i._description === "HP lance assembly"),
    ).toBeDefined();
    expect(
      items.find((i) => i._description === "HP weeping lance assembly"),
    ).toBeUndefined();
  });

  test("weeping flag does not affect DETERGENT_LANCE_ASSY", () => {
    const config = makeConfig({
      hp_lance_qty: 2,
      det_lance_qty: 2,
      has_weeping_lances: true,
    });
    const items = filterBOM(config);
    const det = items.find(
      (i) => i._description === "Detergent lance assembly",
    );
    expect(det).toBeDefined();
    expect(det?.qty).toBe(2);
  });
});
