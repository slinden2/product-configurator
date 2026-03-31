import { vi, describe, test, expect } from "vitest";

vi.mock("@/db", () => ({
  db: { query: { partNumbers: { findMany: vi.fn().mockResolvedValue([]) } } },
}));
vi.mock("@/db/queries", () => ({
  getPartNumbersByArray: vi.fn().mockResolvedValue([]),
}));

import { supplyBOM } from "@/lib/BOM/max-bom/supply-bom";
import type { GeneralBOMConfig } from "@/lib/BOM";
import { makeGeneralBOMConfig as makeConfig } from "@/test/bom-test-utils";

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
  EC_POWER_CABLE_LEFT: "450.73.001",
  EC_SIGNAL_CABLE_LEFT: "450.73.002",
  EC_POWER_CABLE_RIGHT: "450.73.003",
  EC_SIGNAL_CABLE_RIGHT: "450.73.004",
  EC_GEN_WATER_TUBE_LEFT: "450.74.001",
  EC_PREWASH_WATER_TUBE_LEFT: "450.74.002",
  EC_AIR_TUBE_HP_VALVE_LEFT: "450.74.003",
  EC_AIR_TUBE_FOAM_LEFT: "450.74.004",
  EC_GEN_WATER_TUBE_RIGHT: "450.74.005",
  EC_PREWASH_WATER_TUBE_RIGHT: "450.74.006",
  EC_AIR_TUBE_HP_VALVE_RIGHT: "450.74.007",
  EC_AIR_TUBE_FOAM_RIGHT: "450.74.008",
};

describe("supplyBOM — straight shelf", () => {
  test("supply_type=STRAIGHT_SHELF → straight shelf included", () => {
    expect(pns(makeConfig({ supply_type: "STRAIGHT_SHELF" }))).toContain(
      PNS.STRAIGHT_SHELF,
    );
  });

  test("supply_type=STRAIGHT_SHELF → no boom or energy chain items", () => {
    const result = pns(makeConfig({ supply_type: "STRAIGHT_SHELF" }));
    expect(result).not.toContain(PNS.BOOM);
    expect(result).not.toContain(PNS.REINFORCED_SHELF_ASSY_L);
  });
});

describe("supplyBOM — boom + post", () => {
  const boomPost = () =>
    makeConfig({ supply_type: "BOOM", supply_fixing_type: "POST" });

  test("BOOM + POST + no double water + no 15kw → supply pole 1 water + boom + anchor kit", () => {
    const result = pns(boomPost());
    expect(result).toContain(PNS.SUPPLY_POLE_1_WATER);
    expect(result).toContain(PNS.BOOM);
    expect(result).toContain(PNS.ANCHOR_KIT);
    expect(result).not.toContain(PNS.FRAME_AND_COVER);
  });

  test("BOOM + POST + double water + no 15kw → supply pole 2 waters", () => {
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
    const config = makeConfig({
      supply_type: "BOOM",
      supply_fixing_type: "WALL",
    });
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
    const config = makeConfig({
      supply_type: "BOOM",
      supply_fixing_type: "WALL",
    });
    const result = pns(config);
    expect(result).not.toContain(PNS.ANCHOR_KIT);
    expect(result).not.toContain(PNS.FRAME_AND_COVER);
  });
});

describe("supplyBOM — energy chain", () => {
  test("ENERGY_CHAIN + LEFT → reinforced shelf L", () => {
    const config = makeConfig({
      supply_type: "ENERGY_CHAIN",
      supply_side: "LEFT",
    });
    expect(pns(config)).toContain(PNS.REINFORCED_SHELF_ASSY_L);
    expect(pns(config)).not.toContain(PNS.REINFORCED_SHELF_ASSY_R);
  });

  test("ENERGY_CHAIN + RIGHT → reinforced shelf R", () => {
    const config = makeConfig({
      supply_type: "ENERGY_CHAIN",
      supply_side: "RIGHT",
    });
    expect(pns(config)).toContain(PNS.REINFORCED_SHELF_ASSY_R);
    expect(pns(config)).not.toContain(PNS.REINFORCED_SHELF_ASSY_L);
  });

  test("ENERGY_CHAIN → no boom or straight shelf items", () => {
    const config = makeConfig({
      supply_type: "ENERGY_CHAIN",
      supply_side: "LEFT",
    });
    const result = pns(config);
    expect(result).not.toContain(PNS.STRAIGHT_SHELF);
    expect(result).not.toContain(PNS.BOOM);
  });
});

const qty = (config: GeneralBOMConfig, pn: string): number => {
  const item = supplyBOM.find(
    (i) => i.pn === pn && i.conditions.every((fn) => fn(config)),
  );
  if (!item) return 0;
  return typeof item.qty === "function" ? item.qty(config) : item.qty;
};

const ecLeft = (overrides: Partial<GeneralBOMConfig> = {}) =>
  makeConfig({
    supply_type: "ENERGY_CHAIN",
    supply_side: "LEFT",
    ...overrides,
  });

const ecRight = (overrides: Partial<GeneralBOMConfig> = {}) =>
  makeConfig({
    supply_type: "ENERGY_CHAIN",
    supply_side: "RIGHT",
    ...overrides,
  });

describe("supplyBOM — energy chain cables (450.73.xxx)", () => {
  test("ENERGY_CHAIN + LEFT → left power + signal cables included, right excluded", () => {
    const result = pns(ecLeft());
    expect(result).toContain(PNS.EC_POWER_CABLE_LEFT);
    expect(result).toContain(PNS.EC_SIGNAL_CABLE_LEFT);
    expect(result).not.toContain(PNS.EC_POWER_CABLE_RIGHT);
    expect(result).not.toContain(PNS.EC_SIGNAL_CABLE_RIGHT);
  });

  test("ENERGY_CHAIN + RIGHT → right power + signal cables included, left excluded", () => {
    const result = pns(ecRight());
    expect(result).toContain(PNS.EC_POWER_CABLE_RIGHT);
    expect(result).toContain(PNS.EC_SIGNAL_CABLE_RIGHT);
    expect(result).not.toContain(PNS.EC_POWER_CABLE_LEFT);
    expect(result).not.toContain(PNS.EC_SIGNAL_CABLE_LEFT);
  });

  test("ENERGY_CHAIN + touch_pos=INTERNAL + touch_qty=1 → signal cable qty=1", () => {
    const config = ecLeft({ touch_pos: "INTERNAL", touch_qty: 1 });
    expect(qty(config, PNS.EC_SIGNAL_CABLE_LEFT)).toBe(1);
  });

  test("ENERGY_CHAIN + touch_pos=EXTERNAL → signal cable qty=2", () => {
    const config = ecLeft({ touch_pos: "EXTERNAL" });
    expect(qty(config, PNS.EC_SIGNAL_CABLE_LEFT)).toBe(2);
  });

  test("ENERGY_CHAIN + touch_qty=2 → signal cable qty=2", () => {
    const config = ecLeft({ touch_qty: 2 });
    expect(qty(config, PNS.EC_SIGNAL_CABLE_LEFT)).toBe(2);
  });

  test("non-ENERGY_CHAIN → no EC cables", () => {
    const boom = makeConfig({
      supply_type: "BOOM",
      supply_fixing_type: "POST",
    });
    const result = pns(boom);
    expect(result).not.toContain(PNS.EC_POWER_CABLE_LEFT);
    expect(result).not.toContain(PNS.EC_SIGNAL_CABLE_LEFT);
  });
});

describe('supplyBOM — energy chain 1" water tubes (450.74.001 / 450.74.005)', () => {
  test('ENERGY_CHAIN + LEFT → left 1" tube included, right excluded', () => {
    const result = pns(ecLeft());
    expect(result).toContain(PNS.EC_GEN_WATER_TUBE_LEFT);
    expect(result).not.toContain(PNS.EC_GEN_WATER_TUBE_RIGHT);
  });

  test('ENERGY_CHAIN + RIGHT → right 1" tube included', () => {
    expect(pns(ecRight())).toContain(PNS.EC_GEN_WATER_TUBE_RIGHT);
  });

  test('ENERGY_CHAIN + no water_2_type → 1" tube qty=1', () => {
    expect(qty(ecLeft(), PNS.EC_GEN_WATER_TUBE_LEFT)).toBe(1);
  });

  test('ENERGY_CHAIN + water_2_type set → 1" tube qty=2', () => {
    const config = ecLeft({ water_2_type: "RECYCLED" });
    expect(qty(config, PNS.EC_GEN_WATER_TUBE_LEFT)).toBe(2);
  });
});

describe('supplyBOM — energy chain 3/4" water tubes (450.74.002 / 450.74.006)', () => {
  test('ENERGY_CHAIN + has_chemical_pump=false → 3/4" tube not included', () => {
    const config = ecLeft({
      has_chemical_pump: false,
      chemical_pump_pos: "WASH_BAY",
    });
    expect(pns(config)).not.toContain(PNS.EC_PREWASH_WATER_TUBE_LEFT);
  });

  test('ENERGY_CHAIN + has_chemical_pump + chemical_pump_pos=ONBOARD → 3/4" tube not included', () => {
    const config = ecLeft({
      has_chemical_pump: true,
      chemical_pump_pos: "ONBOARD",
    });
    expect(pns(config)).not.toContain(PNS.EC_PREWASH_WATER_TUBE_LEFT);
  });

  test('ENERGY_CHAIN + has_chemical_pump + chemical_pump_pos=WASH_BAY + LEFT → left 3/4" tube included', () => {
    const config = ecLeft({
      has_chemical_pump: true,
      chemical_pump_pos: "WASH_BAY",
      chemical_qty: 1,
    });
    expect(pns(config)).toContain(PNS.EC_PREWASH_WATER_TUBE_LEFT);
    expect(pns(config)).not.toContain(PNS.EC_PREWASH_WATER_TUBE_RIGHT);
  });

  test("ENERGY_CHAIN + has_chemical_pump + chemical_pump_pos=WASH_BAY + chemical_qty=1 → qty=1", () => {
    const config = ecLeft({
      has_chemical_pump: true,
      chemical_pump_pos: "WASH_BAY",
      chemical_qty: 1,
    });
    expect(qty(config, PNS.EC_PREWASH_WATER_TUBE_LEFT)).toBe(1);
  });

  test("ENERGY_CHAIN + has_chemical_pump + chemical_qty=2 + WASH_BAY → qty=2", () => {
    const config = ecLeft({
      has_chemical_pump: true,
      chemical_pump_pos: "WASH_BAY",
      chemical_qty: 2,
    });
    expect(qty(config, PNS.EC_PREWASH_WATER_TUBE_LEFT)).toBe(2);
  });

  test("ENERGY_CHAIN + has_chemical_pump + chemical_qty=1 + WASH_BAY + acid WASH_BAY → qty=2", () => {
    const config = ecLeft({
      has_chemical_pump: true,
      chemical_pump_pos: "WASH_BAY",
      chemical_qty: 1,
      has_acid_pump: true,
      acid_pump_pos: "WASH_BAY",
    });
    expect(qty(config, PNS.EC_PREWASH_WATER_TUBE_LEFT)).toBe(2);
  });

  test("ENERGY_CHAIN + has_chemical_pump + chemical_qty=1 + WASH_BAY + acid ONBOARD → qty=1", () => {
    const config = ecLeft({
      has_chemical_pump: true,
      chemical_pump_pos: "WASH_BAY",
      chemical_qty: 1,
      has_acid_pump: true,
      acid_pump_pos: "ONBOARD",
    });
    expect(qty(config, PNS.EC_PREWASH_WATER_TUBE_LEFT)).toBe(1);
  });
});

describe("supplyBOM — energy chain air tubes to HP valve (450.74.003 / 450.74.007)", () => {
  test("ENERGY_CHAIN + LEFT + has_omz_pump + pump_outlet_omz=HP_ROOF_BAR_SPINNERS → left air HP tube", () => {
    const config = ecLeft({
      has_omz_pump: true,
      pump_outlet_omz: "HP_ROOF_BAR_SPINNERS",
    });
    expect(pns(config)).toContain(PNS.EC_AIR_TUBE_HP_VALVE_LEFT);
    expect(pns(config)).not.toContain(PNS.EC_AIR_TUBE_HP_VALVE_RIGHT);
  });

  test("ENERGY_CHAIN + LEFT + machine_type=OMZ → left air HP tube included", () => {
    const config = ecLeft({ machine_type: "OMZ" });
    expect(pns(config)).toContain(PNS.EC_AIR_TUBE_HP_VALVE_LEFT);
    expect(pns(config)).not.toContain(PNS.EC_AIR_TUBE_HP_VALVE_RIGHT);
  });

  test("ENERGY_CHAIN + RIGHT + machine_type=OMZ → right air HP tube included", () => {
    const config = ecRight({ machine_type: "OMZ" });
    expect(pns(config)).toContain(PNS.EC_AIR_TUBE_HP_VALVE_RIGHT);
    expect(pns(config)).not.toContain(PNS.EC_AIR_TUBE_HP_VALVE_LEFT);
  });

  test("ENERGY_CHAIN + has_omz_pump + pump_outlet_omz=SPINNERS + machine_type != OMZ → not included", () => {
    const config = ecLeft({ has_omz_pump: true, pump_outlet_omz: "SPINNERS" });
    expect(pns(config)).not.toContain(PNS.EC_AIR_TUBE_HP_VALVE_LEFT);
  });

  test("ENERGY_CHAIN + has_omz_pump=false + no OMZ machine → not included", () => {
    expect(pns(ecLeft())).not.toContain(PNS.EC_AIR_TUBE_HP_VALVE_LEFT);
  });
});

describe("supplyBOM — energy chain air tubes to chemical bay (450.74.004 / 450.74.008)", () => {
  test("ENERGY_CHAIN + LEFT + has_foam → left foam air tube included", () => {
    const config = ecLeft({ has_foam: true });
    expect(pns(config)).toContain(PNS.EC_AIR_TUBE_FOAM_LEFT);
    expect(pns(config)).not.toContain(PNS.EC_AIR_TUBE_FOAM_RIGHT);
  });

  test("ENERGY_CHAIN + RIGHT + has_foam → right foam air tube included", () => {
    const config = ecRight({ has_foam: true });
    expect(pns(config)).toContain(PNS.EC_AIR_TUBE_FOAM_RIGHT);
    expect(pns(config)).not.toContain(PNS.EC_AIR_TUBE_FOAM_LEFT);
  });

  test("ENERGY_CHAIN + has_foam=false → not included", () => {
    expect(pns(ecLeft())).not.toContain(PNS.EC_AIR_TUBE_FOAM_LEFT);
  });
});
