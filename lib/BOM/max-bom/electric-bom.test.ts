import { vi, describe, test, expect } from "vitest";

vi.mock("@/db", () => ({
  db: { query: { partNumbers: { findMany: vi.fn().mockResolvedValue([]) } } },
}));
vi.mock("@/db/queries", () => ({
  getPartNumbersByArray: vi.fn().mockResolvedValue([]),
}));

import { electricBOM } from "@/lib/BOM/max-bom/electric-bom";
import type { GeneralBOMConfig } from "@/lib/BOM";
import { makeGeneralBOMConfig as makeConfig } from "@/test/bom-test-utils";

const pns = (config: GeneralBOMConfig) =>
  electricBOM
    .filter((item) => item.conditions.every((fn) => fn(config)))
    .map((item) => item.pn);

const qty = (config: GeneralBOMConfig, pn: string) => {
  const item = electricBOM.find(
    (i) => i.pn === pn && i.conditions.every((fn) => fn(config)),
  );
  if (!item) return undefined;
  return typeof item.qty === "function" ? item.qty(config) : item.qty;
};

const PNS = {
  RFID_READER: "890.10.003",
  RFID_CARD: "890.10.005",
  HP_ROOF_BAR_COMMANDS: "890.10.013",
  THERMOSTAT: "890.10.014",
  ITECOWEB_ACCESSORIES: "890.10.015",
  ITECOWEB_ONBOARD: "890.10.017",
  WASH_BAY_MANAGEMENT_EXTENSION: "890.10.021",
  SUNSHADE: "450.02.053",
  CLOSING_PLATE: "1100.050.004",
  EXTERNAL_CONSOLE_WALL_ONE_TOUCH: "1100.050.000",
  EXTERNAL_CONSOLE_POST_ONE_TOUCH: "1100.051.000",
  EXTERNAL_CONSOLE_WALL_DUAL_TOUCH: "1100.053.000",
  EXTERNAL_CONSOLE_POST_DUAL_TOUCH: "1100.054.000",
  COUPLING_RELAY_ASSY: "1100.055.008",
  JUNCTION_BOX_X14_X15: "1100.055.003",
  JUNCTION_BOX_X16_X17: "1100.055.010",
  JUNCTION_BOX_X20_X21: "1100.055.001",
  JUNCTION_BOX_X22_X23: "1100.055.004",
  JUNCTION_BOX_X24_REM1: "1100.055.002",
  JUNCTION_BOX_X25_REM2: "1100.055.005",
  JUNCTION_BOX_ETH_ON_POST: "1100.055.009",
};

describe("electricBOM — RFID reader", () => {
  test("has_card_reader=true → RFID reader included", () => {
    expect(pns(makeConfig({ has_card_reader: true }))).toContain(
      PNS.RFID_READER,
    );
  });

  test("has_itecoweb=true → RFID reader included", () => {
    expect(pns(makeConfig({ has_itecoweb: true }))).toContain(PNS.RFID_READER);
  });

  test("neither card reader nor itecoweb → RFID reader not included", () => {
    expect(pns(makeConfig())).not.toContain(PNS.RFID_READER);
  });
});

describe("electricBOM — RFID cards", () => {
  test("card_qty=0 → no RFID cards", () => {
    expect(pns(makeConfig({ card_qty: 0 }))).not.toContain(PNS.RFID_CARD);
  });

  test("card_qty=5 → RFID cards included (qty=5)", () => {
    const config = makeConfig({ card_qty: 5 });
    expect(pns(config)).toContain(PNS.RFID_CARD);
    expect(qty(config, PNS.RFID_CARD)).toBe(5);
  });
});

describe("electricBOM — HP roof bar commands", () => {
  test("has_omz_pump + pump_outlet_omz=HP_ROOF_BAR → included", () => {
    expect(
      pns(makeConfig({ has_omz_pump: true, pump_outlet_omz: "HP_ROOF_BAR" })),
    ).toContain(PNS.HP_ROOF_BAR_COMMANDS);
  });

  test("has_omz_pump + pump_outlet_omz=HP_ROOF_BAR_SPINNERS → included", () => {
    expect(
      pns(
        makeConfig({
          has_omz_pump: true,
          pump_outlet_omz: "HP_ROOF_BAR_SPINNERS",
        }),
      ),
    ).toContain(PNS.HP_ROOF_BAR_COMMANDS);
  });

  test("has_omz_pump + pump_outlet_omz=SPINNERS → NOT included", () => {
    expect(
      pns(makeConfig({ has_omz_pump: true, pump_outlet_omz: "SPINNERS" })),
    ).not.toContain(PNS.HP_ROOF_BAR_COMMANDS);
  });

  test("no OMZ pump → HP roof bar commands not included", () => {
    expect(
      pns(makeConfig({ has_omz_pump: false, pump_outlet_omz: "HP_ROOF_BAR" })),
    ).not.toContain(PNS.HP_ROOF_BAR_COMMANDS);
  });
});

describe("electricBOM — thermostat (antifreeze)", () => {
  test("has_antifreeze=true → thermostat included", () => {
    expect(pns(makeConfig({ has_antifreeze: true }))).toContain(PNS.THERMOSTAT);
  });

  test("has_antifreeze=false → thermostat not included", () => {
    expect(pns(makeConfig({ has_antifreeze: false }))).not.toContain(
      PNS.THERMOSTAT,
    );
  });
});

describe("electricBOM — itecoweb", () => {
  test("has_itecoweb=true → accessories + onboard included", () => {
    const result = pns(makeConfig({ has_itecoweb: true }));
    expect(result).toContain(PNS.ITECOWEB_ACCESSORIES);
    expect(result).toContain(PNS.ITECOWEB_ONBOARD);
  });

  test("has_itecoweb=false → no itecoweb items", () => {
    const result = pns(makeConfig({ has_itecoweb: false }));
    expect(result).not.toContain(PNS.ITECOWEB_ACCESSORIES);
    expect(result).not.toContain(PNS.ITECOWEB_ONBOARD);
  });
});

describe("electricBOM — touch configuration", () => {
  test("touch_qty=1, touch_pos=ON_PANEL → sunshade included, no wash bay ext", () => {
    const result = pns(makeConfig({ touch_qty: 1, touch_pos: "ON_PANEL" }));
    expect(result).toContain(PNS.SUNSHADE);
    expect(result).not.toContain(PNS.WASH_BAY_MANAGEMENT_EXTENSION);
    expect(result).not.toContain(PNS.CLOSING_PLATE);
  });

  test("touch_qty=2 → sunshade + wash bay management extension", () => {
    const result = pns(makeConfig({ touch_qty: 2, touch_fixing_type: "WALL" }));
    expect(result).toContain(PNS.SUNSHADE);
    expect(result).toContain(PNS.WASH_BAY_MANAGEMENT_EXTENSION);
  });

  test("touch_qty=1, touch_pos=EXTERNAL → closing plate (not sunshade)", () => {
    const result = pns(
      makeConfig({
        touch_qty: 1,
        touch_pos: "EXTERNAL",
        touch_fixing_type: "WALL",
      }),
    );
    expect(result).toContain(PNS.CLOSING_PLATE);
    expect(result).not.toContain(PNS.SUNSHADE);
  });
});

describe("electricBOM — external console variants", () => {
  test("touch_qty=1, EXTERNAL, WALL → wall one-touch console", () => {
    const result = pns(
      makeConfig({
        touch_qty: 1,
        touch_pos: "EXTERNAL",
        touch_fixing_type: "WALL",
      }),
    );
    expect(result).toContain(PNS.EXTERNAL_CONSOLE_WALL_ONE_TOUCH);
    expect(result).not.toContain(PNS.EXTERNAL_CONSOLE_POST_ONE_TOUCH);
  });

  test("touch_qty=1, EXTERNAL, POST → post one-touch console", () => {
    const result = pns(
      makeConfig({
        touch_qty: 1,
        touch_pos: "EXTERNAL",
        touch_fixing_type: "POST",
      }),
    );
    expect(result).toContain(PNS.EXTERNAL_CONSOLE_POST_ONE_TOUCH);
    expect(result).not.toContain(PNS.EXTERNAL_CONSOLE_WALL_ONE_TOUCH);
  });

  test("touch_qty=2, WALL → wall dual-touch console", () => {
    const result = pns(makeConfig({ touch_qty: 2, touch_fixing_type: "WALL" }));
    expect(result).toContain(PNS.EXTERNAL_CONSOLE_WALL_DUAL_TOUCH);
    expect(result).not.toContain(PNS.EXTERNAL_CONSOLE_POST_DUAL_TOUCH);
  });

  test("touch_qty=2, POST → post dual-touch console", () => {
    const result = pns(makeConfig({ touch_qty: 2, touch_fixing_type: "POST" }));
    expect(result).toContain(PNS.EXTERNAL_CONSOLE_POST_DUAL_TOUCH);
    expect(result).not.toContain(PNS.EXTERNAL_CONSOLE_WALL_DUAL_TOUCH);
  });
});

describe("electricBOM — coupling relay assembly", () => {
  test("has_15kw_pump=true → coupling relay included", () => {
    expect(pns(makeConfig({ has_15kw_pump: true }))).toContain(
      PNS.COUPLING_RELAY_ASSY,
    );
  });

  test("has_30kw_pump=true → coupling relay included", () => {
    expect(pns(makeConfig({ has_30kw_pump: true }))).toContain(
      PNS.COUPLING_RELAY_ASSY,
    );
  });

  test("neither 15kw nor 30kw pump → coupling relay excluded", () => {
    expect(
      pns(makeConfig({ has_15kw_pump: false, has_30kw_pump: false })),
    ).not.toContain(PNS.COUPLING_RELAY_ASSY);
  });
});

describe("electricBOM — junction box X20-X21 (always included)", () => {
  test("default config → X20-X21 included", () => {
    expect(pns(makeConfig())).toContain(PNS.JUNCTION_BOX_X20_X21);
  });

  test("OMZ config → X20-X21 still included", () => {
    expect(
      pns(makeConfig({ machine_type: "OMZ", has_omz_pump: true })),
    ).toContain(PNS.JUNCTION_BOX_X20_X21);
  });
});

describe("electricBOM — junction box X14-X15 (energy chain)", () => {
  test("ENERGY_CHAIN → X14-X15 included", () => {
    expect(pns(makeConfig({ supply_type: "ENERGY_CHAIN" }))).toContain(
      PNS.JUNCTION_BOX_X14_X15,
    );
  });

  test("non-energy-chain → X14-X15 excluded", () => {
    expect(pns(makeConfig({ supply_type: "STRAIGHT_SHELF" }))).not.toContain(
      PNS.JUNCTION_BOX_X14_X15,
    );
  });
});

describe("electricBOM — junction box X16-X17 (energy chain + external/dual touch)", () => {
  test("ENERGY_CHAIN + external touch → X16-X17 included", () => {
    expect(
      pns(
        makeConfig({
          supply_type: "ENERGY_CHAIN",
          touch_qty: 1,
          touch_pos: "EXTERNAL",
        }),
      ),
    ).toContain(PNS.JUNCTION_BOX_X16_X17);
  });

  test("ENERGY_CHAIN + dual touch → X16-X17 included", () => {
    expect(
      pns(makeConfig({ supply_type: "ENERGY_CHAIN", touch_qty: 2 })),
    ).toContain(PNS.JUNCTION_BOX_X16_X17);
  });

  test("ENERGY_CHAIN + ON_PANEL touch → X16-X17 excluded", () => {
    expect(
      pns(
        makeConfig({
          supply_type: "ENERGY_CHAIN",
          touch_qty: 1,
          touch_pos: "ON_PANEL",
        }),
      ),
    ).not.toContain(PNS.JUNCTION_BOX_X16_X17);
  });

  test("non-energy-chain + dual touch → X16-X17 excluded", () => {
    expect(
      pns(makeConfig({ supply_type: "STRAIGHT_SHELF", touch_qty: 2 })),
    ).not.toContain(PNS.JUNCTION_BOX_X16_X17);
  });
});

describe("electricBOM — junction box X24-REM1 (STD only)", () => {
  test("STD machine → X24-REM1 included", () => {
    expect(pns(makeConfig({ machine_type: "STD" }))).toContain(
      PNS.JUNCTION_BOX_X24_REM1,
    );
  });

  test("OMZ machine → X24-REM1 excluded", () => {
    expect(pns(makeConfig({ machine_type: "OMZ" }))).not.toContain(
      PNS.JUNCTION_BOX_X24_REM1,
    );
  });
});

describe("electricBOM — junction boxes X22-X23 & X25-REM2 (usesDualJunctionBoxes)", () => {
  const assertDualBoxes = (config: ReturnType<typeof makeConfig>) => {
    const result = pns(config);
    expect(result).toContain(PNS.JUNCTION_BOX_X22_X23);
    expect(result).toContain(PNS.JUNCTION_BOX_X25_REM2);
  };

  const assertNoDualBoxes = (config: ReturnType<typeof makeConfig>) => {
    const result = pns(config);
    expect(result).not.toContain(PNS.JUNCTION_BOX_X22_X23);
    expect(result).not.toContain(PNS.JUNCTION_BOX_X25_REM2);
  };

  test("external touch → dual junction boxes included", () => {
    assertDualBoxes(
      makeConfig({
        touch_qty: 1,
        touch_pos: "EXTERNAL",
        touch_fixing_type: "WALL",
      }),
    );
  });

  test("dual touch → dual junction boxes included", () => {
    assertDualBoxes(makeConfig({ touch_qty: 2, touch_fixing_type: "WALL" }));
  });

  test("OMZ pump → dual junction boxes included", () => {
    assertDualBoxes(makeConfig({ has_omz_pump: true }));
  });

  test("itecoweb + chemical_pump_pos=WASH_BAY → dual junction boxes included", () => {
    assertDualBoxes(
      makeConfig({
        has_itecoweb: true,
        has_chemical_pump: true,
        chemical_pump_pos: "WASH_BAY",
      }),
    );
  });

  test("default config (ON_PANEL, no OMZ, no itecoweb) → dual junction boxes excluded", () => {
    assertNoDualBoxes(makeConfig());
  });

  test("itecoweb only (no WASH_BAY pump) → dual junction boxes excluded", () => {
    assertNoDualBoxes(
      makeConfig({ has_itecoweb: true, chemical_pump_pos: null }),
    );
  });
});

describe("electricBOM — junction box ETH on post (itecoweb + NOT dual junction boxes)", () => {
  test("itecoweb + simple config (ON_PANEL, no OMZ pump) → ETH on post included", () => {
    expect(pns(makeConfig({ has_itecoweb: true }))).toContain(
      PNS.JUNCTION_BOX_ETH_ON_POST,
    );
  });

  test("itecoweb + dual touch → ETH on post excluded", () => {
    expect(
      pns(
        makeConfig({
          has_itecoweb: true,
          touch_qty: 2,
          touch_fixing_type: "WALL",
        }),
      ),
    ).not.toContain(PNS.JUNCTION_BOX_ETH_ON_POST);
  });

  test("itecoweb + OMZ pump → ETH on post excluded", () => {
    expect(
      pns(makeConfig({ has_itecoweb: true, has_omz_pump: true })),
    ).not.toContain(PNS.JUNCTION_BOX_ETH_ON_POST);
  });

  test("no itecoweb → ETH on post excluded", () => {
    expect(pns(makeConfig({ has_itecoweb: false }))).not.toContain(
      PNS.JUNCTION_BOX_ETH_ON_POST,
    );
  });
});
