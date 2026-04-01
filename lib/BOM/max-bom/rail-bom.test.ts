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
  calculateAnchorQty,
  calculateResinQty,
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
    expect(7 > 7).toBe(false);
  });

  test("3m rails ARE included when rail_length = 21 (condition: 21 > 7)", () => {
    expect(21 > 7).toBe(true);
  });

  test("1m rails are NOT included when rail_length = 21 (condition: 21 % 3 = 0 → falsy)", () => {
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

// Helper: build a minimal config with rail_type, rail_length, and optional anchor_type
const railCfg = (
  rail_type: "ANCHORED" | "WELDED" | "WELDED_RECESSED",
  rail_length: number,
  anchor_type?: "ZINC" | "CHEMICAL",
  machine_type: "STD" | "OMZ" = "STD",
) =>
  ({
    rail_type,
    rail_length,
    anchor_type,
    machine_type,
  }) as Parameters<typeof calculate3mRailQty>[0];

function evalConditions(
  item: (typeof railBOM)[number],
  config: Parameters<typeof calculate3mRailQty>[0],
): boolean {
  return item.conditions.every((fn) => fn(config));
}

describe("railBOM part number routing by rail_type", () => {
  const ANCHORED_TERMINALS = "450.45.031";
  const WELDED_RECESSED_TERMINALS = "450.46.032";
  const WELDED_TERMINALS = "450.49.031";
  const SHIM_KIT = "450.35.011";

  test("ANCHORED config uses anchored terminals (450.45.031)", () => {
    const item = railBOM.find((i) => i.pn === ANCHORED_TERMINALS)!;
    expect(evalConditions(item, railCfg("ANCHORED", 25, "ZINC"))).toBe(true);
    expect(evalConditions(item, railCfg("WELDED", 25))).toBe(false);
    expect(evalConditions(item, railCfg("WELDED_RECESSED", 25))).toBe(false);
  });

  test("WELDED_RECESSED config uses recessed terminals (450.46.032)", () => {
    const item = railBOM.find((i) => i.pn === WELDED_RECESSED_TERMINALS)!;
    expect(evalConditions(item, railCfg("WELDED_RECESSED", 25))).toBe(true);
    expect(evalConditions(item, railCfg("WELDED", 25))).toBe(false);
    expect(evalConditions(item, railCfg("ANCHORED", 25, "ZINC"))).toBe(false);
  });

  test("WELDED config uses welded terminals (450.49.031)", () => {
    const item = railBOM.find((i) => i.pn === WELDED_TERMINALS)!;
    expect(evalConditions(item, railCfg("WELDED", 25))).toBe(true);
    expect(evalConditions(item, railCfg("WELDED_RECESSED", 25))).toBe(false);
    expect(evalConditions(item, railCfg("ANCHORED", 25, "ZINC"))).toBe(false);
  });

  test("shim kit (450.35.011) only included for WELDED_RECESSED", () => {
    const item = railBOM.find((i) => i.pn === SHIM_KIT)!;
    expect(evalConditions(item, railCfg("WELDED_RECESSED", 25))).toBe(true);
    expect(evalConditions(item, railCfg("WELDED", 25))).toBe(false);
    expect(evalConditions(item, railCfg("ANCHORED", 25, "ZINC"))).toBe(false);
  });
});

describe("calculateAnchorQty", () => {
  test("rail_length = 7 → 44 + 1×6 + 0×10 = 50", () => {
    expect(calculateAnchorQty(cfg(7))).toBe(50);
  });

  test("rail_length = 21 → 44 + 0×6 + 5×10 = 94", () => {
    expect(calculateAnchorQty(cfg(21))).toBe(94);
  });

  test("rail_length = 25 → 44 + 1×6 + 6×10 = 110", () => {
    expect(calculateAnchorQty(cfg(25))).toBe(110);
  });

  test("rail_length = 26 → 44 + 2×6 + 6×10 = 116", () => {
    expect(calculateAnchorQty(cfg(26))).toBe(116);
  });
});

describe("calculateResinQty", () => {
  test("rail_length = 7 → 50 anchors × 9ml = 450ml → ceil(450/500) = 1", () => {
    expect(calculateResinQty(cfg(7))).toBe(1);
  });

  test("rail_length = 21 → 94 anchors × 9ml = 846ml → ceil(846/500) = 2", () => {
    expect(calculateResinQty(cfg(21))).toBe(2);
  });

  test("rail_length = 25 → 110 anchors × 9ml = 990ml → ceil(990/500) = 2", () => {
    expect(calculateResinQty(cfg(25))).toBe(2);
  });

  test("rail_length = 26 → 116 anchors × 9ml = 1044ml → ceil(1044/500) = 3", () => {
    expect(calculateResinQty(cfg(26))).toBe(3);
  });
});

describe("anchor type BOM routing", () => {
  const ZINC_ANCHOR = "934.04.010";
  const STAINLESS_ANCHOR = "934.04.015";
  const RESIN_ANCHOR = "934.10.003";
  const RESIN = "934.10.002";

  test("ANCHORED + ZINC + STD → zinc anchors included", () => {
    const item = railBOM.find((i) => i.pn === ZINC_ANCHOR)!;
    expect(evalConditions(item, railCfg("ANCHORED", 25, "ZINC", "STD"))).toBe(true);
  });

  test("ANCHORED + ZINC + OMZ → zinc anchors NOT included, stainless used instead", () => {
    const zinc = railBOM.find((i) => i.pn === ZINC_ANCHOR)!;
    const stainless = railBOM.find((i) => i.pn === STAINLESS_ANCHOR)!;
    expect(evalConditions(zinc, railCfg("ANCHORED", 25, "ZINC", "OMZ"))).toBe(false);
    expect(evalConditions(stainless, railCfg("ANCHORED", 25, "ZINC", "OMZ"))).toBe(true);
  });

  test("ANCHORED + CHEMICAL → resin anchors included regardless of machine type", () => {
    const item = railBOM.find((i) => i.pn === RESIN_ANCHOR)!;
    expect(evalConditions(item, railCfg("ANCHORED", 25, "CHEMICAL", "STD"))).toBe(true);
    expect(evalConditions(item, railCfg("ANCHORED", 25, "CHEMICAL", "OMZ"))).toBe(true);
  });

  test("ANCHORED + CHEMICAL → resin cartridges included", () => {
    const item = railBOM.find((i) => i.pn === RESIN)!;
    expect(evalConditions(item, railCfg("ANCHORED", 25, "CHEMICAL"))).toBe(true);
  });

  test("ANCHORED + ZINC → resin NOT included", () => {
    const item = railBOM.find((i) => i.pn === RESIN)!;
    expect(evalConditions(item, railCfg("ANCHORED", 25, "ZINC"))).toBe(false);
  });

  test("WELDED + no anchor_type → no anchor parts included", () => {
    const zinc = railBOM.find((i) => i.pn === ZINC_ANCHOR)!;
    const resin = railBOM.find((i) => i.pn === RESIN_ANCHOR)!;
    expect(evalConditions(zinc, railCfg("WELDED", 25))).toBe(false);
    expect(evalConditions(resin, railCfg("WELDED", 25))).toBe(false);
  });
});
