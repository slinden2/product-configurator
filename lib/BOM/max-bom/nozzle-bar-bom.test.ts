import { describe, expect, test, vi } from "vitest";

vi.mock("@/db", () => ({
  db: { query: { partNumbers: { findMany: vi.fn().mockResolvedValue([]) } } },
}));
vi.mock("@/db/queries", () => ({
  getPartNumbersByArray: vi.fn().mockResolvedValue([]),
}));

import type { GeneralBOMConfig } from "@/lib/BOM";
import { nozzleBarBOM } from "@/lib/BOM/max-bom/nozzle-bar-bom";
import { makeGeneralBOMConfig as makeConfig } from "@/test/bom-test-utils";

const pns = (config: GeneralBOMConfig) =>
  nozzleBarBOM
    .filter((item) => item.conditions.every((fn) => fn(config)))
    .map((item) => item.pn);

const qty = (config: GeneralBOMConfig, pn: string) => {
  // Find first matching item with this pn (there may be duplicate pns for different conditions)
  const item = nozzleBarBOM.find(
    (i) => i.pn === pn && i.conditions.every((fn) => fn(config)),
  );
  if (!item) return undefined;
  return typeof item.qty === "function" ? item.qty(config) : item.qty;
};

const PNS = {
  PREWASH_ARCH: "450.36.000",
  RINSE_ARCH: "450.36.001",
  POSTERIOR_LATERAL_PREWASH_BARS: "450.36.002",
  PREWASH_ARCH_ACID_INOX: "450.36.003IN",
  LATERAL_PREWASH_BARS: "450.36.004",
  LATERAL_RINSE_BARS: "450.36.005",
  PREWASH_ARCH_2_CHEMICALS: "450.36.007",
  POSTERIOR_LATERAL_PREWASH_BARS_2_CHEMICALS: "450.36.008",
  FLOW_SWITCH: "450.36.060",
  RINSE_SOLENOIDS_PREWASH_ONBOARD: "450.36.070",
  RINSE_SOLENOID_PREWASH_WASH_BAY: "450.36.071",
  PREWASH_SOLENOID_PREWASH_ONBOARD: "450.36.072",
  PREWASH_SOLENOIDS_HP_ROOF_BAR_PREWASH_ONBOARD: "450.36.073",
  FITTINGS_FOR_PREWASH_WASH_BAY: "450.36.074",
  PREWASH_SOLENOIDS_HP_ROOF_BAR_PREWASH_WASH_BAY: "450.36.075",
  FITTINGS_FOR_WAX_PUMP: "450.36.076",
  FITTINGS_FOR_RINSE_WITHOUT_PREWASH: "450.36.077",
  FITTINGS_FOR_DOUBLE_SUPPLY: "450.36.078",
  // INOX
  PREWASH_ARCH_INOX: "450.36.000IN",
  RINSE_ARCH_INOX: "450.36.001IN",
  POSTERIOR_LATERAL_PREWASH_BARS_INOX: "450.36.002IN",
  FLOW_SWITCH_INOX: "450.36.060IN",
  RINSE_SOLENOIDS_PREWASH_ONBOARD_INOX: "450.36.070IN",
  RINSE_SOLENOID_PREWASH_WASH_BAY_INOX: "450.36.071IN",
  PREWASH_SOLENOID_PREWASH_ONBOARD_INOX: "450.36.072IN",
  PREWASH_SOLENOIDS_HP_ROOF_BAR_PREWASH_ONBOARD_INOX: "450.36.073IN",
  FITTINGS_FOR_PREWASH_WASH_BAY_INOX: "450.36.074IN",
  PREWASH_SOLENOIDS_HP_ROOF_BAR_PREWASH_WASH_BAY_INOX: "450.36.075IN",
  FITTINGS_FOR_WAX_PUMP_INOX: "450.36.076IN",
  FITTINGS_FOR_RINSE_WITHOUT_PREWASH_INOX: "450.36.077IN",
  FITTINGS_FOR_DOUBLE_SUPPLY_INOX: "450.36.078IN",
};

describe("nozzleBarBOM — rinse arch/bars", () => {
  test("brush_qty=3 → rinse arch included", () => {
    expect(pns(makeConfig({ brush_qty: 3 }))).toContain(PNS.RINSE_ARCH);
  });

  test("brush_qty=2 → lateral rinse bars included (not rinse arch)", () => {
    const result = pns(makeConfig({ brush_qty: 2 }));
    expect(result).toContain(PNS.LATERAL_RINSE_BARS);
    expect(result).not.toContain(PNS.RINSE_ARCH);
  });

  test("brush_qty=0 → no rinse arch or lateral rinse bars", () => {
    const result = pns(makeConfig({ brush_qty: 0 }));
    expect(result).not.toContain(PNS.RINSE_ARCH);
    expect(result).not.toContain(PNS.LATERAL_RINSE_BARS);
  });
});

describe("nozzleBarBOM — rinse solenoid and fittings", () => {
  test("brush_qty=2, no chemicals → fittings for rinse without prewash", () => {
    const config = makeConfig({
      brush_qty: 2,
      has_chemical_pump: false,
      has_acid_pump: false,
    });
    expect(pns(config)).toContain(PNS.FITTINGS_FOR_RINSE_WITHOUT_PREWASH);
    expect(pns(config)).not.toContain(PNS.RINSE_SOLENOIDS_PREWASH_ONBOARD);
    expect(pns(config)).not.toContain(PNS.RINSE_SOLENOID_PREWASH_WASH_BAY);
  });

  test("brush_qty=2, chemical onboard → rinse solenoids (prewash onboard)", () => {
    const config = makeConfig({
      brush_qty: 2,
      has_chemical_pump: true,
      chemical_pump_pos: "ONBOARD",
      chemical_qty: 1,
    });
    expect(pns(config)).toContain(PNS.RINSE_SOLENOIDS_PREWASH_ONBOARD);
    expect(pns(config)).not.toContain(PNS.RINSE_SOLENOID_PREWASH_WASH_BAY);
  });

  test("brush_qty=2, chemical in wash bay → rinse solenoid (wash bay)", () => {
    const config = makeConfig({
      brush_qty: 2,
      has_chemical_pump: true,
      chemical_pump_pos: "WASH_BAY",
      chemical_qty: 1,
    });
    expect(pns(config)).toContain(PNS.RINSE_SOLENOID_PREWASH_WASH_BAY);
    expect(pns(config)).not.toContain(PNS.RINSE_SOLENOIDS_PREWASH_ONBOARD);
  });

  test("brush_qty=2, acid onboard → rinse solenoids (prewash onboard)", () => {
    const config = makeConfig({
      brush_qty: 2,
      has_acid_pump: true,
      acid_pump_pos: "ONBOARD",
    });
    expect(pns(config)).toContain(PNS.RINSE_SOLENOIDS_PREWASH_ONBOARD);
  });
});

describe("nozzleBarBOM — prewash arch (1 chemical)", () => {
  test("brush_qty=3, 1 chemical, no chemical roof bar → prewash arch", () => {
    const config = makeConfig({
      brush_qty: 3,
      has_chemical_pump: true,
      chemical_qty: 1,
      chemical_pump_pos: "ONBOARD",
    });
    expect(pns(config)).toContain(PNS.PREWASH_ARCH);
  });

  test("brush_qty=2, 1 chemical, no chemical roof bar → lateral prewash bars (not prewash arch)", () => {
    const config = makeConfig({
      brush_qty: 2,
      has_chemical_pump: true,
      chemical_qty: 1,
      chemical_pump_pos: "ONBOARD",
    });
    expect(pns(config)).toContain(PNS.LATERAL_PREWASH_BARS);
    expect(pns(config)).not.toContain(PNS.PREWASH_ARCH);
  });

  test("1 chemical + chemical roof bar → posterior lateral prewash bars (not prewash arch)", () => {
    const config = makeConfig({
      brush_qty: 3,
      has_chemical_pump: true,
      chemical_qty: 1,
      has_omz_pump: true,
      pump_outlet_omz: "HP_ROOF_BAR",
      has_chemical_roof_bar: true,
    });
    expect(pns(config)).toContain(PNS.POSTERIOR_LATERAL_PREWASH_BARS);
    expect(pns(config)).not.toContain(PNS.PREWASH_ARCH);
  });
});

describe("nozzleBarBOM — prewash (2 chemicals)", () => {
  test("2 chemicals, brush_qty=3, no chemical roof bar → prewash arch 2 chemicals", () => {
    const config = makeConfig({
      brush_qty: 3,
      has_chemical_pump: true,
      chemical_qty: 2,
      chemical_pump_pos: "ONBOARD",
    });
    expect(pns(config)).toContain(PNS.PREWASH_ARCH_2_CHEMICALS);
    expect(pns(config)).not.toContain(
      PNS.POSTERIOR_LATERAL_PREWASH_BARS_2_CHEMICALS,
    );
  });

  test("2 chemicals + chemical roof bar → posterior lateral prewash bars 2 chemicals", () => {
    const config = makeConfig({
      brush_qty: 3,
      has_chemical_pump: true,
      chemical_qty: 2,
      has_omz_pump: true,
      pump_outlet_omz: "HP_ROOF_BAR",
      has_chemical_roof_bar: true,
    });
    expect(pns(config)).toContain(
      PNS.POSTERIOR_LATERAL_PREWASH_BARS_2_CHEMICALS,
    );
    expect(pns(config)).not.toContain(PNS.PREWASH_ARCH_2_CHEMICALS);
  });
});

describe("nozzleBarBOM — flow switch (itecoweb)", () => {
  test("has_itecoweb=true → flow switch included", () => {
    expect(pns(makeConfig({ has_itecoweb: true }))).toContain(PNS.FLOW_SWITCH);
  });

  test("has_itecoweb=false → flow switch not included", () => {
    expect(pns(makeConfig({ has_itecoweb: false }))).not.toContain(
      PNS.FLOW_SWITCH,
    );
  });
});

describe("nozzleBarBOM — prewash solenoids (chemical onboard)", () => {
  test("chemical onboard, 1 chemical, no roof bar → prewash solenoid (qty=1)", () => {
    const config = makeConfig({
      brush_qty: 2,
      has_chemical_pump: true,
      chemical_pump_pos: "ONBOARD",
      chemical_qty: 1,
    });
    expect(pns(config)).toContain(PNS.PREWASH_SOLENOID_PREWASH_ONBOARD);
    expect(qty(config, PNS.PREWASH_SOLENOID_PREWASH_ONBOARD)).toBe(1);
  });

  test("chemical onboard, 2 chemicals, no roof bar → prewash solenoid (qty=2)", () => {
    const config = makeConfig({
      brush_qty: 2,
      has_chemical_pump: true,
      chemical_pump_pos: "ONBOARD",
      chemical_qty: 2,
    });
    expect(qty(config, PNS.PREWASH_SOLENOID_PREWASH_ONBOARD)).toBe(2);
  });

  test("chemical onboard + chemical roof bar → HP roof bar solenoids included", () => {
    const config = makeConfig({
      brush_qty: 2,
      has_chemical_pump: true,
      chemical_pump_pos: "ONBOARD",
      chemical_qty: 1,
      has_omz_pump: true,
      pump_outlet_omz: "HP_ROOF_BAR",
      has_chemical_roof_bar: true,
    });
    expect(pns(config)).toContain(
      PNS.PREWASH_SOLENOIDS_HP_ROOF_BAR_PREWASH_ONBOARD,
    );
  });
});

describe("nozzleBarBOM — prewash fittings (chemical wash bay)", () => {
  test("chemical WASH_BAY, 1 chemical, no roof bar → fittings for prewash (qty=1)", () => {
    const config = makeConfig({
      brush_qty: 2,
      has_chemical_pump: true,
      chemical_pump_pos: "WASH_BAY",
      chemical_qty: 1,
    });
    expect(pns(config)).toContain(PNS.FITTINGS_FOR_PREWASH_WASH_BAY);
    expect(qty(config, PNS.FITTINGS_FOR_PREWASH_WASH_BAY)).toBe(1);
  });

  test("chemical WASH_BAY + chemical roof bar → HP roof bar solenoids (wash bay)", () => {
    const config = makeConfig({
      brush_qty: 2,
      has_chemical_pump: true,
      chemical_pump_pos: "WASH_BAY",
      chemical_qty: 1,
      has_omz_pump: true,
      pump_outlet_omz: "HP_ROOF_BAR",
      has_chemical_roof_bar: true,
    });
    expect(pns(config)).toContain(
      PNS.PREWASH_SOLENOIDS_HP_ROOF_BAR_PREWASH_WASH_BAY,
    );
  });
});

describe("nozzleBarBOM — acid pump", () => {
  test("has_acid_pump → acid prewash arch inox included", () => {
    expect(
      pns(makeConfig({ has_acid_pump: true, acid_pump_pos: "ONBOARD" })),
    ).toContain(PNS.PREWASH_ARCH_ACID_INOX);
  });

  test("acid ONBOARD → acid solenoid onboard inox", () => {
    expect(
      pns(makeConfig({ has_acid_pump: true, acid_pump_pos: "ONBOARD" })),
    ).toContain("450.36.072IN");
  });

  test("acid WASH_BAY → fittings for acid wash bay inox", () => {
    expect(
      pns(makeConfig({ has_acid_pump: true, acid_pump_pos: "WASH_BAY" })),
    ).toContain("450.36.074IN");
  });
});

describe("nozzleBarBOM — other", () => {
  test("has_wax_pump → fittings for wax pump", () => {
    expect(pns(makeConfig({ has_wax_pump: true }))).toContain(
      PNS.FITTINGS_FOR_WAX_PUMP,
    );
  });

  test("water_2_type set + supply_type != ENERGY_CHAIN → fittings for double supply", () => {
    const config = makeConfig({
      water_2_type: "RECYCLED",
      supply_type: "STRAIGHT_SHELF",
    });
    expect(pns(config)).toContain(PNS.FITTINGS_FOR_DOUBLE_SUPPLY);
  });

  test("water_2_type set + supply_type = ENERGY_CHAIN → fittings for double supply NOT included", () => {
    const config = makeConfig({
      water_2_type: "RECYCLED",
      supply_type: "ENERGY_CHAIN",
    });
    expect(pns(config)).not.toContain(PNS.FITTINGS_FOR_DOUBLE_SUPPLY);
  });
});

describe("nozzleBarBOM — OMZ uses INOX variants", () => {
  test("OMZ + brush_qty=3 → rinse arch INOX (not STD)", () => {
    const config = makeConfig({ brush_qty: 3, machine_type: "OMZ" });
    expect(pns(config)).toContain(PNS.RINSE_ARCH_INOX);
    expect(pns(config)).not.toContain(PNS.RINSE_ARCH);
  });

  test("OMZ + rinse solenoid (prewash onboard) → INOX variant", () => {
    const config = makeConfig({
      brush_qty: 2,
      has_chemical_pump: true,
      chemical_pump_pos: "ONBOARD",
      chemical_qty: 1,
      machine_type: "OMZ",
    });
    expect(pns(config)).toContain(PNS.RINSE_SOLENOIDS_PREWASH_ONBOARD_INOX);
    expect(pns(config)).not.toContain(PNS.RINSE_SOLENOIDS_PREWASH_ONBOARD);
  });

  test("OMZ + rinse solenoid (prewash wash bay) → INOX variant", () => {
    const config = makeConfig({
      brush_qty: 2,
      has_chemical_pump: true,
      chemical_pump_pos: "WASH_BAY",
      chemical_qty: 1,
      machine_type: "OMZ",
    });
    expect(pns(config)).toContain(PNS.RINSE_SOLENOID_PREWASH_WASH_BAY_INOX);
    expect(pns(config)).not.toContain(PNS.RINSE_SOLENOID_PREWASH_WASH_BAY);
  });

  test("OMZ + no chemicals → fittings for rinse without prewash INOX", () => {
    const config = makeConfig({ brush_qty: 2, machine_type: "OMZ" });
    expect(pns(config)).toContain(PNS.FITTINGS_FOR_RINSE_WITHOUT_PREWASH_INOX);
    expect(pns(config)).not.toContain(PNS.FITTINGS_FOR_RINSE_WITHOUT_PREWASH);
  });

  test("OMZ + 1 chemical, no roof bar → prewash arch INOX", () => {
    const config = makeConfig({
      brush_qty: 3,
      has_chemical_pump: true,
      chemical_qty: 1,
      chemical_pump_pos: "ONBOARD",
      machine_type: "OMZ",
    });
    expect(pns(config)).toContain(PNS.PREWASH_ARCH_INOX);
    expect(pns(config)).not.toContain(PNS.PREWASH_ARCH);
  });

  test("OMZ + 1 chemical + chemical roof bar → posterior lateral prewash bars INOX", () => {
    const config = makeConfig({
      brush_qty: 3,
      has_chemical_pump: true,
      chemical_qty: 1,
      has_omz_pump: true,
      pump_outlet_omz: "HP_ROOF_BAR",
      has_chemical_roof_bar: true,
      machine_type: "OMZ",
    });
    expect(pns(config)).toContain(PNS.POSTERIOR_LATERAL_PREWASH_BARS_INOX);
    expect(pns(config)).not.toContain(PNS.POSTERIOR_LATERAL_PREWASH_BARS);
  });

  test("OMZ + has_itecoweb → flow switch INOX", () => {
    const config = makeConfig({ has_itecoweb: true, machine_type: "OMZ" });
    expect(pns(config)).toContain(PNS.FLOW_SWITCH_INOX);
    expect(pns(config)).not.toContain(PNS.FLOW_SWITCH);
  });

  test("OMZ + chemical onboard, no roof bar → prewash solenoid INOX (qty=1)", () => {
    const config = makeConfig({
      brush_qty: 2,
      has_chemical_pump: true,
      chemical_pump_pos: "ONBOARD",
      chemical_qty: 1,
      machine_type: "OMZ",
    });
    expect(pns(config)).toContain(PNS.PREWASH_SOLENOID_PREWASH_ONBOARD_INOX);
    expect(pns(config)).not.toContain(PNS.PREWASH_SOLENOID_PREWASH_ONBOARD);
    expect(qty(config, PNS.PREWASH_SOLENOID_PREWASH_ONBOARD_INOX)).toBe(1);
  });

  test("OMZ + chemical onboard + chemical roof bar → HP roof bar solenoids INOX", () => {
    const config = makeConfig({
      brush_qty: 2,
      has_chemical_pump: true,
      chemical_pump_pos: "ONBOARD",
      chemical_qty: 1,
      has_omz_pump: true,
      pump_outlet_omz: "HP_ROOF_BAR",
      has_chemical_roof_bar: true,
      machine_type: "OMZ",
    });
    expect(pns(config)).toContain(
      PNS.PREWASH_SOLENOIDS_HP_ROOF_BAR_PREWASH_ONBOARD_INOX,
    );
    expect(pns(config)).not.toContain(
      PNS.PREWASH_SOLENOIDS_HP_ROOF_BAR_PREWASH_ONBOARD,
    );
  });

  test("OMZ + chemical WASH_BAY, no roof bar → fittings for prewash INOX (qty=1)", () => {
    const config = makeConfig({
      brush_qty: 2,
      has_chemical_pump: true,
      chemical_pump_pos: "WASH_BAY",
      chemical_qty: 1,
      machine_type: "OMZ",
    });
    expect(pns(config)).toContain(PNS.FITTINGS_FOR_PREWASH_WASH_BAY_INOX);
    expect(pns(config)).not.toContain(PNS.FITTINGS_FOR_PREWASH_WASH_BAY);
    expect(qty(config, PNS.FITTINGS_FOR_PREWASH_WASH_BAY_INOX)).toBe(1);
  });

  test("OMZ + chemical WASH_BAY + chemical roof bar → HP roof bar solenoids wash bay INOX", () => {
    const config = makeConfig({
      brush_qty: 2,
      has_chemical_pump: true,
      chemical_pump_pos: "WASH_BAY",
      chemical_qty: 1,
      has_omz_pump: true,
      pump_outlet_omz: "HP_ROOF_BAR",
      has_chemical_roof_bar: true,
      machine_type: "OMZ",
    });
    expect(pns(config)).toContain(
      PNS.PREWASH_SOLENOIDS_HP_ROOF_BAR_PREWASH_WASH_BAY_INOX,
    );
    expect(pns(config)).not.toContain(
      PNS.PREWASH_SOLENOIDS_HP_ROOF_BAR_PREWASH_WASH_BAY,
    );
  });

  test("OMZ + has_wax_pump → fittings for wax pump INOX", () => {
    const config = makeConfig({ has_wax_pump: true, machine_type: "OMZ" });
    expect(pns(config)).toContain(PNS.FITTINGS_FOR_WAX_PUMP_INOX);
    expect(pns(config)).not.toContain(PNS.FITTINGS_FOR_WAX_PUMP);
  });

  test("OMZ + double supply → fittings for double supply INOX", () => {
    const config = makeConfig({
      water_2_type: "RECYCLED",
      supply_type: "STRAIGHT_SHELF",
      machine_type: "OMZ",
    });
    expect(pns(config)).toContain(PNS.FITTINGS_FOR_DOUBLE_SUPPLY_INOX);
    expect(pns(config)).not.toContain(PNS.FITTINGS_FOR_DOUBLE_SUPPLY);
  });
});

describe("nozzleBarBOM — tags", () => {
  const itemsByPn = (pn: string) => nozzleBarBOM.filter((i) => i.pn === pn);

  test("rinse section items have tag RINSE_BARS", () => {
    const rinsePns = [
      PNS.RINSE_ARCH,
      PNS.RINSE_ARCH_INOX,
      PNS.LATERAL_RINSE_BARS,
      PNS.RINSE_SOLENOIDS_PREWASH_ONBOARD,
      PNS.RINSE_SOLENOIDS_PREWASH_ONBOARD_INOX,
      PNS.RINSE_SOLENOID_PREWASH_WASH_BAY,
      PNS.RINSE_SOLENOID_PREWASH_WASH_BAY_INOX,
      PNS.FITTINGS_FOR_RINSE_WITHOUT_PREWASH,
      PNS.FITTINGS_FOR_RINSE_WITHOUT_PREWASH_INOX,
    ];
    for (const pn of rinsePns) {
      const items = itemsByPn(pn);
      expect(items.length).toBeGreaterThan(0);
      for (const item of items) {
        expect(item.tag).toBe("RINSE_BARS");
      }
    }
  });

  test("prewash section items have tag PREWASH_BARS", () => {
    const prewashPns = [
      PNS.PREWASH_ARCH,
      PNS.PREWASH_ARCH_INOX,
      PNS.LATERAL_PREWASH_BARS,
      PNS.PREWASH_ARCH_2_CHEMICALS,
      PNS.FLOW_SWITCH,
      PNS.FLOW_SWITCH_INOX,
    ];
    for (const pn of prewashPns) {
      const items = itemsByPn(pn);
      expect(items.length).toBeGreaterThan(0);
      for (const item of items) {
        expect(item.tag).toBe("PREWASH_BARS");
      }
    }
  });

  test("acid section items have tag ACID_BARS", () => {
    const acidPns = [PNS.PREWASH_ARCH_ACID_INOX];
    for (const pn of acidPns) {
      const items = itemsByPn(pn);
      expect(items.length).toBeGreaterThan(0);
      for (const item of items) {
        expect(item.tag).toBe("ACID_BARS");
      }
    }
  });

  test("wax and double supply fittings (Other section) have tag RINSE_BARS", () => {
    const otherPns = [
      PNS.FITTINGS_FOR_WAX_PUMP,
      PNS.FITTINGS_FOR_WAX_PUMP_INOX,
      PNS.FITTINGS_FOR_DOUBLE_SUPPLY,
      PNS.FITTINGS_FOR_DOUBLE_SUPPLY_INOX,
    ];
    for (const pn of otherPns) {
      const items = itemsByPn(pn);
      expect(items.length).toBeGreaterThan(0);
      for (const item of items) {
        expect(item.tag).toBe("RINSE_BARS");
      }
    }
  });

  test("every item in nozzleBarBOM has a defined tag", () => {
    nozzleBarBOM.forEach((item) => {
      expect(item.tag).toBeDefined();
    });
  });
});
