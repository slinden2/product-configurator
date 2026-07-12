// @vitest-environment node
import { beforeEach, describe, expect, test, vi } from "vitest";

// --- Mocks ---

const mockGetPriceCoefficientsByArray = vi.fn();

vi.mock("@/db/queries", () => ({
  getPriceCoefficientsByArray: (...args: unknown[]) =>
    mockGetPriceCoefficientsByArray(...args),
}));

import { isTodoPn } from "@/lib/BOM/max-bom/conditions";
import {
  collectMaxBomPns,
  computeLinePrice,
  computeMaxBomCoefficientDiff,
  DEFAULT_COEFFICIENT,
  enrichWithPrices,
} from "@/lib/pricing";

describe("DEFAULT_COEFFICIENT", () => {
  test("is 3.0", () => {
    expect(DEFAULT_COEFFICIENT).toBe(3.0);
  });
});

describe("computeLinePrice", () => {
  test("multiplies cost × coefficient × qty", () => {
    expect(computeLinePrice(100, 3, 2)).toBe(600);
  });

  test("returns 0 when cost is 0", () => {
    expect(computeLinePrice(0, 3, 5)).toBe(0);
  });

  test("handles fractional coefficient", () => {
    expect(computeLinePrice(200, 1.5, 1)).toBe(300);
  });
});

describe("collectMaxBomPns", () => {
  test("returns a non-empty array of strings", () => {
    const pns = collectMaxBomPns();
    expect(pns.length).toBeGreaterThan(0);
    expect(pns.every((p) => typeof p === "string")).toBe(true);
  });

  test("returns no duplicates", () => {
    const pns = collectMaxBomPns();
    expect(pns.length).toBe(new Set(pns).size);
  });

  test("is stable across calls", () => {
    expect(collectMaxBomPns()).toEqual(collectMaxBomPns());
  });

  test("excludes TODO_PN placeholders", () => {
    const pns = collectMaxBomPns();
    expect(pns.every((p) => !isTodoPn(p))).toBe(true);
  });
});

describe("computeMaxBomCoefficientDiff", () => {
  test("reports every MaxBOM PN as missing when there are no rows", () => {
    const { missing, orphans } = computeMaxBomCoefficientDiff(
      [],
      collectMaxBomPns(),
    );
    expect(missing).toEqual(collectMaxBomPns());
    expect(orphans).toEqual([]);
  });

  test("reports nothing when every MaxBOM PN has a row", () => {
    const rows = collectMaxBomPns().map((pn) => ({
      pn,
      source: "MAXBOM" as const,
    }));
    const { missing, orphans } = computeMaxBomCoefficientDiff(
      rows,
      collectMaxBomPns(),
    );
    expect(missing).toEqual([]);
    expect(orphans).toEqual([]);
  });

  test("flags MAXBOM rows for retired PNs as orphans, but not MANUAL rows", () => {
    const rows = [
      { pn: "RETIRED.PN.1", source: "MAXBOM" as const },
      { pn: "MANUAL.PN.1", source: "MANUAL" as const },
    ];
    const { missing, orphans } = computeMaxBomCoefficientDiff(
      rows,
      collectMaxBomPns(),
    );
    expect(orphans).toEqual(["RETIRED.PN.1"]);
    expect(missing).toEqual(collectMaxBomPns());
  });

  test("rows without a source never count as orphans", () => {
    const { orphans } = computeMaxBomCoefficientDiff(
      [{ pn: "RETIRED.PN.1" }],
      collectMaxBomPns(),
    );
    expect(orphans).toEqual([]);
  });
});

describe("enrichWithPrices", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("uses coefficient from DB when row exists", async () => {
    mockGetPriceCoefficientsByArray.mockResolvedValue([
      { pn: "ITC-001", coefficient: "2.00" },
    ]);

    const result = await enrichWithPrices([
      { pn: "ITC-001", qty: 2, cost: 100 },
    ]);

    expect(result[0].coefficient).toBe(2);
    expect(result[0].list_price).toBe(400); // 100 * 2 * 2
  });

  test("falls back to DEFAULT_COEFFICIENT for missing PNs", async () => {
    mockGetPriceCoefficientsByArray.mockResolvedValue([]);

    const result = await enrichWithPrices([
      { pn: "ITC-MISSING", qty: 1, cost: 50 },
    ]);

    expect(result[0].coefficient).toBe(DEFAULT_COEFFICIENT);
    expect(result[0].list_price).toBe(50 * DEFAULT_COEFFICIENT * 1);
  });

  test("handles empty input without DB call", async () => {
    const result = await enrichWithPrices([]);
    expect(result).toEqual([]);
    expect(mockGetPriceCoefficientsByArray).not.toHaveBeenCalled();
  });

  test("passes through all original fields", async () => {
    mockGetPriceCoefficientsByArray.mockResolvedValue([
      { pn: "ITC-A", coefficient: "1.50" },
    ]);

    const item = { pn: "ITC-A", qty: 3, cost: 10, description: "Test part" };
    const result = await enrichWithPrices([item]);

    expect(result[0].description).toBe("Test part");
    expect(result[0].list_price).toBe(45); // 10 * 1.5 * 3
  });
});
