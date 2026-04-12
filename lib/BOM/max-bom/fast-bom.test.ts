import { describe, expect, test, vi } from "vitest";

vi.mock("@/db", () => ({
  db: { query: { partNumbers: { findMany: vi.fn().mockResolvedValue([]) } } },
}));
vi.mock("@/db/queries", () => ({
  getPartNumbersByArray: vi.fn().mockResolvedValue([]),
}));

import type { GeneralBOMConfig } from "@/lib/BOM";
import { fastBOM } from "@/lib/BOM/max-bom/fast-bom";

const cfg = (is_fast: boolean, brush_qty: number) =>
  ({ is_fast, brush_qty }) as GeneralBOMConfig;

const pns = (config: GeneralBOMConfig) =>
  fastBOM
    .filter((item) => item.conditions.every((fn) => fn(config)))
    .map((item) => item.pn);

const PNUMS = {
  ADDITIONAL_LATERAL_RINSE_BARS: "450.65.000",
  ADDITIONAL_RINSE_ARCH: "450.65.002",
  LONG_PHOTOCELL_SUPPORTS: "926.03.000",
  POSTERIOR_TRAFFIC_LIGHTS: "926.01.000",
};

describe("fastBOM — not fast", () => {
  test("!is_fast, brush_qty=2 → no fast items", () => {
    expect(pns(cfg(false, 2))).toEqual([]);
  });

  test("!is_fast, brush_qty=3 → no fast items", () => {
    expect(pns(cfg(false, 3))).toEqual([]);
  });
});

describe("fastBOM — is fast", () => {
  test("is_fast, brush_qty=2 → lateral rinse bars + long photocell + traffic lights", () => {
    expect(pns(cfg(true, 2))).toEqual([
      PNUMS.ADDITIONAL_LATERAL_RINSE_BARS,
      PNUMS.LONG_PHOTOCELL_SUPPORTS,
      PNUMS.POSTERIOR_TRAFFIC_LIGHTS,
    ]);
  });

  test("is_fast, brush_qty=3 → rinse arch + long photocell + traffic lights", () => {
    expect(pns(cfg(true, 3))).toEqual([
      PNUMS.ADDITIONAL_RINSE_ARCH,
      PNUMS.LONG_PHOTOCELL_SUPPORTS,
      PNUMS.POSTERIOR_TRAFFIC_LIGHTS,
    ]);
  });

  test("!is_fast never includes long photocell supports or traffic lights", () => {
    expect(pns(cfg(false, 2))).not.toContain(PNUMS.LONG_PHOTOCELL_SUPPORTS);
    expect(pns(cfg(false, 2))).not.toContain(PNUMS.POSTERIOR_TRAFFIC_LIGHTS);
  });
});
