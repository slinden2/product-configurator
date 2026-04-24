import { describe, expect, test, vi } from "vitest";

vi.mock("@/db", () => ({
  db: { query: { partNumbers: { findMany: vi.fn().mockResolvedValue([]) } } },
}));
vi.mock("@/db/queries", () => ({
  getPartNumbersByArray: vi.fn().mockResolvedValue([]),
}));

import type { GeneralBOMConfig } from "@/lib/BOM";
import { GeneralMaxBOM } from "@/lib/BOM/max-bom";
import { gantryBOM } from "@/lib/BOM/max-bom/gantry-bom";
import { makeGeneralBOMConfig as makeConfig } from "@/test/bom-test-utils";

const cfg = (brush_qty: number, is_fast = false) =>
  ({ brush_qty, is_fast }) as GeneralBOMConfig;

const included = (config: GeneralBOMConfig) =>
  gantryBOM.filter((item) => item.conditions.every((fn) => fn(config)));

describe("gantryBOM", () => {
  test("brush_qty=0 → zero-brush gantry + short photocell supports", () => {
    const items = included(cfg(0));
    expect(items).toHaveLength(2);
    expect(items[0].pn).toBe("450.0E.GRU0");
    expect(items[1].pn).toBe("925.00.000");
  });

  test("brush_qty=2 → two-brush gantry + short photocell supports", () => {
    const items = included(cfg(2));
    expect(items).toHaveLength(2);
    expect(items[0].pn).toBe("450.0E.GRU2");
    expect(items[1].pn).toBe("925.00.000");
  });

  test("brush_qty=3 → three-brush gantry + short photocell supports", () => {
    const items = included(cfg(3));
    expect(items).toHaveLength(2);
    expect(items[0].pn).toBe("450.0E.GRU");
    expect(items[1].pn).toBe("925.00.000");
  });

  test("exactly one gantry item + short photocell supports for valid brush quantities", () => {
    for (const qty of [0, 2, 3]) {
      expect(included(cfg(qty))).toHaveLength(2);
    }
  });
});

describe("gantryBOM — short photocell supports", () => {
  test("non-fast config includes short photocell supports", () => {
    expect(included(cfg(2, false))).toEqual(
      expect.arrayContaining([expect.objectContaining({ pn: "925.00.000" })]),
    );
  });

  test("fast config does NOT include short photocell supports", () => {
    expect(included(cfg(2, true)).map((i) => i.pn)).not.toContain("925.00.000");
  });
});

const pns = (config: GeneralBOMConfig) =>
  gantryBOM
    .filter((item) => item.conditions.every((fn) => fn(config)))
    .map((item) => item.pn);

const PNS = {
  STANDARD_BANNER: "450.25.018",
  OMZ_BANNER: "450.25.026",
};

describe("gantryBOM — machine banners", () => {
  test("STD machine → STANDARD_BANNER included, OMZ_BANNER excluded", () => {
    const result = pns(makeConfig({ machine_type: "STD" }));
    expect(result).toContain(PNS.STANDARD_BANNER);
    expect(result).not.toContain(PNS.OMZ_BANNER);
  });

  test("OMZ machine → OMZ_BANNER included, STANDARD_BANNER excluded", () => {
    const result = pns(makeConfig({ machine_type: "OMZ" }));
    expect(result).toContain(PNS.OMZ_BANNER);
    expect(result).not.toContain(PNS.STANDARD_BANNER);
  });
});

describe("GeneralMaxBOM — tag coverage", () => {
  test("every item in GeneralMaxBOM has a defined tag", () => {
    GeneralMaxBOM.forEach((item) => {
      expect(
        item.tag,
        `item ${item.pn} (${item._description}) is missing a tag`,
      ).toBeDefined();
    });
  });
});
