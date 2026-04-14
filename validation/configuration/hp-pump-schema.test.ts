import { describe, expect, test } from "vitest";
import type {
  HpPump15kwOutletType,
  HpPump30kwOutletType,
  HpPump75kwOutletType,
  HpPumpOMZkwOutletType,
} from "@/types";
import { hpPumpSchema } from "@/validation/configuration/hp-pump-schema";

type OutletType = HpPump15kwOutletType | HpPump30kwOutletType | undefined;
type Outlet75kwType = HpPump75kwOutletType | undefined;

function createHpPumpObject(
  kw: number = 15,
  hasPump: boolean = false,
  outlet1: OutletType = undefined,
  outlet2: OutletType = undefined,
) {
  return {
    [`has_${kw}kw_pump`]: hasPump,
    [`pump_outlet_1_${kw}kw`]: outlet1,
    [`pump_outlet_2_${kw}kw`]: outlet2,
  };
}

function create75kwPumpObject(
  hasPump: boolean = false,
  outlet1: Outlet75kwType = undefined,
  outlet2: Outlet75kwType = undefined,
) {
  return {
    has_75kw_pump: hasPump,
    pump_outlet_1_75kw: outlet1,
    pump_outlet_2_75kw: outlet2,
  };
}

function createOMZPumpObject(
  hasPump: boolean = false,
  outlet1: HpPumpOMZkwOutletType | undefined = undefined,
  hasChemicalRoofBar?: boolean | undefined,
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
      [createHpPumpObject(15, true, undefined, undefined)],
      [createHpPumpObject(30, true, undefined, undefined)],
      [createHpPumpObject(30, true, undefined, undefined)],
    ])(`should throw when the pump is selected and the neither of the outlets are not, %o`, (testObject) => {
      expect(() => hpPumpSchema.parse(testObject)).toThrow();
    });
    test.each([
      [createHpPumpObject(15, false, "CHASSIS_WASH", undefined)],
      [createHpPumpObject(30, false, "CHASSIS_WASH_HORIZONTAL", undefined)],
      [createHpPumpObject(15, false, undefined, "CHASSIS_WASH")],
      [createHpPumpObject(30, false, undefined, "CHASSIS_WASH_HORIZONTAL")],
    ])(`should throw if the pump is selected, but one of the outlets is, %o`, (testObject) => {
      expect(() => hpPumpSchema.parse(testObject)).toThrow();
    });
    test.each([
      [createHpPumpObject(15, true, "CHASSIS_WASH", "CHASSIS_WASH")],
      [
        createHpPumpObject(
          30,
          true,
          "CHASSIS_WASH_HORIZONTAL",
          "CHASSIS_WASH_HORIZONTAL",
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
          "LOW_SPINNERS_HIGH_BARS",
        ),
      ],
    ])(`should throw if neither of the outlets is ${"CHASSIS_WASH"}, %o`, (testObject) => {
      expect(() => hpPumpSchema.parse(testObject)).toThrow();
    });
    test.each([
      [
        {
          ...createHpPumpObject(15, true, "CHASSIS_WASH", undefined),
          chassis_wash_sensor_type: "SINGLE_POST",
        },
      ],
      [createHpPumpObject(15, true, "LOW_SPINNERS", undefined)],
      [
        {
          ...createHpPumpObject(15, true, "CHASSIS_WASH", "LOW_SPINNERS"),
          chassis_wash_sensor_type: "SINGLE_POST",
        },
      ],
      [
        {
          ...createHpPumpObject(30, true, "CHASSIS_WASH_HORIZONTAL", undefined),
          chassis_wash_sensor_type: "DOUBLE_POST",
        },
      ],
      [createHpPumpObject(30, true, "FULL_ARCH", undefined)],
      [
        {
          ...createHpPumpObject(
            30,
            true,
            "CHASSIS_WASH_LATERAL_HORIZONTAL",
            "LOW_MEDIUM_SPINNERS",
          ),
          chassis_wash_sensor_type: "SINGLE_WALL",
        },
      ],
    ])(`should not throw if the outlets are configured correctly, %o`, (testObject) => {
      expect(() => hpPumpSchema.parse(testObject)).not.toThrow();
    });
  });
  describe("7.5kW pump tests", () => {
    test("should throw when pump is selected but no outlet", () => {
      expect(() =>
        hpPumpSchema.parse(create75kwPumpObject(true, undefined, undefined)),
      ).toThrow();
    });

    test.each([
      [create75kwPumpObject(true, "CHASSIS_WASH", "CHASSIS_WASH")],
    ])("should throw if both outlets are the same, %o", (testObject) => {
      expect(() => hpPumpSchema.parse(testObject)).toThrow();
    });

    test("should throw if 7.5kW and 15kW are both selected", () => {
      expect(() =>
        hpPumpSchema.parse({
          ...create75kwPumpObject(true, "LOW_BARS", undefined),
          ...createHpPumpObject(15, true, "LOW_SPINNERS", undefined),
        }),
      ).toThrow();
    });

    test("should throw if 7.5kW and 30kW are both selected", () => {
      expect(() =>
        hpPumpSchema.parse({
          ...create75kwPumpObject(true, "LOW_BARS", undefined),
          ...createHpPumpObject(30, true, "FULL_ARCH", undefined),
        }),
      ).toThrow();
    });

    test("should throw if CHASSIS_WASH is selected without chassis_wash_sensor_type", () => {
      expect(() =>
        hpPumpSchema.parse(
          create75kwPumpObject(true, "CHASSIS_WASH", undefined),
        ),
      ).toThrow();
    });

    test.each([
      [
        {
          ...create75kwPumpObject(true, "CHASSIS_WASH", undefined),
          chassis_wash_sensor_type: "SINGLE_POST",
        },
      ],
      [create75kwPumpObject(true, "LOW_BARS", undefined)],
      [
        {
          ...create75kwPumpObject(true, "CHASSIS_WASH", "LOW_BARS"),
          chassis_wash_sensor_type: "DOUBLE_WALL",
        },
      ],
    ])("should not throw for valid 7.5kW configurations, %o", (testObject) => {
      expect(() => hpPumpSchema.parse(testObject)).not.toThrow();
    });

    test("7.5kW can coexist with OMZ pump", () => {
      expect(() =>
        hpPumpSchema.parse({
          ...create75kwPumpObject(true, "LOW_BARS", undefined),
          has_omz_pump: true,
          pump_outlet_omz: "SPINNERS",
        }),
      ).not.toThrow();
    });
  });

  describe("OMZ pump tests", () => {
    test.each([
      createOMZPumpObject(true, undefined),
      createOMZPumpObject(true, undefined),
    ])(`should throw when the pump is selected and the outlet is not, %o`, (testObject) => {
      expect(() => hpPumpSchema.parse(testObject)).toThrow();
    });
    test.each([
      createOMZPumpObject(false, "HP_ROOF_BAR"),
      createOMZPumpObject(false, undefined, true),
    ])(`should throw when the pump is not selected and the outlet or chem roof bar is, %o`, (testObject) => {
      expect(() => hpPumpSchema.parse(testObject)).toThrow();
    });
    test.each([
      createOMZPumpObject(false, "HP_ROOF_BAR"),
    ])(`should throw when the pump is not selected and the outlet is, %o`, (testObject) => {
      expect(() => hpPumpSchema.parse(testObject)).toThrow();
    });
    test("should throw if chemical roof bar is selected with anything other than roof bar outlet", () => {
      expect(() =>
        hpPumpSchema.parse(createOMZPumpObject(false, undefined, true)),
      ).toThrow();
      expect(() =>
        hpPumpSchema.parse(createOMZPumpObject(false, "SPINNERS", true)),
      ).toThrow();
    });
    test.each([
      createOMZPumpObject(true, "HP_ROOF_BAR", false),
      createOMZPumpObject(true, "HP_ROOF_BAR", true),
      createOMZPumpObject(true, "HP_ROOF_BAR_SPINNERS", false),
      createOMZPumpObject(true, "HP_ROOF_BAR_SPINNERS", true),
    ])(`should not throw on chemical roof bar true nor false if the outlet has roof bar, %o`, (testObject) => {
      expect(() => hpPumpSchema.parse(testObject)).not.toThrow();
    });
  });
});
