import {
  HpPump15kwOutletType,
  HpPump30kwOutletType,
  HpPumpOMZkwOutletType,
} from "@/types";
import { hpPumpSchema } from "@/validation/configuration/hp-pump-schema";
import { describe, test, expect } from "vitest";

type OutletType =
  | HpPump15kwOutletType
  | HpPump30kwOutletType
  | undefined
  | null;

function createHpPumpObject(
  kw: Number = 15,
  hasPump: Boolean = false,
  outlet1: OutletType = undefined,
  outlet2: OutletType = undefined
) {
  return {
    [`has_${kw}kw_pump`]: hasPump,
    [`pump_outlet_1_${kw}kw`]: outlet1,
    [`pump_outlet_2_${kw}kw`]: outlet2,
  };
}

function createOMZPumpObject(
  hasPump: Boolean = false,
  outlet1: HpPumpOMZkwOutletType | undefined | null = undefined,
  hasChemicalRoofBar?: Boolean | undefined | null
) {
  return {
    has_omz_pump: hasPump,
    pump_outlet_omz: outlet1,
    has_chemical_roof_bar: hasChemicalRoofBar,
  };
}

describe("hpPumpSchema", () => {
  describe("15kW/30kW pump tests", () => {
    test.each([
      [createHpPumpObject(15, true, undefined, undefined)],
      [createHpPumpObject(15, true, null, null)],
      [createHpPumpObject(30, true, undefined, undefined)],
      [createHpPumpObject(30, true, null, null)],
    ])(
      `should throw when the pump is selected and the neither of the outlets are not, %o`,
      (testObject) => {
        expect(() => hpPumpSchema.parse(testObject)).toThrow();
      }
    );
    test.each([
      [createHpPumpObject(15, false, "CHASSIS_WASH", undefined)],
      [createHpPumpObject(30, false, "CHASSIS_WASH_HORIZONTAL", undefined)],
      [createHpPumpObject(15, false, null, "CHASSIS_WASH")],
      [createHpPumpObject(30, false, null, "CHASSIS_WASH_HORIZONTAL")],
    ])(
      `should throw if the pump is selected, but one of the outlets is, %o`,
      (testObject) => {
        expect(() => hpPumpSchema.parse(testObject)).toThrow();
      }
    );
    test.each([
      [createHpPumpObject(15, true, "CHASSIS_WASH", "CHASSIS_WASH")],
      [
        createHpPumpObject(
          30,
          true,
          "CHASSIS_WASH_HORIZONTAL",
          "CHASSIS_WASH_HORIZONTAL"
        ),
      ],
    ])(`should throw if the outlets are the same, %o`, (testObject) => {
      expect(() => hpPumpSchema.parse(testObject)).toThrow();
    });
    test.each([
      [createHpPumpObject(15, true, "LOW_BARS", "HIGH_BARS")],
      [
        createHpPumpObject(
          30,
          true,
          "LOW_MEDIUM_SPINNERS",
          "LOW_SPINNERS_HIGH_BARS"
        ),
      ],
    ])(
      `should throw if neither of the outlets is ${"CHASSIS_WASH"}, %o`,
      (testObject) => {
        expect(() => hpPumpSchema.parse(testObject)).toThrow();
      }
    );
    test.each([
      [createHpPumpObject(15, true, "CHASSIS_WASH", null)],
      [createHpPumpObject(15, true, "LOW_SPINNERS", null)],
      [createHpPumpObject(15, true, "CHASSIS_WASH", "LOW_SPINNERS")],
      [createHpPumpObject(30, true, "CHASSIS_WASH_HORIZONTAL", null)],
      [createHpPumpObject(30, true, "HIGH_MEDIUM_SPINNERS", null)],
      [
        createHpPumpObject(
          30,
          true,
          "CHASSIS_WASH_LATERAL_HORIZONTAL",
          "LOW_MEDIUM_SPINNERS"
        ),
      ],
    ])(
      `should not throw if the outlets are configured correctly, %o`,
      (testObject) => {
        expect(() => hpPumpSchema.parse(testObject)).not.toThrow();
      }
    );
  });
  describe("OMZ pump tests", () => {
    test.each([
      createOMZPumpObject(true, undefined),
      createOMZPumpObject(true, null),
    ])(
      `should throw when the pump is selected and the outlet is not, %o`,
      (testObject) => {
        expect(() => hpPumpSchema.parse(testObject)).toThrow();
      }
    );
    test.each([
      createOMZPumpObject(false, "HP_ROOF_BAR"),
      createOMZPumpObject(false, undefined, true),
    ])(
      `should throw when the pump is not selected and the outlet or chem roof bar is, %o`,
      (testObject) => {
        expect(() => hpPumpSchema.parse(testObject)).toThrow();
      }
    );
    test.each([createOMZPumpObject(false, "HP_ROOF_BAR")])(
      `should throw when the pump is not selected and the outlet is, %o`,
      (testObject) => {
        expect(() => hpPumpSchema.parse(testObject)).toThrow();
      }
    );
    test("should throw if chemical roof bar is selected with anything other than roof bar outlet", () => {
      expect(() =>
        hpPumpSchema.parse(createOMZPumpObject(false, undefined, true))
      ).toThrow();
      expect(() =>
        hpPumpSchema.parse(createOMZPumpObject(false, "SPINNERS", true))
      ).toThrow();
    });
    test.each([
      createOMZPumpObject(true, "HP_ROOF_BAR", false),
      createOMZPumpObject(true, "HP_ROOF_BAR", true),
      createOMZPumpObject(true, "HP_ROOF_BAR_SPINNERS", false),
      createOMZPumpObject(true, "HP_ROOF_BAR_SPINNERS", true),
    ])(
      `should not throw on chemical roof bar true nor false if the outlet has roof bar, %o`,
      (testObject) => {
        expect(() => hpPumpSchema.parse(testObject)).not.toThrow();
      }
    );
  });
});
