import { vi, describe, test, expect } from "vitest";

vi.mock("@/db", () => ({ db: { query: { partNumbers: { findMany: vi.fn().mockResolvedValue([]) } } } }));
vi.mock("@/db/queries", () => ({ getPartNumbersByArray: vi.fn().mockResolvedValue([]) }));

import { dosingPumpBOM } from "@/lib/BOM/max-bom/dosing-pump-bom";
import type { GeneralBOMConfig } from "@/lib/BOM";

function makeConfig(overrides: Partial<GeneralBOMConfig> = {}): GeneralBOMConfig {
  return {
    id: 1,
    has_shampoo_pump: false,
    has_wax_pump: false,
    has_chemical_pump: false,
    chemical_qty: null,
    chemical_pump_pos: null,
    has_foam: false,
    has_acid_pump: false,
    acid_pump_pos: null,
    has_antifreeze: false,
    has_itecoweb: false,
    ...overrides,
  } as GeneralBOMConfig;
}

const pns = (config: GeneralBOMConfig) =>
  dosingPumpBOM
    .filter((item) => item.conditions.every((fn) => fn(config)))
    .map((item) => item.pn);

const qty = (config: GeneralBOMConfig, pn: string) => {
  const item = dosingPumpBOM.find(
    (i) => i.pn === pn && i.conditions.every((fn) => fn(config))
  );
  if (!item) return undefined;
  return typeof item.qty === "function" ? item.qty(config) : item.qty;
};

const PNS = {
  SHAMPOO_PUMP_NO_ALARM: "450.03.022",
  SHAMPOO_PUMP_WITH_ALARM: "450.03.025",
  WAX_PUMP_NO_ALARM: "450.03.024",
  WAX_PUMP_WITH_ALARM: "450.03.027",
  CHEMICAL_PUMP_NO_ALARM: "450.03.023",
  CHEMICAL_PUMP_WITH_ALARM: "450.03.026",
  ACID_PUMP_WITH_ALARM: "450.03.028",
  DOSATRON_NO_ANTIFREEZE: "1100.061.004",
  DOSATRON_WITH_ANTIFREEZE: "1100.061.001",
  DOSATRON_ACID_NO_ANTIFREEZE: "1100.061.006",
  DOSATRON_ACID_WITH_ANTIFREEZE: "1100.061.005",
  FLOAT_SWITCH_FOR_DOSATRON: "1100.061.002",
  FOAM_KIT: "852.00.000",
};

describe("dosingPumpBOM — shampoo pump", () => {
  test("has_shampoo_pump, !has_itecoweb → shampoo pump without alarm", () => {
    const config = makeConfig({ has_shampoo_pump: true, has_itecoweb: false });
    expect(pns(config)).toContain(PNS.SHAMPOO_PUMP_NO_ALARM);
    expect(pns(config)).not.toContain(PNS.SHAMPOO_PUMP_WITH_ALARM);
  });

  test("has_shampoo_pump, has_itecoweb → shampoo pump with alarm", () => {
    const config = makeConfig({ has_shampoo_pump: true, has_itecoweb: true });
    expect(pns(config)).toContain(PNS.SHAMPOO_PUMP_WITH_ALARM);
    expect(pns(config)).not.toContain(PNS.SHAMPOO_PUMP_NO_ALARM);
  });

  test("no shampoo pump → neither shampoo pump item included", () => {
    const config = makeConfig({ has_shampoo_pump: false });
    expect(pns(config)).not.toContain(PNS.SHAMPOO_PUMP_NO_ALARM);
    expect(pns(config)).not.toContain(PNS.SHAMPOO_PUMP_WITH_ALARM);
  });
});

describe("dosingPumpBOM — wax pump", () => {
  test("has_wax_pump, !has_itecoweb → wax pump without alarm", () => {
    const config = makeConfig({ has_wax_pump: true, has_itecoweb: false });
    expect(pns(config)).toContain(PNS.WAX_PUMP_NO_ALARM);
    expect(pns(config)).not.toContain(PNS.WAX_PUMP_WITH_ALARM);
  });

  test("has_wax_pump, has_itecoweb → wax pump with alarm", () => {
    const config = makeConfig({ has_wax_pump: true, has_itecoweb: true });
    expect(pns(config)).toContain(PNS.WAX_PUMP_WITH_ALARM);
    expect(pns(config)).not.toContain(PNS.WAX_PUMP_NO_ALARM);
  });
});

describe("dosingPumpBOM — chemical pump (ONBOARD position)", () => {
  test("chemical_pump_pos=ONBOARD, !has_itecoweb → chemical pump without alarm", () => {
    const config = makeConfig({
      has_chemical_pump: true,
      chemical_pump_pos: "ONBOARD",
      chemical_qty: 1,
      has_itecoweb: false,
    });
    expect(pns(config)).toContain(PNS.CHEMICAL_PUMP_NO_ALARM);
    expect(pns(config)).not.toContain(PNS.CHEMICAL_PUMP_WITH_ALARM);
  });

  test("chemical_pump_pos=ONBOARD, has_itecoweb → chemical pump with alarm (qty=chemical_qty)", () => {
    const config = makeConfig({
      has_chemical_pump: true,
      chemical_pump_pos: "ONBOARD",
      chemical_qty: 2,
      has_itecoweb: true,
    });
    expect(pns(config)).toContain(PNS.CHEMICAL_PUMP_WITH_ALARM);
    expect(qty(config, PNS.CHEMICAL_PUMP_WITH_ALARM)).toBe(2);
  });
});

describe("dosingPumpBOM — acid pump (ONBOARD position)", () => {
  test("has_acid_pump, acid_pump_pos=ONBOARD → acid pump with alarm", () => {
    const config = makeConfig({ has_acid_pump: true, acid_pump_pos: "ONBOARD" });
    expect(pns(config)).toContain(PNS.ACID_PUMP_WITH_ALARM);
  });

  test("has_acid_pump, acid_pump_pos=WASH_BAY → acid pump NOT included (is a dosatron)", () => {
    const config = makeConfig({ has_acid_pump: true, acid_pump_pos: "WASH_BAY" });
    expect(pns(config)).not.toContain(PNS.ACID_PUMP_WITH_ALARM);
  });
});

describe("dosingPumpBOM — dosatrons (WASH_BAY position)", () => {
  test("chemical WASH_BAY, !has_antifreeze → dosatron without antifreeze (qty=chemical_qty)", () => {
    const config = makeConfig({
      has_chemical_pump: true,
      chemical_pump_pos: "WASH_BAY",
      chemical_qty: 2,
      has_antifreeze: false,
    });
    expect(pns(config)).toContain(PNS.DOSATRON_NO_ANTIFREEZE);
    expect(qty(config, PNS.DOSATRON_NO_ANTIFREEZE)).toBe(2);
  });

  test("chemical WASH_BAY, has_antifreeze → dosatron with antifreeze", () => {
    const config = makeConfig({
      has_chemical_pump: true,
      chemical_pump_pos: "WASH_BAY",
      chemical_qty: 1,
      has_antifreeze: true,
    });
    expect(pns(config)).toContain(PNS.DOSATRON_WITH_ANTIFREEZE);
    expect(pns(config)).not.toContain(PNS.DOSATRON_NO_ANTIFREEZE);
  });

  test("acid WASH_BAY, !has_antifreeze → dosatron acid without antifreeze", () => {
    const config = makeConfig({
      has_acid_pump: true,
      acid_pump_pos: "WASH_BAY",
      has_antifreeze: false,
    });
    expect(pns(config)).toContain(PNS.DOSATRON_ACID_NO_ANTIFREEZE);
    expect(pns(config)).not.toContain(PNS.DOSATRON_ACID_WITH_ANTIFREEZE);
  });

  test("acid WASH_BAY, has_antifreeze → dosatron acid with antifreeze", () => {
    const config = makeConfig({
      has_acid_pump: true,
      acid_pump_pos: "WASH_BAY",
      has_antifreeze: true,
    });
    expect(pns(config)).toContain(PNS.DOSATRON_ACID_WITH_ANTIFREEZE);
    expect(pns(config)).not.toContain(PNS.DOSATRON_ACID_NO_ANTIFREEZE);
  });
});

describe("dosingPumpBOM — float switch for dosatron", () => {
  test("chemical WASH_BAY + has_itecoweb → float switch included (qty=chemical_qty)", () => {
    const config = makeConfig({
      has_chemical_pump: true,
      chemical_pump_pos: "WASH_BAY",
      chemical_qty: 2,
      has_itecoweb: true,
    });
    expect(pns(config)).toContain(PNS.FLOAT_SWITCH_FOR_DOSATRON);
    expect(qty(config, PNS.FLOAT_SWITCH_FOR_DOSATRON)).toBe(2);
  });

  test("acid WASH_BAY + has_itecoweb → float switch included (qty +1 for acid)", () => {
    const config = makeConfig({
      has_acid_pump: true,
      acid_pump_pos: "WASH_BAY",
      has_itecoweb: true,
    });
    expect(pns(config)).toContain(PNS.FLOAT_SWITCH_FOR_DOSATRON);
    expect(qty(config, PNS.FLOAT_SWITCH_FOR_DOSATRON)).toBe(1);
  });

  test("chemical + acid both WASH_BAY + has_itecoweb → combined float switch qty", () => {
    const config = makeConfig({
      has_chemical_pump: true,
      chemical_pump_pos: "WASH_BAY",
      chemical_qty: 1,
      has_acid_pump: true,
      acid_pump_pos: "WASH_BAY",
      has_itecoweb: true,
    });
    expect(qty(config, PNS.FLOAT_SWITCH_FOR_DOSATRON)).toBe(2); // 1 chemical + 1 acid
  });

  test("chemical WASH_BAY but !has_itecoweb → float switch not included", () => {
    const config = makeConfig({
      has_chemical_pump: true,
      chemical_pump_pos: "WASH_BAY",
      chemical_qty: 1,
      has_itecoweb: false,
    });
    expect(pns(config)).not.toContain(PNS.FLOAT_SWITCH_FOR_DOSATRON);
  });
});

describe("dosingPumpBOM — foam kit", () => {
  test("has_chemical_pump + has_foam → foam kit included", () => {
    const config = makeConfig({ has_chemical_pump: true, has_foam: true });
    expect(pns(config)).toContain(PNS.FOAM_KIT);
  });

  test("has_chemical_pump + !has_foam → foam kit not included", () => {
    const config = makeConfig({ has_chemical_pump: true, has_foam: false });
    expect(pns(config)).not.toContain(PNS.FOAM_KIT);
  });

  test("!has_chemical_pump + has_foam → foam kit not included", () => {
    const config = makeConfig({ has_chemical_pump: false, has_foam: true });
    expect(pns(config)).not.toContain(PNS.FOAM_KIT);
  });
});
