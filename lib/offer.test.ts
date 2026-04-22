// @vitest-environment node
import { beforeEach, describe, expect, test, vi } from "vitest";

// --- Mocks ---

const mockGetPriceCoefficientsByArray = vi.fn();
const mockEnrichWithCosts = vi.fn();
const mockBomBuildCompleteBOM = vi.fn();
const mockBomInit = vi.fn();

vi.mock("@/db/queries", () => ({
  getPriceCoefficientsByArray: (...args: unknown[]) =>
    mockGetPriceCoefficientsByArray(...args),
}));

vi.mock("@/lib/BOM", () => ({
  enrichWithCosts: (...args: unknown[]) => mockEnrichWithCosts(...args),
  BOM: {
    init: (...args: unknown[]) => mockBomInit(...args),
  },
}));

import {
  buildOfferItemsFromEbom,
  buildOfferItemsFromLive,
  computeOfferTotals,
  detectEbomDrift,
  groupItemsForDisplay,
  isOfferStale,
  OFFER_STALENESS_DAYS,
} from "@/lib/offer";

// --- Helpers ---

function makeSnapshot(
  overrides: Partial<{ source: "EBOM" | "LIVE"; generated_at: Date }> = {},
) {
  return {
    source: "EBOM" as const,
    generated_at: new Date(),
    ...overrides,
  };
}

const NOW = new Date();
const OLD = new Date(NOW.getTime() - (OFFER_STALENESS_DAYS + 1) * 86400_000);
const FRESH = new Date(NOW.getTime() - (OFFER_STALENESS_DAYS - 1) * 86400_000);

// --- Tests ---

describe("isOfferStale", () => {
  test("returns false for APPROVED regardless of age", () => {
    expect(isOfferStale({ generated_at: OLD }, "APPROVED")).toBe(false);
  });

  test("returns false for CLOSED regardless of age", () => {
    expect(isOfferStale({ generated_at: OLD }, "CLOSED")).toBe(false);
  });

  test("returns true when DRAFT and older than threshold", () => {
    expect(isOfferStale({ generated_at: OLD }, "DRAFT")).toBe(true);
  });

  test("returns false when DRAFT but within threshold", () => {
    expect(isOfferStale({ generated_at: FRESH }, "DRAFT")).toBe(false);
  });

  test("returns true when SUBMITTED and older than threshold", () => {
    expect(isOfferStale({ generated_at: OLD }, "SUBMITTED")).toBe(true);
  });

  test("returns true when IN_REVIEW and older than threshold", () => {
    expect(isOfferStale({ generated_at: OLD }, "IN_REVIEW")).toBe(true);
  });
});

describe("detectEbomDrift", () => {
  test("returns none when source is LIVE and no EBOM exists", () => {
    expect(detectEbomDrift(makeSnapshot({ source: "LIVE" }), null)).toBe(
      "none",
    );
  });

  test("returns live_but_ebom_exists when source is LIVE and EBOM now exists", () => {
    expect(detectEbomDrift(makeSnapshot({ source: "LIVE" }), new Date())).toBe(
      "live_but_ebom_exists",
    );
  });

  test("returns none when source is EBOM and no EBOM exists (edge: deleted)", () => {
    expect(detectEbomDrift(makeSnapshot({ source: "EBOM" }), null)).toBe(
      "none",
    );
  });

  test("returns ebom_changed when EBOM updated after offer generation", () => {
    const generatedAt = new Date("2025-01-01");
    const ebomUpdated = new Date("2025-01-10");
    expect(
      detectEbomDrift(
        makeSnapshot({ source: "EBOM", generated_at: generatedAt }),
        ebomUpdated,
      ),
    ).toBe("ebom_changed");
  });

  test("returns none when EBOM updated before offer generation", () => {
    const ebomUpdated = new Date("2024-12-01");
    const generatedAt = new Date("2025-01-01");
    expect(
      detectEbomDrift(
        makeSnapshot({ source: "EBOM", generated_at: generatedAt }),
        ebomUpdated,
      ),
    ).toBe("none");
  });
});

describe("buildOfferItemsFromEbom", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const activeRow = {
    pn: "ITC-001",
    description: "Frame part",
    qty: 2,
    is_deleted: false,
    tag: "FRAME" as const,
    category: "GENERAL" as const,
    category_index: 0,
  };

  const deletedRow = {
    pn: "ITC-DEL",
    description: "Deleted part",
    qty: 1,
    is_deleted: true,
    tag: null,
    category: "GENERAL" as const,
    category_index: 0,
  };

  test("excludes soft-deleted rows", async () => {
    mockGetPriceCoefficientsByArray.mockResolvedValue([]);
    mockEnrichWithCosts.mockResolvedValue([]);

    const result = await buildOfferItemsFromEbom([deletedRow]);
    expect(result).toHaveLength(0);
  });

  test("returns empty array when all rows are deleted", async () => {
    mockGetPriceCoefficientsByArray.mockResolvedValue([]);
    mockEnrichWithCosts.mockResolvedValue([]);

    const result = await buildOfferItemsFromEbom([deletedRow]);
    expect(result).toEqual([]);
  });

  test("computes list_price and line_total using cost and coefficient", async () => {
    mockGetPriceCoefficientsByArray.mockResolvedValue([
      { pn: "ITC-001", coefficient: "2.00" },
    ]);
    mockEnrichWithCosts.mockResolvedValue([{ ...activeRow, cost: 100 }]);

    const result = await buildOfferItemsFromEbom([activeRow]);

    expect(result).toHaveLength(1);
    expect(result[0].coefficient).toBe(2);
    expect(result[0].list_price).toBe(200); // 100 * 2 * 1
    expect(result[0].line_total).toBe(400); // 100 * 2 * 2
    expect(result[0].tag).toBe("FRAME");
    expect(result[0].category).toBe("GENERAL");
    expect(result[0].category_index).toBe(0);
  });

  test("falls back to DEFAULT_COEFFICIENT for unknown PNs", async () => {
    mockGetPriceCoefficientsByArray.mockResolvedValue([]);
    mockEnrichWithCosts.mockResolvedValue([{ ...activeRow, cost: 50 }]);

    const [item] = await buildOfferItemsFromEbom([activeRow]);
    expect(item.coefficient).toBe(3.0);
    expect(item.line_total).toBe(50 * 3.0 * 2);
  });

  test("preserves tag and category_index from EBOM row", async () => {
    const washBayRow = {
      ...activeRow,
      category: "WASH_BAY" as const,
      category_index: 1,
      tag: null,
    };
    mockGetPriceCoefficientsByArray.mockResolvedValue([]);
    mockEnrichWithCosts.mockResolvedValue([{ ...washBayRow, cost: 0 }]);

    const [item] = await buildOfferItemsFromEbom([washBayRow]);
    expect(item.category).toBe("WASH_BAY");
    expect(item.category_index).toBe(1);
    expect(item.tag).toBeNull();
  });
});

describe("buildOfferItemsFromLive", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const fakeConfig = {} as Parameters<typeof buildOfferItemsFromLive>[0];

  test("assigns GENERAL category and index 0 to general BOM items", async () => {
    mockBomInit.mockReturnValue({
      buildCompleteBOM: mockBomBuildCompleteBOM,
    });
    mockBomBuildCompleteBOM.mockResolvedValue({
      generalBOM: [
        { pn: "GEN-01", description: "Frame", qty: 1, tag: "FRAME" },
      ],
      waterTankBOMs: [],
      washBayBOMs: [],
    });
    mockGetPriceCoefficientsByArray.mockResolvedValue([
      { pn: "GEN-01", coefficient: "3.00" },
    ]);
    mockEnrichWithCosts.mockResolvedValue([
      { pn: "GEN-01", description: "Frame", qty: 1, tag: "FRAME", cost: 100 },
    ]);

    const result = await buildOfferItemsFromLive(fakeConfig);

    expect(result).toHaveLength(1);
    expect(result[0].category).toBe("GENERAL");
    expect(result[0].category_index).toBe(0);
    expect(result[0].list_price).toBe(300); // 100 * 3 * 1
    expect(result[0].line_total).toBe(300); // 100 * 3 * 1
  });

  test("assigns correct category_index per water tank", async () => {
    mockBomInit.mockReturnValue({
      buildCompleteBOM: mockBomBuildCompleteBOM,
    });
    mockBomBuildCompleteBOM.mockResolvedValue({
      generalBOM: [],
      waterTankBOMs: [
        [{ pn: "WT-01", description: "Tank part", qty: 1, tag: null }],
        [{ pn: "WT-02", description: "Tank part 2", qty: 2, tag: null }],
      ],
      washBayBOMs: [],
    });
    mockGetPriceCoefficientsByArray.mockResolvedValue([]);
    mockEnrichWithCosts.mockResolvedValue([
      { pn: "WT-01", description: "Tank part", qty: 1, tag: null, cost: 200 },
      { pn: "WT-02", description: "Tank part 2", qty: 2, tag: null, cost: 100 },
    ]);

    const result = await buildOfferItemsFromLive(fakeConfig);

    expect(result[0].category).toBe("WATER_TANK");
    expect(result[0].category_index).toBe(0);
    expect(result[1].category).toBe("WATER_TANK");
    expect(result[1].category_index).toBe(1);
  });

  test("assigns correct category_index per wash bay", async () => {
    mockBomInit.mockReturnValue({
      buildCompleteBOM: mockBomBuildCompleteBOM,
    });
    mockBomBuildCompleteBOM.mockResolvedValue({
      generalBOM: [],
      waterTankBOMs: [],
      washBayBOMs: [
        [{ pn: "WB-01", description: "Bay part 0", qty: 1, tag: null }],
        [{ pn: "WB-02", description: "Bay part 1", qty: 3, tag: null }],
      ],
    });
    mockGetPriceCoefficientsByArray.mockResolvedValue([]);
    mockEnrichWithCosts.mockResolvedValue([
      { pn: "WB-01", description: "Bay part 0", qty: 1, tag: null, cost: 0 },
      { pn: "WB-02", description: "Bay part 1", qty: 3, tag: null, cost: 0 },
    ]);

    const result = await buildOfferItemsFromLive(fakeConfig);

    expect(result[0].category_index).toBe(0);
    expect(result[1].category_index).toBe(1);
  });
});

describe("computeOfferTotals", () => {
  const items = [
    {
      pn: "A",
      description: "a",
      qty: 1,
      coefficient: 3,
      list_price: 1000,
      line_total: 1000,
      tag: "FRAME" as const,
      category: "GENERAL" as const,
      category_index: 0,
    },
    {
      pn: "B",
      description: "b",
      qty: 2,
      coefficient: 3,
      list_price: 500,
      line_total: 500,
      tag: "BRUSHES" as const,
      category: "GENERAL" as const,
      category_index: 0,
    },
    {
      pn: "C",
      description: "c",
      qty: 1,
      coefficient: 3,
      list_price: 200,
      line_total: 200,
      tag: null,
      category: "WATER_TANK" as const,
      category_index: 0,
    },
    {
      pn: "D",
      description: "d",
      qty: 1,
      coefficient: 3,
      list_price: 300,
      line_total: 300,
      tag: null,
      category: "WASH_BAY" as const,
      category_index: 0,
    },
  ];

  test("computes correct grand total", () => {
    const { total_list_price } = computeOfferTotals(items, 0);
    expect(total_list_price).toBe(2000);
  });

  test("applies 0% discount correctly", () => {
    const { discounted_total } = computeOfferTotals(items, 0);
    expect(discounted_total).toBe(2000);
  });

  test("applies 40% discount correctly", () => {
    const { discounted_total } = computeOfferTotals(items, 40);
    expect(discounted_total).toBe(1200);
  });

  test("applies 12.5% discount correctly", () => {
    const { discounted_total } = computeOfferTotals(items, 12.5);
    expect(discounted_total).toBe(1750);
  });

  test("groups general items by tag", () => {
    const { sectionTotals } = computeOfferTotals(items, 0);
    expect(sectionTotals.general.FRAME).toBe(1000);
    expect(sectionTotals.general.BRUSHES).toBe(500);
  });

  test("groups water tank items by category_index", () => {
    const { sectionTotals } = computeOfferTotals(items, 0);
    expect(sectionTotals.waterTanks).toEqual([{ index: 0, total: 200 }]);
  });

  test("groups wash bay items by category_index", () => {
    const { sectionTotals } = computeOfferTotals(items, 0);
    expect(sectionTotals.washBays).toEqual([{ index: 0, total: 300 }]);
  });

  test("items with null tag accumulate under MISC", () => {
    const miscItem = {
      pn: "MISC-1",
      description: "misc",
      qty: 1,
      coefficient: 3,
      list_price: 100,
      line_total: 100,
      tag: null,
      category: "GENERAL" as const,
      category_index: 0,
    };
    const { sectionTotals } = computeOfferTotals([miscItem], 0);
    expect(sectionTotals.general.MISC).toBe(100);
  });
});

describe("groupItemsForDisplay", () => {
  test("excludes tags with zero total", () => {
    const items = [
      {
        pn: "A",
        description: "a",
        qty: 1,
        coefficient: 3,
        list_price: 500,
        line_total: 500,
        tag: "FRAME" as const,
        category: "GENERAL" as const,
        category_index: 0,
      },
    ];

    const result = groupItemsForDisplay(items, 0);
    expect(result.general.map((r) => r.tag)).not.toContain("BRUSHES");
    expect(result.general.find((r) => r.tag === "FRAME")?.total).toBe(500);
  });

  test("returns correct discounted_total", () => {
    const items = [
      {
        pn: "A",
        description: "a",
        qty: 1,
        coefficient: 3,
        list_price: 1000,
        line_total: 1000,
        tag: "FRAME" as const,
        category: "GENERAL" as const,
        category_index: 0,
      },
    ];

    const result = groupItemsForDisplay(items, 20);
    expect(result.total_list_price).toBe(1000);
    expect(result.discounted_total).toBe(800);
  });
});
