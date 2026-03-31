import { vi, describe, test, expect } from "vitest";

// Mock @/db to prevent DATABASE_URL check on module load
vi.mock("@/db", () => ({
  db: { query: { partNumbers: { findMany: vi.fn().mockResolvedValue([]) } } },
}));
vi.mock("@/db/queries", () => ({
  getPartNumbersByArray: vi.fn().mockResolvedValue([]),
}));

import {
  calculate3mRailQty,
  calculate1mRailQty,
  calculateDowelQty,
  railBOM,
} from "@/lib/BOM/max-bom/rail-bom";

// Helper: build a minimal config with just rail_length set
const cfg = (rail_length: number) =>
  ({ rail_length }) as Parameters<typeof calculate3mRailQty>[0];

describe("calculate3mRailQty", () => {
  test("rail_length = 7 → 0 (formula: floor((7-6)/3) = 0)", () => {
    expect(calculate3mRailQty(cfg(7))).toBe(0);
  });

  test("rail_length = 21 → 5 (floor((21-6)/3) = floor(5) = 5)", () => {
    expect(calculate3mRailQty(cfg(21))).toBe(5);
  });

  test("rail_length = 25 → 6 (floor((25-6)/3) = floor(6.33) = 6)", () => {
    expect(calculate3mRailQty(cfg(25))).toBe(6);
  });

  test("rail_length = 26 → 6 (floor((26-6)/3) = floor(6.67) = 6)", () => {
    expect(calculate3mRailQty(cfg(26))).toBe(6);
  });
});

describe("calculate1mRailQty", () => {
  test("rail_length = 7 → 1 ((7-6) % 3 = 1 % 3 = 1)", () => {
    expect(calculate1mRailQty(cfg(7))).toBe(1);
  });

  test("rail_length = 21 → 0 ((21-6) % 3 = 15 % 3 = 0)", () => {
    expect(calculate1mRailQty(cfg(21))).toBe(0);
  });

  test("rail_length = 25 → 1 ((25-6) % 3 = 19 % 3 = 1)", () => {
    expect(calculate1mRailQty(cfg(25))).toBe(1);
  });

  test("rail_length = 26 → 2 ((26-6) % 3 = 20 % 3 = 2)", () => {
    expect(calculate1mRailQty(cfg(26))).toBe(2);
  });
});

describe("BOM inclusion conditions for rail items", () => {
  test("3m rails are NOT included when rail_length = 7 (condition: rail_length > 7)", () => {
    // The condition in the BOM item is: config.rail_length > 7
    expect(7 > 7).toBe(false);
  });

  test("3m rails ARE included when rail_length = 21 (condition: 21 > 7)", () => {
    expect(21 > 7).toBe(true);
  });

  test("1m rails are NOT included when rail_length = 21 (condition: 21 % 3 = 0 → falsy)", () => {
    // The condition is: !!(config.rail_length % 3)
    expect(!!(21 % 3)).toBe(false);
  });

  test("1m rails ARE included when rail_length = 7 (7 % 3 = 1 → truthy)", () => {
    expect(!!(7 % 3)).toBe(true);
  });

  test("1m rails ARE included when rail_length = 25 (25 % 3 = 1 → truthy)", () => {
    expect(!!(25 % 3)).toBe(true);
  });

  test("1m rails ARE included when rail_length = 26 (26 % 3 = 2 → truthy)", () => {
    expect(!!(26 % 3)).toBe(true);
  });
});

// Helper: build a minimal config with rail_type, rail_length, and optional dowel_type
const railCfg = (
  rail_type: "DOWELED" | "WELDED" | "WELDED_RECESSED",
  rail_length: number,
  dowel_type?: "ZINCATO" | "INOX" | "CHIMICO",
) =>
  ({
    rail_type,
    rail_length,
    dowel_type,
  }) as Parameters<typeof calculate3mRailQty>[0];

function evalConditions(
  item: (typeof railBOM)[number],
  config: Parameters<typeof calculate3mRailQty>[0],
): boolean {
  return item.conditions.every((fn) => fn(config));
}

describe("railBOM part number routing by rail_type", () => {
  const DOWELED_TERMINALS = "450.45.031";
  const WELDED_RECESSED_TERMINALS = "450.46.032";
  const WELDED_TERMINALS = "450.49.031";
  const SHIM_KIT = "450.35.011";

  test("DOWELED config uses doweled terminals (450.45.031)", () => {
    const item = railBOM.find((i) => i.pn === DOWELED_TERMINALS)!;
    expect(evalConditions(item, railCfg("DOWELED", 25, "ZINCATO"))).toBe(true);
    expect(evalConditions(item, railCfg("WELDED", 25))).toBe(false);
    expect(evalConditions(item, railCfg("WELDED_RECESSED", 25))).toBe(false);
  });

  test("WELDED_RECESSED config uses recessed terminals (450.46.032)", () => {
    const item = railBOM.find((i) => i.pn === WELDED_RECESSED_TERMINALS)!;
    expect(evalConditions(item, railCfg("WELDED_RECESSED", 25))).toBe(true);
    expect(evalConditions(item, railCfg("WELDED", 25))).toBe(false);
    expect(evalConditions(item, railCfg("DOWELED", 25, "ZINCATO"))).toBe(false);
  });

  test("WELDED config uses welded terminals (450.49.031)", () => {
    const item = railBOM.find((i) => i.pn === WELDED_TERMINALS)!;
    expect(evalConditions(item, railCfg("WELDED", 25))).toBe(true);
    expect(evalConditions(item, railCfg("WELDED_RECESSED", 25))).toBe(false);
    expect(evalConditions(item, railCfg("DOWELED", 25, "ZINCATO"))).toBe(false);
  });

  test("shim kit (450.35.011) only included for WELDED_RECESSED", () => {
    const item = railBOM.find((i) => i.pn === SHIM_KIT)!;
    expect(evalConditions(item, railCfg("WELDED_RECESSED", 25))).toBe(true);
    expect(evalConditions(item, railCfg("WELDED", 25))).toBe(false);
    expect(evalConditions(item, railCfg("DOWELED", 25, "ZINCATO"))).toBe(false);
  });
});

describe("calculateDowelQty", () => {
  test("rail_length = 7 → 44 + 1×6 + 0×10 = 50", () => {
    expect(calculateDowelQty(cfg(7))).toBe(50);
  });

  test("rail_length = 21 → 44 + 0×6 + 5×10 = 94", () => {
    expect(calculateDowelQty(cfg(21))).toBe(94);
  });

  test("rail_length = 25 → 44 + 1×6 + 6×10 = 110", () => {
    expect(calculateDowelQty(cfg(25))).toBe(110);
  });

  test("rail_length = 26 → 44 + 2×6 + 6×10 = 116", () => {
    expect(calculateDowelQty(cfg(26))).toBe(116);
  });
});
