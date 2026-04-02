import { vi, describe, test, expect } from "vitest";

// Must be mocked before BOM is imported — prevents DATABASE_URL check
vi.mock("@/db", () => ({
  db: {},
}));
vi.mock("@/db/queries", () => ({
  getPartNumbersByArray: vi.fn().mockResolvedValue([]),
}));

import { BOM, type BOMItemWithDescription, type GeneralBOMConfig } from "@/lib/BOM";
import {
  makeConfigWithBaysAndTanks as makeConfig,
  makeWashBay,
} from "@/test/bom-test-utils";

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

// --- Tests ---

describe("BOM.init and getters", () => {
  test("BOM.init stores the configuration", () => {
    const config = makeConfig();
    const bom = BOM.init(config);
    expect(bom.configuration).toBe(config);
  });

  test("getConfiguration returns the full configuration", () => {
    const config = makeConfig();
    const bom = BOM.init(config);
    expect(bom.getConfiguration()).toBe(config);
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
  const item = (pn: string): BOMItemWithDescription => ({
    pn,
    qty: 1,
    _description: pn,
    description: pn,
  });

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

describe("buildGeneralBOM — has_shelf_extension derivation", () => {
  async function getShelfExtension(
    washBays: ReturnType<typeof makeWashBay>[],
  ): Promise<boolean> {
    const config = makeConfig({ wash_bays: washBays });
    const bom = BOM.init(config);
    const captured: { value: unknown } = { value: undefined };
    bom.generalMaxBOM = [makeSpyItem(captured)] as typeof bom.generalMaxBOM;
    await bom.buildGeneralBOM();
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

describe("buildWashBayBOM — uses_3000_posts detection", () => {
  async function getUses3000Posts(
    washBays: ReturnType<typeof makeWashBay>[],
  ): Promise<boolean | undefined> {
    const config = makeConfig({ wash_bays: washBays });
    const bom = BOM.init(config);
    const captured: { value: unknown } = { value: undefined };
    bom.washBayMaxBOM = [makeSpyItem(captured)] as typeof bom.washBayMaxBOM;
    await bom.buildWashBayBOM();
    return (captured.value as { uses_3000_posts?: boolean })?.uses_3000_posts;
  }

  test("no wash bays → no output (nothing captured)", async () => {
    const config = makeConfig({ wash_bays: [] });
    const bom = BOM.init(config);
    const results = await bom.buildWashBayBOM();
    expect(results).toEqual([]);
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
    await bom.buildWashBayBOM();
    const allUse3000 = capturedValues.every(
      (c) => (c as { uses_3000_posts?: boolean }).uses_3000_posts === true,
    );
    expect(allUse3000).toBe(true);
  });
});

describe("buildWashBayBOM — supply data propagation", () => {
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
    await bom.buildWashBayBOM();
    expect(capturedValues).toHaveLength(2);
    for (const c of capturedValues as Record<string, unknown>[]) {
      expect(c.supply_type).toBe("ENERGY_CHAIN");
      expect(c.supply_side).toBe("RIGHT");
      expect(c.supply_fixing_type).toBe("POST");
    }
  });
});
