import { vi, describe, test, expect } from "vitest";

vi.mock("@/db", () => ({ db: { query: { partNumbers: { findMany: vi.fn().mockResolvedValue([]) } } } }));
vi.mock("@/db/queries", () => ({ getPartNumbersByArray: vi.fn().mockResolvedValue([]) }));

import { supplyBOM } from "@/lib/BOM/max-bom/supply-bom";
import type { GeneralBOMConfig } from "@/lib/BOM";

function makeConfig(overrides: Partial<GeneralBOMConfig> = {}): GeneralBOMConfig {
  return {
    id: 1,
    supply_type: "STRAIGHT_SHELF",
    supply_side: "LEFT",
    supply_fixing_type: null,
    water_2_type: null,
    has_15kw_pump: false,
    pump_outlet_1_15kw: null,
    pump_outlet_2_15kw: null,
    has_post_frame: false,
    ...overrides,
  } as GeneralBOMConfig;
}

const pns = (config: GeneralBOMConfig) =>
  supplyBOM
    .filter((item) => item.conditions.every((fn) => fn(config)))
    .map((item) => item.pn);

const PNS = {
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
};

describe("supplyBOM — straight shelf", () => {
  test("supply_type=STRAIGHT_SHELF → straight shelf included", () => {
    expect(pns(makeConfig({ supply_type: "STRAIGHT_SHELF" }))).toContain(PNS.STRAIGHT_SHELF);
  });

  test("supply_type=STRAIGHT_SHELF → no boom or energy chain items", () => {
    const result = pns(makeConfig({ supply_type: "STRAIGHT_SHELF" }));
    expect(result).not.toContain(PNS.BOOM);
    expect(result).not.toContain(PNS.REINFORCED_SHELF_ASSY_L);
  });
});

describe("supplyBOM — boom + post", () => {
  const boomPost = () => makeConfig({ supply_type: "BOOM", supply_fixing_type: "POST" });

  test("BOOM + POST + no double water + no 15kw → supply pole 1 water + boom + anchor kit", () => {
    const result = pns(boomPost());
    expect(result).toContain(PNS.SUPPLY_POLE_1_WATER);
    expect(result).toContain(PNS.BOOM);
    expect(result).toContain(PNS.ANCHOR_KIT);
    expect(result).not.toContain(PNS.FRAME_AND_COVER);
  });

  test("BOOM + POST + double water + no 15kw → supply pole 2 waters", () => {
    const result = pns(boomPost());
    const withDouble = makeConfig({
      supply_type: "BOOM",
      supply_fixing_type: "POST",
      water_2_type: "RECYCLED",
    });
    expect(pns(withDouble)).toContain(PNS.SUPPLY_POLE_2_WATER);
    expect(pns(withDouble)).not.toContain(PNS.SUPPLY_POLE_1_WATER);
  });

  test("BOOM + POST + no double water + 15kw pump (non-chassis outlet) → supply pole 1 water HP + boom HP", () => {
    const config = makeConfig({
      supply_type: "BOOM",
      supply_fixing_type: "POST",
      has_15kw_pump: true,
      pump_outlet_1_15kw: "LOW_SPINNERS",
    });
    const result = pns(config);
    expect(result).toContain(PNS.SUPPLY_POLE_1_WATER_HP);
    expect(result).toContain(PNS.BOOM_HP);
    expect(result).not.toContain(PNS.SUPPLY_POLE_1_WATER);
    expect(result).not.toContain(PNS.BOOM);
  });

  test("BOOM + POST + double water + 15kw pump → supply pole 2 waters HP", () => {
    const config = makeConfig({
      supply_type: "BOOM",
      supply_fixing_type: "POST",
      water_2_type: "RECYCLED",
      has_15kw_pump: true,
      pump_outlet_1_15kw: "LOW_SPINNERS",
    });
    expect(pns(config)).toContain(PNS.SUPPLY_POLE_2_WATER_HP);
  });

  test("BOOM + POST + has_post_frame → frame and cover (no anchor kit)", () => {
    const config = makeConfig({
      supply_type: "BOOM",
      supply_fixing_type: "POST",
      has_post_frame: true,
    });
    const result = pns(config);
    expect(result).toContain(PNS.FRAME_AND_COVER);
    expect(result).not.toContain(PNS.ANCHOR_KIT);
  });
});

describe("supplyBOM — boom + wall", () => {
  test("BOOM + WALL + no double water + no 15kw → wall shelf 1 water", () => {
    const config = makeConfig({ supply_type: "BOOM", supply_fixing_type: "WALL" });
    expect(pns(config)).toContain(PNS.WALL_SHELF_1_WATER);
  });

  test("BOOM + WALL + double water + no 15kw → wall shelf 2 waters", () => {
    const config = makeConfig({
      supply_type: "BOOM",
      supply_fixing_type: "WALL",
      water_2_type: "RECYCLED",
    });
    expect(pns(config)).toContain(PNS.WALL_SHELF_2_WATER);
    expect(pns(config)).not.toContain(PNS.WALL_SHELF_1_WATER);
  });

  test("BOOM + WALL + 15kw pump → wall shelf 1 water HP", () => {
    const config = makeConfig({
      supply_type: "BOOM",
      supply_fixing_type: "WALL",
      has_15kw_pump: true,
      pump_outlet_1_15kw: "LOW_SPINNERS",
    });
    expect(pns(config)).toContain(PNS.WALL_SHELF_1_WATER_HP);
  });

  test("BOOM + WALL → no post-specific items (no anchor kit, no frame)", () => {
    const config = makeConfig({ supply_type: "BOOM", supply_fixing_type: "WALL" });
    const result = pns(config);
    expect(result).not.toContain(PNS.ANCHOR_KIT);
    expect(result).not.toContain(PNS.FRAME_AND_COVER);
  });
});

describe("supplyBOM — energy chain", () => {
  test("ENERGY_CHAIN + LEFT → reinforced shelf L", () => {
    const config = makeConfig({ supply_type: "ENERGY_CHAIN", supply_side: "LEFT" });
    expect(pns(config)).toContain(PNS.REINFORCED_SHELF_ASSY_L);
    expect(pns(config)).not.toContain(PNS.REINFORCED_SHELF_ASSY_R);
  });

  test("ENERGY_CHAIN + RIGHT → reinforced shelf R", () => {
    const config = makeConfig({ supply_type: "ENERGY_CHAIN", supply_side: "RIGHT" });
    expect(pns(config)).toContain(PNS.REINFORCED_SHELF_ASSY_R);
    expect(pns(config)).not.toContain(PNS.REINFORCED_SHELF_ASSY_L);
  });

  test("ENERGY_CHAIN → no boom or straight shelf items", () => {
    const config = makeConfig({ supply_type: "ENERGY_CHAIN", supply_side: "LEFT" });
    const result = pns(config);
    expect(result).not.toContain(PNS.STRAIGHT_SHELF);
    expect(result).not.toContain(PNS.BOOM);
  });
});
