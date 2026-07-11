import { describe, expect, it } from "vitest";
import { WASH_HEIGHT_OFFSET_MM } from "@/types";
import {
  getWashHeightMm,
  hasBrushes,
  isAnchoredRail,
  isInverterPump1Selected,
  isOmzMachine,
  showCardQty,
  showChassisWashSensor,
  showChemicalRoofBar,
  showEnergyChainWallWarning,
  showManualAntifreeze,
  showPostFrame,
  showTankBlowerAndFloat,
  showWashBayEnergyChainFields,
  washBayHasHpSource,
} from "./display-rules";

describe("isOmzMachine", () => {
  it("is true only for OMZ", () => {
    expect(isOmzMachine({ machine_type: "OMZ" })).toBe(true);
    expect(isOmzMachine({ machine_type: "STD" })).toBe(false);
  });
});

describe("getWashHeightMm", () => {
  it("subtracts the offset when above it", () => {
    expect(getWashHeightMm(3000)).toBe(3000 - WASH_HEIGHT_OFFSET_MM);
  });

  it("returns null when not computable or below the offset", () => {
    expect(getWashHeightMm(undefined)).toBeNull();
    expect(getWashHeightMm(null)).toBeNull();
    expect(getWashHeightMm(WASH_HEIGHT_OFFSET_MM - 1)).toBeNull();
  });
});

describe("hasBrushes", () => {
  it("is true for a positive count only", () => {
    expect(hasBrushes({ brush_qty: 2 })).toBe(true);
    expect(hasBrushes({ brush_qty: 0 })).toBe(false);
    expect(hasBrushes({ brush_qty: undefined })).toBe(false);
  });
});

describe("isInverterPump1Selected", () => {
  it("matches the two inverter pump variants", () => {
    expect(isInverterPump1Selected({ water_1_pump: "INV_3KW_200L" })).toBe(
      true,
    );
    expect(isInverterPump1Selected({ water_1_pump: "INV_3KW_250L" })).toBe(
      true,
    );
    expect(isInverterPump1Selected({ water_1_pump: "BOOST_15KW" })).toBe(false);
    expect(isInverterPump1Selected({ water_1_pump: undefined })).toBe(false);
  });
});

describe("showPostFrame", () => {
  it("requires a boom/straight-shelf supply on a post fixing", () => {
    expect(
      showPostFrame({ supply_type: "BOOM", supply_fixing_type: "POST" }),
    ).toBe(true);
    expect(
      showPostFrame({
        supply_type: "STRAIGHT_SHELF",
        supply_fixing_type: "POST",
      }),
    ).toBe(true);
    expect(
      showPostFrame({ supply_type: "BOOM", supply_fixing_type: "WALL" }),
    ).toBe(false);
    expect(
      showPostFrame({
        supply_type: "ENERGY_CHAIN",
        supply_fixing_type: "POST",
      }),
    ).toBe(false);
  });
});

describe("isAnchoredRail", () => {
  it("is true for anchored rails", () => {
    expect(isAnchoredRail({ rail_type: "ANCHORED" })).toBe(true);
    expect(isAnchoredRail({ rail_type: undefined })).toBe(false);
  });
});

describe("showChemicalRoofBar", () => {
  it("matches the two roof-bar OMZ outlets", () => {
    expect(showChemicalRoofBar({ pump_outlet_omz: "HP_ROOF_BAR" })).toBe(true);
    expect(
      showChemicalRoofBar({ pump_outlet_omz: "HP_ROOF_BAR_SPINNERS" }),
    ).toBe(true);
    expect(showChemicalRoofBar({ pump_outlet_omz: "SPINNERS" })).toBe(false);
  });
});

describe("showChassisWashSensor", () => {
  it("is true when any pump outlet is a chassis-wash outlet", () => {
    expect(
      showChassisWashSensor({
        pump_outlet_1_15kw: "CHASSIS_WASH",
        pump_outlet_2_15kw: undefined,
        pump_outlet_1_30kw: undefined,
        pump_outlet_2_30kw: undefined,
        pump_outlet_1_75kw: undefined,
        pump_outlet_2_75kw: undefined,
      }),
    ).toBe(true);
    expect(
      showChassisWashSensor({
        pump_outlet_1_15kw: undefined,
        pump_outlet_2_15kw: undefined,
        pump_outlet_1_30kw: undefined,
        pump_outlet_2_30kw: undefined,
        pump_outlet_1_75kw: undefined,
        pump_outlet_2_75kw: undefined,
      }),
    ).toBe(false);
  });
});

describe("showCardQty", () => {
  it("is true when itecoweb or card reader is enabled", () => {
    expect(showCardQty({ has_itecoweb: true, has_card_reader: false })).toBe(
      true,
    );
    expect(showCardQty({ has_itecoweb: false, has_card_reader: true })).toBe(
      true,
    );
    expect(showCardQty({ has_itecoweb: false, has_card_reader: false })).toBe(
      false,
    );
  });
});

describe("showManualAntifreeze", () => {
  it("requires both the detergent pump and winter drain", () => {
    expect(
      showManualAntifreeze({
        has_chassis_wash_detergent_pump: true,
        has_antifreeze: true,
      }),
    ).toBe(true);
    expect(
      showManualAntifreeze({
        has_chassis_wash_detergent_pump: true,
        has_antifreeze: false,
      }),
    ).toBe(false);
  });
});

describe("showTankBlowerAndFloat", () => {
  it("is true when exactly one no-float inlet", () => {
    expect(showTankBlowerAndFloat({ inlet_no_float_qty: 1 })).toBe(true);
    expect(showTankBlowerAndFloat({ inlet_no_float_qty: 0 })).toBe(false);
  });
});

describe("washBayHasHpSource", () => {
  it("is true when any HP source quantity is positive", () => {
    expect(
      washBayHasHpSource({
        hp_lance_qty: 0,
        hose_reel_hp_with_post_qty: 0,
        hose_reel_hp_without_post_qty: 1,
        hose_reel_hp_det_with_post_qty: 0,
      }),
    ).toBe(true);
    expect(
      washBayHasHpSource({
        hp_lance_qty: 0,
        hose_reel_hp_with_post_qty: 0,
        hose_reel_hp_without_post_qty: 0,
        hose_reel_hp_det_with_post_qty: 0,
      }),
    ).toBe(false);
  });
});

describe("wash bay energy chain rules", () => {
  it("shows EC fields only with a gantry on an energy-chain supply", () => {
    expect(
      showWashBayEnergyChainFields({ has_gantry: true }, "ENERGY_CHAIN"),
    ).toBe(true);
    expect(
      showWashBayEnergyChainFields({ has_gantry: false }, "ENERGY_CHAIN"),
    ).toBe(false);
    expect(showWashBayEnergyChainFields({ has_gantry: true }, "BOOM")).toBe(
      false,
    );
  });

  it("detects an energy-chain wall mount", () => {
    expect(
      showEnergyChainWallWarning({
        supply_type: "ENERGY_CHAIN",
        supply_fixing_type: "WALL",
      }),
    ).toBe(true);
    expect(
      showEnergyChainWallWarning({
        supply_type: "ENERGY_CHAIN",
        supply_fixing_type: "POST",
      }),
    ).toBe(false);
    expect(
      showEnergyChainWallWarning({
        supply_type: "BOOM",
        supply_fixing_type: "WALL",
      }),
    ).toBe(false);
  });
});
