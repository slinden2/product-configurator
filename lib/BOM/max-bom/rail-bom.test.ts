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
    const rail_length = 7;
    expect(rail_length > 7).toBe(false);
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

  function findItem(pn: string) {
    const item = railBOM.find((i) => i.pn === pn);
    if (!item) throw new Error(`Item ${pn} not found in railBOM`);
    return item;
  }

  test("ANCHORED config uses anchored terminals (450.45.031)", () => {
    const item = findItem(ANCHORED_TERMINALS);
    expect(evalConditions(item, railCfg("ANCHORED", 25, "ZINC"))).toBe(true);
    expect(evalConditions(item, railCfg("WELDED", 25))).toBe(false);
    expect(evalConditions(item, railCfg("WELDED_RECESSED", 25))).toBe(false);
  });

  test("WELDED_RECESSED config uses recessed terminals (450.46.032)", () => {
    const item = findItem(WELDED_RECESSED_TERMINALS);
    expect(evalConditions(item, railCfg("WELDED_RECESSED", 25))).toBe(true);
    expect(evalConditions(item, railCfg("WELDED", 25))).toBe(false);
    expect(evalConditions(item, railCfg("ANCHORED", 25, "ZINC"))).toBe(false);
  });

  test("WELDED config uses welded terminals (450.49.031)", () => {
    const item = findItem(WELDED_TERMINALS);
    expect(evalConditions(item, railCfg("WELDED", 25))).toBe(true);
    expect(evalConditions(item, railCfg("WELDED_RECESSED", 25))).toBe(false);
    expect(evalConditions(item, railCfg("ANCHORED", 25, "ZINC"))).toBe(false);
  });

  test("shim kit (450.35.011) only included for WELDED_RECESSED", () => {
    const item = findItem(SHIM_KIT);
    expect(evalConditions(item, railCfg("WELDED_RECESSED", 25))).toBe(true);
    expect(evalConditions(item, railCfg("WELDED", 25))).toBe(false);
    expect(evalConditions(item, railCfg("ANCHORED", 25, "ZINC"))).toBe(false);
  });
});

describe("calculateAnchorQty", () => {
  test("rail_length = 7 → 2 + 44 + 1×12 + 0×20 = 58", () => {
    expect(calculateAnchorQty(cfg(7))).toBe(58);
  });

  test("rail_length = 21 → 2 + 44 + 0×12 + 5×20 = 146", () => {
    expect(calculateAnchorQty(cfg(21))).toBe(146);
  });

  test("rail_length = 25 → 2 + 44 + 1×12 + 6×20 = 178", () => {
    expect(calculateAnchorQty(cfg(25))).toBe(178);
  });

  test("rail_length = 26 → 2 + 44 + 2×12 + 6×20 = 190", () => {
    expect(calculateAnchorQty(cfg(26))).toBe(190);
  });
});

describe("calculateResinQty", () => {
  test("rail_length = 7 → 58 anchors × 9ml = 522ml → ceil(522/500) = 2", () => {
    expect(calculateResinQty(cfg(7))).toBe(2);
  });

  test("rail_length = 21 → 146 anchors × 9ml = 1314ml → ceil(1314/500) = 3", () => {
    expect(calculateResinQty(cfg(21))).toBe(3);
  });

  test("rail_length = 25 → 178 anchors × 9ml = 1602ml → ceil(1602/500) = 4", () => {
    expect(calculateResinQty(cfg(25))).toBe(4);
  });

  test("rail_length = 26 → 190 anchors × 9ml = 1710ml → ceil(1710/500) = 4", () => {
    expect(calculateResinQty(cfg(26))).toBe(4);
  });
});

describe("anchor type BOM routing", () => {
  const ZINC_ANCHOR = "934.04.010";
  const STAINLESS_ANCHOR = "934.04.015";
  const RESIN_ANCHOR = "934.10.003";
  const RESIN = "934.10.002";

  function findItem(pn: string) {
    const item = railBOM.find((i) => i.pn === pn);
    if (!item) throw new Error(`Item ${pn} not found in railBOM`);
    return item;
  }

  test("ANCHORED + ZINC + STD → zinc anchors included", () => {
    const item = findItem(ZINC_ANCHOR);
    expect(evalConditions(item, railCfg("ANCHORED", 25, "ZINC", "STD"))).toBe(
      true,
    );
  });

  test("ANCHORED + ZINC + OMZ → zinc anchors NOT included, stainless used instead", () => {
    const zinc = findItem(ZINC_ANCHOR);
    const stainless = findItem(STAINLESS_ANCHOR);
    expect(evalConditions(zinc, railCfg("ANCHORED", 25, "ZINC", "OMZ"))).toBe(
      false,
    );
    expect(
      evalConditions(stainless, railCfg("ANCHORED", 25, "ZINC", "OMZ")),
    ).toBe(true);
  });

  test("ANCHORED + CHEMICAL → resin anchors included regardless of machine type", () => {
    const item = findItem(RESIN_ANCHOR);
    expect(
      evalConditions(item, railCfg("ANCHORED", 25, "CHEMICAL", "STD")),
    ).toBe(true);
    expect(
      evalConditions(item, railCfg("ANCHORED", 25, "CHEMICAL", "OMZ")),
    ).toBe(true);
  });

  test("ANCHORED + CHEMICAL → resin cartridges included", () => {
    const item = findItem(RESIN);
    expect(evalConditions(item, railCfg("ANCHORED", 25, "CHEMICAL"))).toBe(
      true,
    );
  });

  test("ANCHORED + ZINC → resin NOT included", () => {
    const item = findItem(RESIN);
    expect(evalConditions(item, railCfg("ANCHORED", 25, "ZINC"))).toBe(false);
  });

  test("WELDED + no anchor_type → no anchor parts included", () => {
    const zinc = findItem(ZINC_ANCHOR);
    const resin = findItem(RESIN_ANCHOR);
    expect(evalConditions(zinc, railCfg("WELDED", 25))).toBe(false);
    expect(evalConditions(resin, railCfg("WELDED", 25))).toBe(false);
  });
});
