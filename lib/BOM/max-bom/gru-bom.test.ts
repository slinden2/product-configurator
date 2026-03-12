import { vi, describe, test, expect } from "vitest";

vi.mock("@/db", () => ({ db: { query: { partNumbers: { findMany: vi.fn().mockResolvedValue([]) } } } }));
vi.mock("@/db/queries", () => ({ getPartNumbersByArray: vi.fn().mockResolvedValue([]) }));

import { gruBOM } from "@/lib/BOM/max-bom/gru-bom";
import type { Configuration } from "@/db/schemas";

const cfg = (brush_qty: number) =>
  ({ brush_qty } as Parameters<typeof gruBOM[0]["conditions"][0]>[0]);

const included = (config: Configuration) =>
  gruBOM.filter((item) => item.conditions.every((fn) => fn(config)));

describe("gruBOM", () => {
  test("brush_qty=0 → only zero-brush GRU included", () => {
    const items = included(cfg(0) as Configuration);
    expect(items).toHaveLength(1);
    expect(items[0].pn).toBe("450.0E.GRU0");
  });

  test("brush_qty=2 → only two-brush GRU included", () => {
    const items = included(cfg(2) as Configuration);
    expect(items).toHaveLength(1);
    expect(items[0].pn).toBe("450.0E.GRU2");
  });

  test("brush_qty=3 → only three-brush GRU included", () => {
    const items = included(cfg(3) as Configuration);
    expect(items).toHaveLength(1);
    expect(items[0].pn).toBe("450.0E.GRU");
  });

  test("exactly one GRU item is always selected for valid brush quantities", () => {
    for (const qty of [0, 2, 3]) {
      expect(included(cfg(qty) as Configuration)).toHaveLength(1);
    }
  });
});
