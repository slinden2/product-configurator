import { vi, describe, test, expect } from "vitest";

vi.mock("@/db", () => ({
  db: { query: { partNumbers: { findMany: vi.fn().mockResolvedValue([]) } } },
}));
vi.mock("@/db/queries", () => ({
  getPartNumbersByArray: vi.fn().mockResolvedValue([]),
}));

import { brushBOM } from "@/lib/BOM/max-bom/brush-bom";
import type { GeneralBOMConfig } from "@/lib/BOM";

const cfg = (
  brush_qty: number,
  brush_type: string | null,
  brush_color: string | null,
): GeneralBOMConfig =>
  ({ brush_qty, brush_type, brush_color }) as GeneralBOMConfig;

const pns = (config: GeneralBOMConfig) =>
  brushBOM
    .filter((item) => item.conditions.every((fn) => fn(config)))
    .map((item) => item.pn);

const _qtys = (config: GeneralBOMConfig) =>
  brushBOM
    .filter((item) => item.conditions.every((fn) => fn(config)))
    .map((item) =>
      typeof item.qty === "function" ? item.qty(config) : item.qty,
    );

describe("brushBOM — no brushes (brush_qty=0)", () => {
  test("brush_qty=0 → no brush items included", () => {
    expect(pns(cfg(0, "THREAD", "BLUE_SILVER"))).toHaveLength(0);
    expect(pns(cfg(0, null, null))).toHaveLength(0);
  });
});

describe("brushBOM — blue-silver", () => {
  test("brush_qty=2, THREAD, BLUE_SILVER → 1 vertical brush (qty=2), no horizontal", () => {
    const result = brushBOM.filter((item) =>
      item.conditions.every((fn) => fn(cfg(2, "THREAD", "BLUE_SILVER"))),
    );
    expect(result).toHaveLength(1);
    expect(result[0].pn).toBe("450.16.003");
    expect(result[0].qty).toBe(2);
  });

  test("brush_qty=3, THREAD, BLUE_SILVER → vertical + horizontal", () => {
    const result = brushBOM.filter((item) =>
      item.conditions.every((fn) => fn(cfg(3, "THREAD", "BLUE_SILVER"))),
    );
    expect(result).toHaveLength(2);
    expect(result.map((i) => i.pn)).toContain("450.16.003"); // vertical
    expect(result.map((i) => i.pn)).toContain("450.17.001"); // horizontal
  });

  test("brush_qty=2, CARLITE, BLUE_SILVER → vertical Carlite included", () => {
    expect(pns(cfg(2, "CARLITE", "BLUE_SILVER"))).toContain("450.16.004");
  });
});

describe("brushBOM — green-black", () => {
  test("brush_qty=2, THREAD, GREEN_BLACK → green-black vertical included", () => {
    expect(pns(cfg(2, "THREAD", "GREEN_BLACK"))).toContain("450.16.007");
  });

  test("brush_qty=3, THREAD, GREEN_BLACK → vertical + horizontal", () => {
    const result = pns(cfg(3, "THREAD", "GREEN_BLACK"));
    expect(result).toContain("450.16.007"); // vertical
    expect(result).toContain("450.17.006"); // horizontal
    expect(result).toHaveLength(2);
  });

  test("brush_qty=2, THREAD, GREEN_BLACK → blue-silver items NOT included", () => {
    expect(pns(cfg(2, "THREAD", "GREEN_BLACK"))).not.toContain("450.16.003");
  });
});

describe("brushBOM — red", () => {
  test("brush_qty=2, THREAD, RED → red vertical included", () => {
    expect(pns(cfg(2, "THREAD", "RED"))).toContain("450.16.005");
  });

  test("brush_qty=3, THREAD, RED → vertical + horizontal", () => {
    const result = pns(cfg(3, "THREAD", "RED"));
    expect(result).toContain("450.16.005");
    expect(result).toContain("450.17.005");
  });
});

describe("brushBOM — color isolation", () => {
  test("only items matching the selected color are included", () => {
    const result = pns(cfg(2, "THREAD", "BLUE_SILVER"));
    // Should not include items from other color groups
    expect(result).not.toContain("450.16.007"); // green-black thread vertical
    expect(result).not.toContain("450.16.005"); // red thread vertical
  });

  test("horizontal brush only included when brush_qty=3", () => {
    expect(pns(cfg(2, "THREAD", "BLUE_SILVER"))).not.toContain("450.17.001");
    expect(pns(cfg(3, "THREAD", "BLUE_SILVER"))).toContain("450.17.001");
  });
});
