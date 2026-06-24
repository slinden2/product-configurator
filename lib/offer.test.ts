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
  appendSurchargesToOfferItems,
  buildOfferItemsFromLive,
  computeOfferTotals,
  groupItemsForDisplay,
  isOfferFrozen,
  isOfferStale,
  OFFER_STALENESS_DAYS,
} from "@/lib/offer";

// --- Helpers ---

const NOW = new Date();
const OLD = new Date(NOW.getTime() - (OFFER_STALENESS_DAYS + 1) * 86400_000);
const FRESH = new Date(NOW.getTime() - (OFFER_STALENESS_DAYS - 1) * 86400_000);

// --- Tests ---

describe("isOfferFrozen", () => {
  test("returns false for null snapshot", () => {
    expect(isOfferFrozen(null)).toBe(false);
  });

  test("returns false when frozen_at is null", () => {
    expect(isOfferFrozen({ frozen_at: null })).toBe(false);
  });

  test("returns true when frozen_at is set", () => {
    expect(isOfferFrozen({ frozen_at: new Date() })).toBe(true);
  });
});

describe("isOfferStale", () => {
  test("returns false for TECH_APPROVED regardless of age", () => {
    expect(
      isOfferStale({ generated_at: OLD, frozen_at: null }, "TECH_APPROVED"),
    ).toBe(false);
  });

  test("returns false for CLOSED regardless of age", () => {
    expect(isOfferStale({ generated_at: OLD, frozen_at: null }, "CLOSED")).toBe(
      false,
    );
  });

  test("returns true when DRAFT and older than threshold", () => {
    expect(isOfferStale({ generated_at: OLD, frozen_at: null }, "DRAFT")).toBe(
      true,
    );
  });

  test("returns false when DRAFT but within threshold", () => {
    expect(
      isOfferStale({ generated_at: FRESH, frozen_at: null }, "DRAFT"),
    ).toBe(false);
  });

  test("returns true when IN_SALES_REVIEW and older than threshold", () => {
    expect(
      isOfferStale({ generated_at: OLD, frozen_at: null }, "IN_SALES_REVIEW"),
    ).toBe(true);
  });

  test("returns true when IN_TECH_REVIEW and older than threshold", () => {
    expect(
      isOfferStale({ generated_at: OLD, frozen_at: null }, "IN_TECH_REVIEW"),
    ).toBe(true);
  });

  test("returns false when frozen, even if old and config editable", () => {
    expect(
      isOfferStale(
        { generated_at: OLD, frozen_at: new Date() },
        "IN_TECH_REVIEW",
      ),
    ).toBe(false);
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

describe("appendSurchargesToOfferItems", () => {
  const partItem = {
    pn: "A",
    description: "a",
    qty: 1,
    coefficient: 3,
    list_price: 1000,
    line_total: 1000,
    tag: "FRAME" as const,
    category: "GENERAL" as const,
    category_index: 0,
  };

  const surchargeItem = {
    surcharge_kind: "HEIGHT" as const,
    description: "Altezza non standard",
    qty: 1 as const,
    amount: 500,
    line_total: 500,
  };

  test("returns items unchanged as OfferLineItem[] when surcharges is empty", () => {
    const result = appendSurchargesToOfferItems([partItem], []);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(partItem);
  });

  test("concatenates surcharges after part items in order", () => {
    const result = appendSurchargesToOfferItems([partItem], [surchargeItem]);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual(partItem);
    expect(result[1]).toEqual(surchargeItem);
  });
});
