import { vi, describe, test, expect } from "vitest";

vi.mock("@/db", () => ({
  db: { query: { partNumbers: { findMany: vi.fn().mockResolvedValue([]) } } },
}));
vi.mock("@/db/queries", () => ({
  getPartNumbersByArray: vi.fn().mockResolvedValue([]),
}));

import { gruBOM } from "@/lib/BOM/max-bom/gru-bom";
import { GeneralMaxBOM } from "@/lib/BOM/max-bom";
import type { GeneralBOMConfig } from "@/lib/BOM";

const cfg = (brush_qty: number) =>
  ({ brush_qty }) as Parameters<(typeof gruBOM)[0]["conditions"][0]>[0];

const included = (config: GeneralBOMConfig) =>
  gruBOM.filter((item) => item.conditions.every((fn) => fn(config)));

describe("gruBOM", () => {
  test("brush_qty=0 → only zero-brush GRU included", () => {
    const items = included(cfg(0) as GeneralBOMConfig);
    expect(items).toHaveLength(1);
    expect(items[0].pn).toBe("450.0E.GRU0");
  });

  test("brush_qty=2 → only two-brush GRU included", () => {
    const items = included(cfg(2) as GeneralBOMConfig);
    expect(items).toHaveLength(1);
    expect(items[0].pn).toBe("450.0E.GRU2");
  });

  test("brush_qty=3 → only three-brush GRU included", () => {
    const items = included(cfg(3) as GeneralBOMConfig);
    expect(items).toHaveLength(1);
    expect(items[0].pn).toBe("450.0E.GRU");
  });

  test("exactly one GRU item is always selected for valid brush quantities", () => {
    for (const qty of [0, 2, 3]) {
      expect(included(cfg(qty) as GeneralBOMConfig)).toHaveLength(1);
    }
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
