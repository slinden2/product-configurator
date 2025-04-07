import {
  ChemicalPumpPosEnum,
  chemPumpSchema,
} from "@/validation/configuration/chem-pump-schema";
import { describe, test, expect } from "vitest";

// Utility function to create test data for chemPumpSchema
function createChemPumpObject({
  has_chemical_pump,
  chemical_qty,
  chemical_pump_pos,
  has_foam,
  has_acid_pump,
  acid_pump_pos,
  has_shampoo_pump = false,
  has_wax_pump = false,
}: {
  has_chemical_pump: boolean;
  chemical_qty?: number | null;
  chemical_pump_pos?: string | null;
  has_foam?: boolean;
  has_acid_pump: boolean;
  acid_pump_pos?: string | null;
  has_shampoo_pump?: boolean;
  has_wax_pump?: boolean;
}) {
  return {
    has_chemical_pump,
    chemical_qty,
    chemical_pump_pos,
    has_foam,
    has_acid_pump,
    acid_pump_pos,
    has_shampoo_pump,
    has_wax_pump,
  };
}

describe("chemPumpSchema", () => {
  describe("General schema tests", () => {
    test("should validate successfully when no pumps are present", () => {
      const validData = createChemPumpObject({
        has_chemical_pump: false,
        has_acid_pump: false,
      });
      expect(() => chemPumpSchema.parse(validData)).not.toThrow();
    });

    test("should validate successfully with a single chemical pump and position set", () => {
      const validData = createChemPumpObject({
        has_chemical_pump: true,
        chemical_qty: 1,
        chemical_pump_pos: ChemicalPumpPosEnum.enum.ABOARD,
        has_acid_pump: false,
      });
      expect(() => chemPumpSchema.parse(validData)).not.toThrow();
    });

    test("should validate with two chemical pumps, position in wash bay, and no acid pump", () => {
      const validData = createChemPumpObject({
        has_chemical_pump: true,
        chemical_qty: 2,
        chemical_pump_pos: ChemicalPumpPosEnum.enum.WASH_BAY,
        has_acid_pump: false,
      });
      expect(() => chemPumpSchema.parse(validData)).not.toThrow();
    });

    test("should throw if chemical pump quantity is neither 1 nor 2", () => {
      const invalidData = createChemPumpObject({
        has_chemical_pump: true,
        chemical_qty: 3,
        chemical_pump_pos: ChemicalPumpPosEnum.enum.ABOARD,
        has_acid_pump: false,
      });
      expect(() => chemPumpSchema.parse(invalidData)).toThrow(
        "Numero di pompe di prelavaggio deve essere 1 o 2."
      );
    });

    test("should throw if chemical pump is onboard with two pumps and an acid pump is also onboard", () => {
      const invalidData = createChemPumpObject({
        has_chemical_pump: true,
        chemical_qty: 2,
        chemical_pump_pos: ChemicalPumpPosEnum.enum.ABOARD,
        has_acid_pump: true,
        acid_pump_pos: ChemicalPumpPosEnum.enum.ABOARD,
      });
      expect(() => chemPumpSchema.parse(invalidData)).toThrow(
        "A bordo impianto si possono montare solo due pompe di prelavaggio."
      );
    });
  });

  describe("Edge cases and default behaviors", () => {
    test("should set default values for has_shampoo_pump and has_wax_pump to false", () => {
      const validData = createChemPumpObject({
        has_chemical_pump: false,
        has_acid_pump: false,
      });
      const parsedData = chemPumpSchema.parse(validData);
      expect(parsedData.has_shampoo_pump).toBe(false);
      expect(parsedData.has_wax_pump).toBe(false);
    });

    test("should throw if chemical_qty is undefined while chemical pump is true", () => {
      const invalidData = createChemPumpObject({
        has_chemical_pump: true,
        has_acid_pump: false,
      });
      expect(() => chemPumpSchema.parse(invalidData)).toThrow();
    });

    test("should validate successfully with has_foam as a boolean (true or false)", () => {
      const validDataWithFoamTrue = createChemPumpObject({
        has_chemical_pump: true,
        chemical_qty: 1,
        chemical_pump_pos: ChemicalPumpPosEnum.enum.WASH_BAY,
        has_foam: true,
        has_acid_pump: false,
      });
      expect(() => chemPumpSchema.parse(validDataWithFoamTrue)).not.toThrow();

      const validDataWithFoamFalse = createChemPumpObject({
        has_chemical_pump: true,
        chemical_qty: 1,
        chemical_pump_pos: ChemicalPumpPosEnum.enum.WASH_BAY,
        has_foam: false,
        has_acid_pump: false,
      });
      expect(() => chemPumpSchema.parse(validDataWithFoamFalse)).not.toThrow();
    });

    test("should throw if has_acid_pump is true but acid_pump_pos is undefined", () => {
      const invalidData = createChemPumpObject({
        has_chemical_pump: true,
        chemical_qty: 1,
        chemical_pump_pos: ChemicalPumpPosEnum.enum.ABOARD,
        has_acid_pump: true,
      });
      expect(() => chemPumpSchema.parse(invalidData)).toThrow();
    });

    test("should validate successfully with a complete valid configuration", () => {
      const validData = createChemPumpObject({
        has_chemical_pump: true,
        chemical_qty: 1,
        chemical_pump_pos: ChemicalPumpPosEnum.enum.ABOARD,
        has_foam: false,
        has_acid_pump: true,
        acid_pump_pos: ChemicalPumpPosEnum.enum.WASH_BAY,
        has_shampoo_pump: true,
        has_wax_pump: true,
      });
      expect(() => chemPumpSchema.parse(validData)).not.toThrow();
    });
  });
});
