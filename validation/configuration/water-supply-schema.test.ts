import { Water1PumpType, Water2PumpType, WaterType } from "@/types";
import { waterSupplySchema } from "@/validation/configuration/water-supply-schema";
import { describe, test, expect } from "vitest";

type TWaterType = WaterType | null | undefined;

function createWaterSupplyObject(
  water1Type: TWaterType,
  water1Pump: Water1PumpType | null | undefined,
  water2Type: TWaterType,
  water2Pump: Water2PumpType | null | undefined,
  hasAntifreeze: boolean,
  outlets = { inv_pump_outlet_pw_qty: 0, inv_pump_outlet_dosatron_qty: 0 }
) {
  return {
    water_1_type: water1Type,
    water_1_pump: water1Pump,
    water_2_type: water2Type,
    water_2_pump: water2Pump,
    has_antifreeze: hasAntifreeze,
    ...outlets,
  };
}

describe("waterSupplySchema", () => {
  describe("General schema tests", () => {
    test("should validate successfully with all fields correctly set", () => {
      const validData = createWaterSupplyObject(
        "NETWORK",
        "BOOST_15KW",
        "RECYCLED",
        "BOOST_22KW",
        true
      );
      expect(() => waterSupplySchema.parse(validData)).not.toThrow();
    });

    test("should throw if water_1_type is missing", () => {
      const invalidData = createWaterSupplyObject(
        null,
        "BOOST_15KW",
        undefined,
        undefined,
        false
      );
      expect(() => waterSupplySchema.parse(invalidData)).toThrow();
    });
  });

  test("should validate successfully with water_1_type set and water_1_pump undefined", () => {
    const validData = createWaterSupplyObject(
      "DEMINERALIZED",
      undefined,
      undefined,
      undefined,
      false
    );
    expect(() => waterSupplySchema.parse(validData)).not.toThrow();
  });

  describe("Inverter pump tests", () => {
    test("should throw if inverter pump is selected but less than two outlets are configured", () => {
      const invalidData = createWaterSupplyObject(
        "DEMINERALIZED",
        "INV_3KW_200L",
        null,
        null,
        false,
        { inv_pump_outlet_pw_qty: 1, inv_pump_outlet_dosatron_qty: 0 }
      );
      expect(() => waterSupplySchema.parse(invalidData)).toThrow();
    });

    test("should validate if inverter pump is selected with at least two outlets configured", () => {
      const validData = createWaterSupplyObject(
        "RECYCLED",
        "INV_3KW_250L",
        null,
        null,
        false,
        { inv_pump_outlet_pw_qty: 1, inv_pump_outlet_dosatron_qty: 1 }
      );
      expect(() => waterSupplySchema.parse(validData)).not.toThrow();
    });

    test("should throw if outlets are selected without an inverter pump", () => {
      const invalidData = createWaterSupplyObject(
        "NETWORK",
        "BOOST_15KW",
        null,
        null,
        false,
        { inv_pump_outlet_pw_qty: 1, inv_pump_outlet_dosatron_qty: 0 }
      );
      expect(() => waterSupplySchema.parse(invalidData)).toThrow();
    });

    test("should throw if number of either outlet exceeds two", () => {
      const invalidData = createWaterSupplyObject(
        "NETWORK",
        "INV_3KW_250L",
        null,
        null,
        false,
        { inv_pump_outlet_pw_qty: 3, inv_pump_outlet_dosatron_qty: 0 }
      );
      expect(() => waterSupplySchema.parse(invalidData)).toThrow();

      const invalidData2 = createWaterSupplyObject(
        "NETWORK",
        "INV_3KW_250L",
        null,
        null,
        false,
        { inv_pump_outlet_pw_qty: 0, inv_pump_outlet_dosatron_qty: 3 }
      );
      expect(() => waterSupplySchema.parse(invalidData2)).toThrow();
    });
  });

  describe("Edge cases for water and pump configurations", () => {
    test("should validate with only water_1_type and no pump or outlets", () => {
      const validData = createWaterSupplyObject(
        "NETWORK",
        undefined,
        undefined,
        undefined,
        false
      );
      expect(() => waterSupplySchema.parse(validData)).not.toThrow();
    });

    test("should throw if water_2_pump is set without water_2_type", () => {
      const invalidData = createWaterSupplyObject(
        "RECYCLED",
        "BOOST_15KW",
        undefined,
        "BOOST_15KW",
        false
      );
      expect(() => waterSupplySchema.parse(invalidData)).toThrow();
    });
  });

  describe("Antifreeze tests", () => {
    test("should validate when antifreeze is true or false", () => {
      const validDataWithAntifreeze = createWaterSupplyObject(
        "DEMINERALIZED",
        "BOOST_22KW",
        "RECYCLED",
        "BOOST_15KW",
        true
      );
      const validDataWithoutAntifreeze = createWaterSupplyObject(
        "DEMINERALIZED",
        "BOOST_22KW",
        "RECYCLED",
        "BOOST_15KW",
        false
      );
      expect(() =>
        waterSupplySchema.parse(validDataWithAntifreeze)
      ).not.toThrow();
      expect(() =>
        waterSupplySchema.parse(validDataWithoutAntifreeze)
      ).not.toThrow();
    });
  });
});
