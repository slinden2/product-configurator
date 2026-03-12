import { vi, describe, test, expect } from "vitest";

// Mock @/db to prevent DATABASE_URL check on module load
vi.mock("@/db", () => ({ db: { query: { partNumbers: { findMany: vi.fn().mockResolvedValue([]) } } } }));
vi.mock("@/db/queries", () => ({ getPartNumbersByArray: vi.fn().mockResolvedValue([]) }));

import {
  calculateLinePostAssyQty,
  calculateLinePostAssyQtyWithPanels,
  calculateSidePanelQty,
} from "@/lib/BOM/max-bom/wash-bay-bom";
import type { WashBay } from "@/db/schemas";
import type { WithSupplyData } from "@/lib/BOM";

type WashBayConfig = WashBay & WithSupplyData;

// Base config helper — produces a non-first, non-energy-chain bay with 2 lances
function makeConfig(overrides: Partial<WashBayConfig> = {}): WashBayConfig {
  return {
    id: 1,
    hp_lance_qty: 2,
    det_lance_qty: 0,
    hose_reel_qty: 0,
    pressure_washer_type: null,
    pressure_washer_qty: null,
    has_gantry: false,
    energy_chain_width: null,
    has_shelf_extension: false,
    is_first_bay: false,
    has_bay_dividers: false,
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
    const config = withEnergyChainNoCentralPost({ hp_lance_qty: 0, det_lance_qty: 0 });
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
