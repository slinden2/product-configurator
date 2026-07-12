import { beforeEach, describe, expect, test, vi } from "vitest";

// Must be mocked before BOM is imported — prevents DATABASE_URL check
vi.mock("@/db", () => ({
  db: {},
}));
const mockGetPartNumbersByArray = vi.fn();
vi.mock("@/db/queries", () => ({
  getPartNumbersByArray: (...args: unknown[]) =>
    mockGetPartNumbersByArray(...args),
}));

import {
  BOM,
  type BOMItemWithDescription,
  enrichWithCosts,
  type GeneralBOMConfig,
} from "@/lib/BOM";
import {
  makeConfigWithBaysAndTanks as makeConfig,
  makeWashBay,
} from "@/test/bom-test-utils";

beforeEach(() => {
  vi.clearAllMocks();
  mockGetPartNumbersByArray.mockResolvedValue([]);
});

// Spy item: captures the config passed to it (always excludes itself from results)
function makeSpyItem(captured: { value: unknown }) {
  return {
    pn: "SPY",
    conditions: [
      (c: unknown) => {
        captured.value = c;
        return false; // exclude from results so DB isn't queried for "SPY"
      },
    ],
    qty: 1,
    _description: "spy item",
  };
}

const item = (pn: string): BOMItemWithDescription => ({
  pn,
  qty: 1,
  _description: pn,
  description: pn,
});

// --- Tests ---

describe("BOM.init and getters", () => {
  test("BOM.init stores the configuration", () => {
    const config = makeConfig();
    const bom = BOM.init(config);
    expect(bom.configuration).toBe(config);
  });

  test("getClientName returns configuration.name", () => {
    const config = makeConfig({ name: "Carwash Pro" });
    const bom = BOM.init(config);
    expect(bom.getClientName()).toBe("Carwash Pro");
  });

  test("getDescription returns configuration.description", () => {
    const config = makeConfig({ description: "3-brush setup" });
    const bom = BOM.init(config);
    expect(bom.getDescription()).toBe("3-brush setup");
  });
});

describe("BOM.generateExportData (static)", () => {
  test("returns empty array when all inputs are empty", () => {
    expect(BOM.generateExportData([], [], [])).toEqual([]);
  });

  test("returns only general items when tanks/bays are empty", () => {
    const general = [item("A"), item("B")];
    expect(BOM.generateExportData(general, [], [])).toEqual(general);
  });

  test("flattens all arrays in order: general → tanks → bays", () => {
    const general = [item("G1")];
    const tanks = [[item("T1"), item("T2")], [item("T3")]];
    const bays = [[item("B1")], [item("B2"), item("B3")]];
    const result = BOM.generateExportData(general, tanks, bays);
    expect(result.map((i) => i.pn)).toEqual([
      "G1",
      "T1",
      "T2",
      "T3",
      "B1",
      "B2",
      "B3",
    ]);
  });
});

describe("buildCompleteBOM — has_shelf_extension derivation", () => {
  async function getShelfExtension(
    washBays: ReturnType<typeof makeWashBay>[],
  ): Promise<boolean> {
    const config = makeConfig({ wash_bays: washBays });
    const bom = BOM.init(config);
    const captured: { value: unknown } = { value: undefined };
    bom.generalMaxBOM = [makeSpyItem(captured)] as typeof bom.generalMaxBOM;
    await bom.buildCompleteBOM();
    return (captured.value as GeneralBOMConfig)?.has_shelf_extension ?? false;
  }

  test("no wash bays → false", async () => {
    expect(await getShelfExtension([])).toBe(false);
  });

  test("bay with has_gantry=true but has_shelf_extension=false → false", async () => {
    expect(
      await getShelfExtension([
        makeWashBay({ has_gantry: true, has_shelf_extension: false }),
      ]),
    ).toBe(false);
  });

  test("bay with has_gantry=false but has_shelf_extension=true → false", async () => {
    expect(
      await getShelfExtension([
        makeWashBay({ has_gantry: false, has_shelf_extension: true }),
      ]),
    ).toBe(false);
  });

  test("bay with has_gantry=true AND has_shelf_extension=true → true", async () => {
    expect(
      await getShelfExtension([
        makeWashBay({ has_gantry: true, has_shelf_extension: true }),
      ]),
    ).toBe(true);
  });

  test("multiple bays, only second one triggers → true", async () => {
    const bays = [
      makeWashBay({ has_gantry: false, has_shelf_extension: false }),
      makeWashBay({ has_gantry: true, has_shelf_extension: true }),
    ];
    expect(await getShelfExtension(bays)).toBe(true);
  });
});

describe("buildCompleteBOM — uses_3000_posts detection", () => {
  async function getUses3000Posts(
    washBays: ReturnType<typeof makeWashBay>[],
  ): Promise<boolean | undefined> {
    const config = makeConfig({ wash_bays: washBays });
    const bom = BOM.init(config);
    const captured: { value: unknown } = { value: undefined };
    bom.washBayMaxBOM = [makeSpyItem(captured)] as typeof bom.washBayMaxBOM;
    await bom.buildCompleteBOM();
    return (captured.value as { uses_3000_posts?: boolean })?.uses_3000_posts;
  }

  test("no wash bays → empty washBayBOMs", async () => {
    const config = makeConfig({ wash_bays: [] });
    const bom = BOM.init(config);
    const { washBayBOMs } = await bom.buildCompleteBOM();
    expect(washBayBOMs).toEqual([]);
  });

  test("bay with 0+0 lances → uses_3000_posts=false", async () => {
    const uses = await getUses3000Posts([
      makeWashBay({ hp_lance_qty: 0, det_lance_qty: 0 }),
    ]);
    expect(uses).toBe(false);
  });

  test("bay with 2+0 lances → uses_3000_posts=false (total=2, not > 2)", async () => {
    const uses = await getUses3000Posts([
      makeWashBay({ hp_lance_qty: 2, det_lance_qty: 0 }),
    ]);
    expect(uses).toBe(false);
  });

  test("bay with 2+2 lances → uses_3000_posts=true (total=4 > 2)", async () => {
    const uses = await getUses3000Posts([
      makeWashBay({ hp_lance_qty: 2, det_lance_qty: 2 }),
    ]);
    expect(uses).toBe(true);
  });

  test("multiple bays: one with 4 lances sets uses_3000_posts=true for all", async () => {
    const bays = [
      makeWashBay({ hp_lance_qty: 0, det_lance_qty: 0 }),
      makeWashBay({ hp_lance_qty: 2, det_lance_qty: 2 }),
    ];
    const config = makeConfig({ wash_bays: bays });
    const bom = BOM.init(config);
    const capturedValues: unknown[] = [];
    bom.washBayMaxBOM = [
      {
        pn: "SPY",
        conditions: [
          (c: unknown) => {
            capturedValues.push(c);
            return false;
          },
        ],
        qty: 1,
        _description: "spy",
      },
    ] as typeof bom.washBayMaxBOM;
    await bom.buildCompleteBOM();
    const allUse3000 = capturedValues.every(
      (c) => (c as { uses_3000_posts?: boolean }).uses_3000_posts === true,
    );
    expect(allUse3000).toBe(true);
  });
});

describe("buildCompleteBOM — supply data propagation", () => {
  test("each wash bay receives supply_type, supply_side, supply_fixing_type from configuration", async () => {
    const config = makeConfig({
      supply_type: "ENERGY_CHAIN",
      supply_side: "RIGHT",
      supply_fixing_type: "POST",
      wash_bays: [makeWashBay(), makeWashBay()],
    });
    const bom = BOM.init(config);
    const capturedValues: unknown[] = [];
    bom.washBayMaxBOM = [
      {
        pn: "SPY",
        conditions: [
          (c: unknown) => {
            capturedValues.push(c);
            return false;
          },
        ],
        qty: 1,
        _description: "spy",
      },
    ] as typeof bom.washBayMaxBOM;
    await bom.buildCompleteBOM();
    expect(capturedValues).toHaveLength(2);
    for (const c of capturedValues as Record<string, unknown>[]) {
      expect(c.supply_type).toBe("ENERGY_CHAIN");
      expect(c.supply_side).toBe("RIGHT");
      expect(c.supply_fixing_type).toBe("POST");
    }
  });
});

describe("buildCompleteBOM — output shape and descriptions", () => {
  test("attaches DB descriptions to matched rules and N/A to unknown PNs", async () => {
    mockGetPartNumbersByArray.mockResolvedValue([
      { pn: "KNOWN", description: "Known part", cost: "1" },
    ]);
    const config = makeConfig();
    const bom = BOM.init(config);
    bom.generalMaxBOM = [
      { pn: "KNOWN", conditions: [], qty: 2, _description: "rule a" },
      { pn: "UNKNOWN", conditions: [], qty: 1, _description: "rule b" },
    ] as typeof bom.generalMaxBOM;

    const { generalBOM } = await bom.buildCompleteBOM();

    expect(generalBOM).toEqual([
      {
        pn: "KNOWN",
        qty: 2,
        _description: "rule a",
        description: "Known part",
        tag: undefined,
      },
      {
        pn: "UNKNOWN",
        qty: 1,
        _description: "rule b",
        description: "N/A",
        tag: undefined,
      },
    ]);
    // single batched DB call for all sections
    expect(mockGetPartNumbersByArray).toHaveBeenCalledTimes(1);
  });
});

describe("enrichWithCosts", () => {
  test("returns zero-cost items without a DB call when input is empty", async () => {
    const result = await enrichWithCosts([]);
    expect(result).toEqual([]);
    expect(mockGetPartNumbersByArray).not.toHaveBeenCalled();
  });

  test("maps cost/family/sub_family from the DB and preserves input order", async () => {
    mockGetPartNumbersByArray.mockResolvedValue([
      { pn: "B", cost: "2.5", family: "FAM-B", sub_family: "SUB-B" },
      { pn: "A", cost: "10", family: "FAM-A", sub_family: null },
    ]);

    const result = await enrichWithCosts([
      { pn: "A" },
      { pn: "B" },
      { pn: "A" },
    ]);

    // one output per input, in input order — generateCostExportData's
    // offset slicing depends on this contract
    expect(result.map((r) => r.pn)).toEqual(["A", "B", "A"]);
    expect(result[0]).toEqual({
      pn: "A",
      cost: 10,
      family: "FAM-A",
      sub_family: null,
    });
    expect(result[1]).toEqual({
      pn: "B",
      cost: 2.5,
      family: "FAM-B",
      sub_family: "SUB-B",
    });
    // duplicate PN enriched identically
    expect(result[2]).toEqual(result[0]);
    // PNs deduped in the DB call
    expect(mockGetPartNumbersByArray).toHaveBeenCalledWith(["A", "B"]);
  });

  test("falls back to cost 0 and null family for PNs missing from the DB", async () => {
    mockGetPartNumbersByArray.mockResolvedValue([]);

    const result = await enrichWithCosts([{ pn: "MISSING" }]);

    expect(result).toEqual([
      { pn: "MISSING", cost: 0, family: null, sub_family: null },
    ]);
  });

  test("falls back to cost 0 for non-numeric DB costs", async () => {
    mockGetPartNumbersByArray.mockResolvedValue([
      { pn: "BAD", cost: "not-a-number", family: null, sub_family: null },
    ]);

    const result = await enrichWithCosts([{ pn: "BAD" }]);

    expect(result[0].cost).toBe(0);
  });
});

describe("BOM.generateCostExportData (static)", () => {
  test("round-trips ragged bucket shapes through the flat enrichment", async () => {
    mockGetPartNumbersByArray.mockResolvedValue([
      { pn: "G1", cost: "1", family: "F", sub_family: null },
      { pn: "T1", cost: "2", family: "F", sub_family: null },
      { pn: "T2", cost: "3", family: "F", sub_family: null },
      { pn: "B1", cost: "4", family: "F", sub_family: null },
      { pn: "B2", cost: "5", family: "F", sub_family: null },
    ]);

    const general = [item("G1")];
    const tanks = [[item("T1"), item("T2")], [], [item("T1")]];
    const bays = [[], [item("B1")], [item("B2"), item("B1")]];

    const result = await BOM.generateCostExportData(general, tanks, bays);

    expect(result.generalBOM.map((i) => [i.pn, i.cost])).toEqual([["G1", 1]]);
    expect(
      result.waterTankBOMs.map((bucket) => bucket.map((i) => i.pn)),
    ).toEqual([["T1", "T2"], [], ["T1"]]);
    expect(result.washBayBOMs.map((bucket) => bucket.map((i) => i.pn))).toEqual(
      [[], ["B1"], ["B2", "B1"]],
    );
    expect(result.washBayBOMs[2].map((i) => i.cost)).toEqual([5, 4]);
    // one batched DB call for the whole export
    expect(mockGetPartNumbersByArray).toHaveBeenCalledTimes(1);
  });

  test("handles all-empty input", async () => {
    const result = await BOM.generateCostExportData([], [], []);
    expect(result).toEqual({
      generalBOM: [],
      waterTankBOMs: [],
      washBayBOMs: [],
    });
    expect(mockGetPartNumbersByArray).not.toHaveBeenCalled();
  });
});
