import { describe, test, expect, vi } from "vitest";

// Mock db/queries for buildEbomCostExportData
const mockGetPartNumbersByArray = vi.fn();
vi.mock("@/db/queries", () => ({
  getPartNumbersByArray: (...args: unknown[]) =>
    mockGetPartNumbersByArray(...args),
}));

import {
  groupEbomByCategory,
  buildEbomExportData,
  getEarliestCreatedAt,
  getBomRulesVersion,
  buildEbomCostExportData,
  groupByTag,
  hasTagData,
} from "@/app/configurations/bom/[id]/bom-helpers";
import type { EngineeringBomItem } from "@/db/schemas";

// --- Helpers ---

function makeItem(
  overrides: Partial<EngineeringBomItem> & {
    bom_rules_version?: string | null;
  } = {},
): EngineeringBomItem {
  return {
    id: 1,
    configuration_id: 1,
    category: "GENERAL",
    category_index: 0,
    pn: "PN-001",
    is_custom: false,
    description: "Test item",
    qty: 1,
    original_qty: 1,
    is_deleted: false,
    is_added: false,
    sort_order: 0,
    tag: null,
    bom_rules_version: null,
    created_at: new Date("2026-03-20T10:00:00Z"),
    updated_at: new Date("2026-03-20T10:00:00Z"),
    ...overrides,
  };
}

// --- Tests ---

describe("groupEbomByCategory", () => {
  test("returns empty groups for empty array", () => {
    const result = groupEbomByCategory([]);
    expect(result.general).toEqual([]);
    expect(result.waterTanks.size).toBe(0);
    expect(result.washBays.size).toBe(0);
  });

  test("groups GENERAL items into general array", () => {
    const items = [
      makeItem({ id: 1, pn: "PN-001" }),
      makeItem({ id: 2, pn: "PN-002" }),
    ];
    const result = groupEbomByCategory(items);
    expect(result.general).toHaveLength(2);
    expect(result.waterTanks.size).toBe(0);
    expect(result.washBays.size).toBe(0);
  });

  test("groups WATER_TANK items by category_index", () => {
    const items = [
      makeItem({ id: 1, category: "WATER_TANK", category_index: 0 }),
      makeItem({ id: 2, category: "WATER_TANK", category_index: 0 }),
      makeItem({ id: 3, category: "WATER_TANK", category_index: 1 }),
    ];
    const result = groupEbomByCategory(items);
    expect(result.general).toHaveLength(0);
    expect(result.waterTanks.size).toBe(2);
    expect(result.waterTanks.get(0)).toHaveLength(2);
    expect(result.waterTanks.get(1)).toHaveLength(1);
  });

  test("groups WASH_BAY items by category_index", () => {
    const items = [
      makeItem({ id: 1, category: "WASH_BAY", category_index: 0 }),
      makeItem({ id: 2, category: "WASH_BAY", category_index: 2 }),
    ];
    const result = groupEbomByCategory(items);
    expect(result.washBays.size).toBe(2);
    expect(result.washBays.get(0)).toHaveLength(1);
    expect(result.washBays.get(2)).toHaveLength(1);
  });

  test("handles mixed categories correctly", () => {
    const items = [
      makeItem({ id: 1, category: "GENERAL", category_index: 0 }),
      makeItem({ id: 2, category: "WATER_TANK", category_index: 0 }),
      makeItem({ id: 3, category: "WASH_BAY", category_index: 0 }),
      makeItem({ id: 4, category: "GENERAL", category_index: 0 }),
      makeItem({ id: 5, category: "WATER_TANK", category_index: 1 }),
    ];
    const result = groupEbomByCategory(items);
    expect(result.general).toHaveLength(2);
    expect(result.waterTanks.size).toBe(2);
    expect(result.washBays.size).toBe(1);
  });
});

describe("buildEbomExportData", () => {
  test("returns empty array for empty input", () => {
    expect(buildEbomExportData([])).toEqual([]);
  });

  test("maps items to export format with _description empty string", () => {
    const items = [
      makeItem({ pn: "PN-001", qty: 5, description: "Motor A" }),
      makeItem({ pn: "PN-002", qty: 3, description: "Brush B" }),
    ];
    const result = buildEbomExportData(items);
    expect(result).toEqual([
      { pn: "PN-001", qty: 5, description: "Motor A", _description: "" },
      { pn: "PN-002", qty: 3, description: "Brush B", _description: "" },
    ]);
  });
});

describe("getEarliestCreatedAt", () => {
  test("returns null for empty array", () => {
    expect(getEarliestCreatedAt([])).toBeNull();
  });

  test("returns the date of a single item", () => {
    const date = new Date("2026-01-15T08:00:00Z");
    const items = [makeItem({ created_at: date })];
    expect(getEarliestCreatedAt(items)).toEqual(date);
  });

  test("returns the earliest date from multiple items", () => {
    const earliest = new Date("2026-01-01T00:00:00Z");
    const middle = new Date("2026-02-15T00:00:00Z");
    const latest = new Date("2026-03-20T00:00:00Z");
    const items = [
      makeItem({ id: 1, created_at: middle }),
      makeItem({ id: 2, created_at: latest }),
      makeItem({ id: 3, created_at: earliest }),
    ];
    expect(getEarliestCreatedAt(items)).toEqual(earliest);
  });
});

describe("getBomRulesVersion", () => {
  test("returns null for empty array", () => {
    expect(getBomRulesVersion([])).toBeNull();
  });

  test("returns null when items have no version", () => {
    const items = [makeItem({ bom_rules_version: null })];
    expect(getBomRulesVersion(items)).toBeNull();
  });

  test("returns the version from the first item", () => {
    const items = [
      makeItem({ id: 1, bom_rules_version: "260320" }),
      makeItem({ id: 2, bom_rules_version: "260320" }),
    ];
    expect(getBomRulesVersion(items)).toBe("260320");
  });
});

describe("buildEbomCostExportData", () => {
  test("builds cost export data grouped by category", async () => {
    mockGetPartNumbersByArray.mockResolvedValue([
      { pn: "PN-001", cost: "10.50" },
      { pn: "PN-002", cost: "25.00" },
      { pn: "PN-003", cost: "5.00" },
    ]);

    const items = [
      makeItem({ id: 1, pn: "PN-001", qty: 2, category: "GENERAL" }),
      makeItem({
        id: 2,
        pn: "PN-002",
        qty: 1,
        category: "WATER_TANK",
        category_index: 0,
      }),
      makeItem({
        id: 3,
        pn: "PN-003",
        qty: 3,
        category: "WASH_BAY",
        category_index: 0,
      }),
    ];

    const result = await buildEbomCostExportData(items);

    expect(result.generalBOM).toHaveLength(1);
    expect(result.generalBOM[0]).toMatchObject({
      pn: "PN-001",
      qty: 2,
      cost: 10.5,
    });

    expect(result.waterTankBOMs).toHaveLength(1);
    expect(result.waterTankBOMs[0][0]).toMatchObject({
      pn: "PN-002",
      cost: 25,
    });

    expect(result.washBayBOMs).toHaveLength(1);
    expect(result.washBayBOMs[0][0]).toMatchObject({
      pn: "PN-003",
      cost: 5,
    });
  });

  test("defaults cost to 0 for unknown part numbers", async () => {
    mockGetPartNumbersByArray.mockResolvedValue([]);

    const items = [makeItem({ pn: "UNKNOWN-PN", qty: 1 })];
    const result = await buildEbomCostExportData(items);

    expect(result.generalBOM[0].cost).toBe(0);
  });

  test("deduplicates part numbers before querying", async () => {
    mockGetPartNumbersByArray.mockResolvedValue([{ pn: "PN-001", cost: "10" }]);

    const items = [
      makeItem({ id: 1, pn: "PN-001", qty: 1 }),
      makeItem({ id: 2, pn: "PN-001", qty: 2 }),
    ];

    await buildEbomCostExportData(items);

    // Should query with deduplicated PNs
    expect(mockGetPartNumbersByArray).toHaveBeenCalledWith(["PN-001"]);
  });
});

describe("groupByTag", () => {
  test("returns empty map for empty array", () => {
    expect(groupByTag([])).toEqual(new Map());
  });

  test("groups items by tag in BomTags order", () => {
    const items = [
      makeItem({ id: 1, tag: "BRUSHES" }),
      makeItem({ id: 2, tag: "FRAME" }),
      makeItem({ id: 3, tag: "BRUSHES" }),
    ];
    const result = groupByTag(items);
    const keys = Array.from(result.keys());
    expect(keys).toEqual(["FRAME", "BRUSHES"]);
    expect(result.get("FRAME")).toHaveLength(1);
    expect(result.get("BRUSHES")).toHaveLength(2);
  });

  test("excludes tags with no matching items", () => {
    const items = [makeItem({ id: 1, tag: "RAILS" })];
    const result = groupByTag(items);
    expect(result.size).toBe(1);
    expect(result.has("RAILS")).toBe(true);
    expect(result.has("BRUSHES")).toBe(false);
  });

  test("items with null tag are excluded", () => {
    const items = [
      makeItem({ id: 1, tag: null }),
      makeItem({ id: 2, tag: "HP_PUMPS" }),
    ];
    const result = groupByTag(items);
    expect(result.size).toBe(1);
    expect(result.has("HP_PUMPS")).toBe(true);
  });
});

describe("hasTagData", () => {
  test("returns false for empty array", () => {
    expect(hasTagData([])).toBe(false);
  });

  test("returns false when all items have null tags", () => {
    const items = [makeItem({ tag: null }), makeItem({ tag: null })];
    expect(hasTagData(items)).toBe(false);
  });

  test("returns true when at least one item has a tag", () => {
    const items = [makeItem({ tag: null }), makeItem({ tag: "FRAME" })];
    expect(hasTagData(items)).toBe(true);
  });
});
