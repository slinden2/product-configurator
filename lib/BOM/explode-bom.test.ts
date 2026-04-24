// @vitest-environment node
import { beforeEach, describe, expect, test, vi } from "vitest";

const {
  mockGetAssemblyChildren,
  mockGetPartNumbersByArray,
  mockEnrichWithCosts,
} = vi.hoisted(() => ({
  mockGetAssemblyChildren: vi.fn(),
  mockGetPartNumbersByArray: vi.fn(),
  mockEnrichWithCosts: vi.fn(),
}));

vi.mock("@/db/queries", () => ({
  getAssemblyChildren: mockGetAssemblyChildren,
  getPartNumbersByArray: mockGetPartNumbersByArray,
}));

vi.mock("@/lib/BOM", () => ({
  enrichWithCosts: mockEnrichWithCosts,
}));

import { explodeBomsToLeaves } from "@/lib/BOM/explode-bom";

function makeCostItem(pn: string, qty: number, cost = 10) {
  return { pn, qty, cost, description: `Desc ${pn}`, _description: "" };
}

function makePartChild(pn: string, qty: number) {
  return {
    pn,
    description: `Desc ${pn}`,
    qty,
    sort_order: 1,
    pn_type: "PART" as const,
    is_phantom: false,
  };
}

function makeAssyChild(pn: string, qty: number) {
  return {
    pn,
    description: `Desc ${pn}`,
    qty,
    sort_order: 1,
    pn_type: "ASSY" as const,
    is_phantom: false,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  // Default: enrichWithCosts passes items through with cost=10
  mockEnrichWithCosts.mockImplementation(
    async (
      items: {
        pn: string;
        qty: number;
        description: string;
        _description: string;
      }[],
    ) => items.map((i) => ({ ...i, cost: 10 })),
  );
});

describe("explodeBomsToLeaves", () => {
  test("PART-only rows pass through without calling getAssemblyChildren", async () => {
    mockGetPartNumbersByArray.mockResolvedValue([
      { pn: "PART-A", pn_type: "PART", cost: "10" },
    ]);

    await explodeBomsToLeaves({
      generalBOM: [makeCostItem("PART-A", 2)],
      waterTankBOMs: [],
      washBayBOMs: [],
    });

    expect(mockGetAssemblyChildren).not.toHaveBeenCalled();
    // Only 1 enrichWithCosts call: general. Empty tank/bay arrays produce no calls.
    expect(mockEnrichWithCosts).toHaveBeenCalledTimes(1);
    const [generalLeaves] = mockEnrichWithCosts.mock.calls[0];
    expect(generalLeaves).toHaveLength(1);
    expect(generalLeaves[0].pn).toBe("PART-A");
    expect(generalLeaves[0].qty).toBe(2);
  });

  test("single-level ASSY is replaced by its children with qty multiplication", async () => {
    mockGetPartNumbersByArray.mockResolvedValue([
      { pn: "ASSY-1", pn_type: "ASSY", cost: "0" },
    ]);
    mockGetAssemblyChildren.mockResolvedValue([
      makePartChild("PART-A", 3),
      makePartChild("PART-B", 5),
    ]);

    await explodeBomsToLeaves({
      generalBOM: [makeCostItem("ASSY-1", 2)],
      waterTankBOMs: [],
      washBayBOMs: [],
    });

    const [generalLeaves] = mockEnrichWithCosts.mock.calls[0];
    expect(generalLeaves).toHaveLength(2);
    expect(
      generalLeaves.find((l: { pn: string }) => l.pn === "PART-A").qty,
    ).toBe(6); // 2 * 3
    expect(
      generalLeaves.find((l: { pn: string }) => l.pn === "PART-B").qty,
    ).toBe(10); // 2 * 5
  });

  test("nested ASSY multiplies qty through the full path", async () => {
    mockGetPartNumbersByArray.mockResolvedValue([
      { pn: "ASSY-TOP", pn_type: "ASSY", cost: "0" },
    ]);
    mockGetAssemblyChildren
      .mockResolvedValueOnce([makeAssyChild("ASSY-MID", 2)])
      .mockResolvedValueOnce([makePartChild("PART-LEAF", 4)]);

    await explodeBomsToLeaves({
      generalBOM: [makeCostItem("ASSY-TOP", 3)],
      waterTankBOMs: [],
      washBayBOMs: [],
    });

    const [generalLeaves] = mockEnrichWithCosts.mock.calls[0];
    expect(generalLeaves).toHaveLength(1);
    expect(generalLeaves[0].pn).toBe("PART-LEAF");
    expect(generalLeaves[0].qty).toBe(24); // 3 * 2 * 4
  });

  test("orphan ASSY (no catalog rows) is excluded from output with a console.warn", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    mockGetPartNumbersByArray.mockResolvedValue([
      { pn: "ORPHAN-ASSY", pn_type: "ASSY", cost: "0" },
    ]);
    mockGetAssemblyChildren.mockResolvedValue([]);

    await explodeBomsToLeaves({
      generalBOM: [makeCostItem("ORPHAN-ASSY", 1)],
      waterTankBOMs: [],
      washBayBOMs: [],
    });

    const [generalLeaves] = mockEnrichWithCosts.mock.calls[0];
    expect(generalLeaves).toHaveLength(0);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("ASSY without catalog rows: ORPHAN-ASSY"),
    );
    warnSpy.mockRestore();
  });

  test("cycle A → B → A is stopped via visited guard and the cycled node is excluded", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    mockGetPartNumbersByArray.mockResolvedValue([
      { pn: "ASSY-A", pn_type: "ASSY", cost: "0" },
    ]);
    mockGetAssemblyChildren
      .mockResolvedValueOnce([makeAssyChild("ASSY-B", 1)])
      .mockResolvedValueOnce([makeAssyChild("ASSY-A", 1)]); // cycle back

    await explodeBomsToLeaves({
      generalBOM: [makeCostItem("ASSY-A", 1)],
      waterTankBOMs: [],
      washBayBOMs: [],
    });

    const [generalLeaves] = mockEnrichWithCosts.mock.calls[0];
    // Neither ASSY appears as a leaf — the cycled node is dropped
    expect(generalLeaves.some((l: { pn: string }) => l.pn === "ASSY-A")).toBe(
      false,
    );
    expect(generalLeaves.some((l: { pn: string }) => l.pn === "ASSY-B")).toBe(
      false,
    );
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("cycle detected"),
    );
    warnSpy.mockRestore();
  });

  test("depth cap stops recursion and emits a console.warn", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    mockGetPartNumbersByArray.mockResolvedValue([
      { pn: "ASSY-0", pn_type: "ASSY", cost: "0" },
    ]);
    // Build a chain ASSY-0 → ASSY-1 → ... → ASSY-10 (11 levels deep)
    for (let i = 0; i <= 10; i++) {
      mockGetAssemblyChildren.mockResolvedValueOnce([
        makeAssyChild(`ASSY-${i + 1}`, 1),
      ]);
    }

    await explodeBomsToLeaves({
      generalBOM: [makeCostItem("ASSY-0", 1)],
      waterTankBOMs: [],
      washBayBOMs: [],
    });

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("depth cap"));
    warnSpy.mockRestore();
  });

  test("preserves bucket structure across general, waterTank, and washBay", async () => {
    mockGetPartNumbersByArray.mockResolvedValue([
      { pn: "PART-G", pn_type: "PART", cost: "10" },
      { pn: "PART-W", pn_type: "PART", cost: "10" },
      { pn: "PART-B", pn_type: "PART", cost: "10" },
    ]);

    const result = await explodeBomsToLeaves({
      generalBOM: [makeCostItem("PART-G", 1)],
      waterTankBOMs: [[makeCostItem("PART-W", 2)]],
      washBayBOMs: [[makeCostItem("PART-B", 3)]],
    });

    // enrichWithCosts is called 3 times: general, waterTank[0], washBay[0]
    expect(mockEnrichWithCosts).toHaveBeenCalledTimes(3);
    // The returned shape mirrors input structure
    expect(result.generalBOM).toHaveLength(1);
    expect(result.waterTankBOMs).toHaveLength(1);
    expect(result.washBayBOMs).toHaveLength(1);
  });

  test("same ASSY appearing twice in BOM produces two exploded leaf groups (aggregation is downstream)", async () => {
    mockGetPartNumbersByArray.mockResolvedValue([
      { pn: "ASSY-DUP", pn_type: "ASSY", cost: "0" },
    ]);
    mockGetAssemblyChildren.mockResolvedValue([makePartChild("PART-X", 2)]);

    await explodeBomsToLeaves({
      generalBOM: [makeCostItem("ASSY-DUP", 1), makeCostItem("ASSY-DUP", 3)],
      waterTankBOMs: [],
      washBayBOMs: [],
    });

    const [generalLeaves] = mockEnrichWithCosts.mock.calls[0];
    // Two leaf rows for PART-X (one per ASSY-DUP occurrence)
    const xLeaves = generalLeaves.filter(
      (l: { pn: string }) => l.pn === "PART-X",
    );
    expect(xLeaves).toHaveLength(2);
    expect(xLeaves[0].qty).toBe(2); // 1 * 2
    expect(xLeaves[1].qty).toBe(6); // 3 * 2
  });
});
