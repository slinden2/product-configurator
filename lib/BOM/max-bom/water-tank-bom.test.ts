import { vi, describe, test, expect } from "vitest";

vi.mock("@/db", () => ({
  db: { query: { partNumbers: { findMany: vi.fn().mockResolvedValue([]) } } },
}));
vi.mock("@/db/queries", () => ({
  getPartNumbersByArray: vi.fn().mockResolvedValue([]),
}));

import { waterTankBOM } from "@/lib/BOM/max-bom/water-tank-bom";
import type { WaterTank } from "@/db/schemas";

function makeTank(overrides: Partial<WaterTank> = {}): WaterTank {
  return {
    id: 1,
    type: "L2000",
    inlet_w_float_qty: 1,
    inlet_no_float_qty: 0,
    outlet_w_valve_qty: 1,
    outlet_no_valve_qty: 0,
    has_blower: false,
    created_at: new Date(),
    updated_at: new Date(),
    configuration_id: 1,
    ...overrides,
  } as WaterTank;
}

const pns = (tank: WaterTank) =>
  waterTankBOM
    .filter((item) => item.conditions.every((fn) => fn(tank)))
    .map((item) => item.pn);

const qty = (tank: WaterTank, pn: string) => {
  const item = waterTankBOM.find(
    (i) => i.pn === pn && i.conditions.every((fn) => fn(tank)),
  );
  if (!item) return undefined;
  return typeof item.qty === "function" ? item.qty(tank) : item.qty;
};

describe("waterTankBOM — tank type selection", () => {
  test("type=L2000 → standard 2000L tank", () => {
    expect(pns(makeTank({ type: "L2000" }))).toContain("921.00.201");
  });

  test("type=L2000_JOLLY → Jolly tank", () => {
    expect(pns(makeTank({ type: "L2000_JOLLY" }))).toContain("921.00.200");
  });

  test("type=L2500 → 2500L tank", () => {
    expect(pns(makeTank({ type: "L2500" }))).toContain("921.00.250");
  });

  test("type=L4500 → 4500L tank", () => {
    expect(pns(makeTank({ type: "L4500" }))).toContain("921.00.450");
  });

  test("only one tank type item is ever included", () => {
    for (const type of ["L2000", "L2000_JOLLY", "L2500", "L4500"] as const) {
      const result = pns(makeTank({ type }));
      const tankPNs = ["921.00.201", "921.00.200", "921.00.250", "921.00.450"];
      expect(result.filter((pn) => tankPNs.includes(pn))).toHaveLength(1);
    }
  });
});

describe("waterTankBOM — standard tank inlets/outlets", () => {
  test("type=L2000, inlet_w_float_qty=2 → standard inlet with float (qty=2)", () => {
    const tank = makeTank({
      type: "L2000",
      inlet_w_float_qty: 2,
      inlet_no_float_qty: 0,
    });
    expect(pns(tank)).toContain("1100.064.001");
    expect(qty(tank, "1100.064.001")).toBe(2);
  });

  test("type=L2000, inlet_no_float_qty=1 → standard inlet without float (qty=1)", () => {
    const tank = makeTank({
      type: "L2000",
      inlet_w_float_qty: 0,
      inlet_no_float_qty: 1,
    });
    expect(pns(tank)).toContain("1100.064.002");
    expect(qty(tank, "1100.064.002")).toBe(1);
  });

  test("type=L2000, outlet_w_valve_qty=2 → standard outlet with valve (qty=2)", () => {
    const tank = makeTank({
      type: "L2000",
      outlet_w_valve_qty: 2,
      outlet_no_valve_qty: 0,
    });
    expect(pns(tank)).toContain("1100.064.005");
    expect(qty(tank, "1100.064.005")).toBe(2);
  });

  test("type=L2000, outlet_no_valve_qty=1 → standard outlet without valve (qty=1)", () => {
    const tank = makeTank({
      type: "L2000",
      outlet_no_valve_qty: 1,
      outlet_w_valve_qty: 0,
    });
    expect(pns(tank)).toContain("1100.064.006");
  });
});

describe("waterTankBOM — Jolly tank inlets/outlets", () => {
  test("type=L2000_JOLLY → uses Jolly inlet with float, not standard", () => {
    const tank = makeTank({
      type: "L2000_JOLLY",
      inlet_w_float_qty: 1,
      inlet_no_float_qty: 0,
    });
    expect(pns(tank)).toContain("1100.064.003"); // Jolly inlet w float
    expect(pns(tank)).not.toContain("1100.064.001"); // standard inlet w float excluded
  });

  test("type=L2000_JOLLY, inlet_no_float_qty=1 → Jolly inlet without float", () => {
    const tank = makeTank({
      type: "L2000_JOLLY",
      inlet_w_float_qty: 0,
      inlet_no_float_qty: 1,
    });
    expect(pns(tank)).toContain("1100.064.004");
  });

  test("type=L2000_JOLLY → uses Jolly outlet with valve, not standard", () => {
    const tank = makeTank({
      type: "L2000_JOLLY",
      outlet_w_valve_qty: 1,
      outlet_no_valve_qty: 0,
    });
    expect(pns(tank)).toContain("1100.064.007"); // Jolly outlet w valve
    expect(pns(tank)).not.toContain("1100.064.005"); // standard outlet excluded
  });

  test("type=L2000_JOLLY, outlet_no_valve_qty=1 → Jolly outlet without valve", () => {
    const tank = makeTank({
      type: "L2000_JOLLY",
      outlet_no_valve_qty: 1,
      outlet_w_valve_qty: 0,
    });
    expect(pns(tank)).toContain("1100.064.008");
  });
});

describe("waterTankBOM — blower", () => {
  test("has_blower=false → blower not included", () => {
    expect(pns(makeTank({ has_blower: false }))).not.toContain("1100.064.009");
  });

  test("has_blower=true → blower included", () => {
    expect(pns(makeTank({ has_blower: true }))).toContain("1100.064.009");
  });
});

describe("waterTankBOM — zero qty items excluded", () => {
  test("inlet_w_float_qty=0 → inlet with float not included", () => {
    const tank = makeTank({ type: "L2000", inlet_w_float_qty: 0 });
    expect(pns(tank)).not.toContain("1100.064.001");
  });

  test("outlet_w_valve_qty=0 → outlet with valve not included", () => {
    const tank = makeTank({ type: "L2000", outlet_w_valve_qty: 0 });
    expect(pns(tank)).not.toContain("1100.064.005");
  });
});
