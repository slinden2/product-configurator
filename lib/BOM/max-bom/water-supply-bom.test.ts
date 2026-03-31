import { vi, describe, test, expect } from "vitest";

vi.mock("@/db", () => ({
  db: { query: { partNumbers: { findMany: vi.fn().mockResolvedValue([]) } } },
}));
vi.mock("@/db/queries", () => ({
  getPartNumbersByArray: vi.fn().mockResolvedValue([]),
}));

import { waterSupplyBOM } from "@/lib/BOM/max-bom/water-supply-bom";
import type { GeneralBOMConfig } from "@/lib/BOM";

function makeConfig(
  overrides: Partial<GeneralBOMConfig> = {},
): GeneralBOMConfig {
  return {
    id: 1,
    water_1_type: "NETWORK",
    water_1_pump: null,
    water_2_type: null,
    water_2_pump: null,
    has_antifreeze: false,
    inv_pump_outlet_dosatron_qty: null,
    inv_pump_outlet_pw_qty: null,
    ...overrides,
  } as GeneralBOMConfig;
}

const pns = (config: GeneralBOMConfig) =>
  waterSupplyBOM
    .filter((item) => item.conditions.every((fn) => fn(config)))
    .map((item) => item.pn);

const qty = (config: GeneralBOMConfig, pn: string) => {
  const item = waterSupplyBOM.find(
    (i) => i.pn === pn && i.conditions.every((fn) => fn(config)),
  );
  if (!item) return undefined;
  return typeof item.qty === "function" ? item.qty(config) : item.qty;
};

const PNS = {
  WASH_BAY_SOLENOID_WITH_ANTIFREEZE: "1100.060.001",
  WASH_BAY_SOLENOID_NO_ANTIFREEZE: "1100.060.002",
  WASH_BAY_2ND_SOLENOID_WITH_ANTIFREEZE: "1100.060.003",
  BOOST_PUMP_15KW: "1100.024.051",
  BOOST_PUMP_22KW: "1100.024.052",
  ELECTRIC_PANEL_15KW: "890.02.000",
  ELECTRIC_PANEL_22KW: "890.02.002",
  INV_3KW_200L: "1100.024.053",
  INV_3KW_250L: "1100.024.054",
  OUTLET_DOSATRON: "1100.024.055",
  OUTLET_PW: "1100.024.056",
};

describe("waterSupplyBOM — solenoids", () => {
  test("water_1_type set, has_antifreeze=true → solenoid, with antifreeze", () => {
    const config = makeConfig({
      water_1_type: "NETWORK",
      has_antifreeze: true,
    });
    expect(pns(config)).toContain(PNS.WASH_BAY_SOLENOID_WITH_ANTIFREEZE);
    expect(pns(config)).not.toContain(PNS.WASH_BAY_SOLENOID_NO_ANTIFREEZE);
  });

  test("water_1_type set, !has_antifreeze, no water_2 → solenoid, no antifreeze (qty=1)", () => {
    const config = makeConfig({
      water_1_type: "NETWORK",
      has_antifreeze: false,
      water_2_type: null,
    });
    expect(pns(config)).toContain(PNS.WASH_BAY_SOLENOID_NO_ANTIFREEZE);
    expect(qty(config, PNS.WASH_BAY_SOLENOID_NO_ANTIFREEZE)).toBe(1);
  });

  test("water_1 + water_2 set, !has_antifreeze → solenoid, no antifreeze (qty=2)", () => {
    const config = makeConfig({
      water_1_type: "NETWORK",
      water_2_type: "RECYCLED",
      has_antifreeze: false,
    });
    expect(pns(config)).toContain(PNS.WASH_BAY_SOLENOID_NO_ANTIFREEZE);
    expect(qty(config, PNS.WASH_BAY_SOLENOID_NO_ANTIFREEZE)).toBe(2);
  });

  test("water_2 set + has_antifreeze → 2nd solenoid with antifreeze included", () => {
    const config = makeConfig({
      water_2_type: "RECYCLED",
      has_antifreeze: true,
    });
    expect(pns(config)).toContain(PNS.WASH_BAY_2ND_SOLENOID_WITH_ANTIFREEZE);
  });

  test("no water_2 → 2nd solenoid not included", () => {
    const config = makeConfig({ water_2_type: null, has_antifreeze: true });
    expect(pns(config)).not.toContain(
      PNS.WASH_BAY_2ND_SOLENOID_WITH_ANTIFREEZE,
    );
  });
});

describe("waterSupplyBOM — boost pump 15kW", () => {
  test("water_1_pump=BOOST_15KW → boost pump 15kW + electric panel 15kW (qty=1)", () => {
    const config = makeConfig({ water_1_pump: "BOOST_15KW" });
    expect(pns(config)).toContain(PNS.BOOST_PUMP_15KW);
    expect(pns(config)).toContain(PNS.ELECTRIC_PANEL_15KW);
    expect(qty(config, PNS.BOOST_PUMP_15KW)).toBe(1);
    expect(qty(config, PNS.ELECTRIC_PANEL_15KW)).toBe(1);
  });

  test("water_1_pump=BOOST_15KW + water_2_pump=BOOST_15KW → qty=2", () => {
    const config = makeConfig({
      water_1_pump: "BOOST_15KW",
      water_2_pump: "BOOST_15KW",
      water_2_type: "RECYCLED",
    });
    expect(qty(config, PNS.BOOST_PUMP_15KW)).toBe(2);
    expect(qty(config, PNS.ELECTRIC_PANEL_15KW)).toBe(2);
  });

  test("no 15kW pump → boost pump 15kW not included", () => {
    expect(pns(makeConfig())).not.toContain(PNS.BOOST_PUMP_15KW);
  });
});

describe("waterSupplyBOM — boost pump 22kW", () => {
  test("water_1_pump=BOOST_22KW → boost pump 22kW + electric panel 22kW", () => {
    const config = makeConfig({ water_1_pump: "BOOST_22KW" });
    expect(pns(config)).toContain(PNS.BOOST_PUMP_22KW);
    expect(pns(config)).toContain(PNS.ELECTRIC_PANEL_22KW);
  });

  test("both water pumps 22kW → qty=2", () => {
    const config = makeConfig({
      water_1_pump: "BOOST_22KW",
      water_2_pump: "BOOST_22KW",
      water_2_type: "RECYCLED",
    });
    expect(qty(config, PNS.BOOST_PUMP_22KW)).toBe(2);
  });
});

describe("waterSupplyBOM — inverter pumps", () => {
  test("water_1_pump=INV_3KW_200L → inverter pump 200L/min included", () => {
    const config = makeConfig({ water_1_pump: "INV_3KW_200L" });
    expect(pns(config)).toContain(PNS.INV_3KW_200L);
    expect(pns(config)).not.toContain(PNS.INV_3KW_250L);
  });

  test("water_1_pump=INV_3KW_250L → inverter pump 250L/min included", () => {
    const config = makeConfig({ water_1_pump: "INV_3KW_250L" });
    expect(pns(config)).toContain(PNS.INV_3KW_250L);
    expect(pns(config)).not.toContain(PNS.INV_3KW_200L);
  });

  test("inv pump + inv_pump_outlet_dosatron_qty=2 → dosatron outlet (qty=2)", () => {
    const config = makeConfig({
      water_1_pump: "INV_3KW_200L",
      inv_pump_outlet_dosatron_qty: 2,
    });
    expect(pns(config)).toContain(PNS.OUTLET_DOSATRON);
    expect(qty(config, PNS.OUTLET_DOSATRON)).toBe(2);
  });

  test("inv pump + inv_pump_outlet_pw_qty=1 → pressure washer outlet included", () => {
    const config = makeConfig({
      water_1_pump: "INV_3KW_250L",
      inv_pump_outlet_pw_qty: 1,
    });
    expect(pns(config)).toContain(PNS.OUTLET_PW);
    expect(qty(config, PNS.OUTLET_PW)).toBe(1);
  });

  test("inv pump + no dosatron/pw outlets → outlet items not included", () => {
    const config = makeConfig({
      water_1_pump: "INV_3KW_200L",
      inv_pump_outlet_dosatron_qty: null,
      inv_pump_outlet_pw_qty: null,
    });
    expect(pns(config)).not.toContain(PNS.OUTLET_DOSATRON);
    expect(pns(config)).not.toContain(PNS.OUTLET_PW);
  });

  test("no inv pump → outlet items not included even with qty set", () => {
    const config = makeConfig({
      water_1_pump: "BOOST_15KW",
      inv_pump_outlet_dosatron_qty: 2,
    });
    expect(pns(config)).not.toContain(PNS.OUTLET_DOSATRON);
  });
});
