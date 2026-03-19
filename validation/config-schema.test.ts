import { configSchema } from "@/validation/config-schema";
import { describe, test, expect } from "vitest";

// A minimal valid configuration that satisfies all sub-schemas
const validBase = {
  // Base
  name: "Test Config",
  description: "",
  // Brush
  brush_qty: 0,
  brush_type: undefined,
  brush_color: undefined,
  // Chem pump (all off)
  has_chemical_pump: false,
  chemical_qty: undefined,
  chemical_pump_pos: undefined,
  has_foam: false,
  has_acid_pump: false,
  acid_pump_pos: undefined,
  has_shampoo_pump: false,
  has_wax_pump: false,
  // Water supply
  water_1_type: "NETWORK",
  water_1_pump: undefined,
  water_2_type: undefined,
  water_2_pump: undefined,
  has_antifreeze: false,
  inv_pump_outlet_dosatron_qty: 0,
  inv_pump_outlet_pw_qty: 0,
  // Supply type
  supply_type: "STRAIGHT_SHELF",
  supply_side: "LEFT",
  supply_fixing_type: undefined,
  has_post_frame: false,
  // Rail
  rail_type: "DOWELED",
  rail_length: 21,
  rail_guide_qty: 0,
  // HP pump (all off)
  has_15kw_pump: false,
  pump_outlet_1_15kw: undefined,
  pump_outlet_2_15kw: undefined,
  has_30kw_pump: false,
  pump_outlet_1_30kw: undefined,
  pump_outlet_2_30kw: undefined,
  has_omz_pump: false,
  pump_outlet_omz: undefined,
  has_chemical_roof_bar: false,
  // Touch
  touch_qty: 1,
  touch_pos: "EXTERNAL",
  touch_fixing_type: "WALL",
  has_itecoweb: false,
  has_card_reader: false,
  card_qty: 0,
  is_fast: false,
  // Notes
  sales_notes: "",
  engineering_notes: "",
};

describe("configSchema", () => {
  describe("Happy path", () => {
    test("should validate a complete valid configuration", () => {
      expect(() => configSchema.parse(validBase)).not.toThrow();
    });
  });

  describe("Energy chain + rail length rule", () => {
    test("should pass when ENERGY_CHAIN and rail_length is 25", () => {
      const data = {
        ...validBase,
        supply_type: "ENERGY_CHAIN",
        supply_fixing_type: "POST",
        supply_side: "LEFT",
        has_post_frame: false,
        rail_length: 25,
      };
      expect(() => configSchema.parse(data)).not.toThrow();
    });

    test("should fail when ENERGY_CHAIN and rail_length is 21", () => {
      const data = {
        ...validBase,
        supply_type: "ENERGY_CHAIN",
        supply_fixing_type: "POST",
        supply_side: "LEFT",
        has_post_frame: false,
        rail_length: 21,
      };
      expect(() => configSchema.parse(data)).toThrow(
        "Con la catena portacavi le rotaie devono essere almeno 25 metri."
      );
    });

    test("should fail when ENERGY_CHAIN and rail_length is 7", () => {
      const data = {
        ...validBase,
        supply_type: "ENERGY_CHAIN",
        supply_fixing_type: "POST",
        supply_side: "LEFT",
        has_post_frame: false,
        rail_length: 7,
      };
      expect(() => configSchema.parse(data)).toThrow(
        "Con la catena portacavi le rotaie devono essere almeno 25 metri."
      );
    });
  });

  describe("Fast portal + rail length rule", () => {
    test("should pass when is_fast is true and rail_length is 7", () => {
      const data = {
        ...validBase,
        is_fast: true,
        rail_length: 7,
      };
      expect(() => configSchema.parse(data)).not.toThrow();
    });

    test("should fail when is_fast is true and rail_length is 21", () => {
      const data = {
        ...validBase,
        is_fast: true,
        rail_length: 21,
      };
      expect(() => configSchema.parse(data)).toThrow(
        "Per un portale fast le rotaie devono essere da 7 metri."
      );
    });

    test("should fail when is_fast is true and rail_length is 25", () => {
      const data = {
        ...validBase,
        is_fast: true,
        supply_type: "ENERGY_CHAIN",
        supply_fixing_type: "POST",
        rail_length: 25,
      };
      expect(() => configSchema.parse(data)).toThrow(
        "Per un portale fast le rotaie devono essere da 7 metri."
      );
    });
  });

  describe("Notes fields", () => {
    test("should default sales_notes to empty string when omitted", () => {
      const { sales_notes, ...withoutSalesNotes } = validBase;
      const result = configSchema.parse(withoutSalesNotes);
      expect(result.sales_notes).toBe("");
    });

    test("should default engineering_notes to empty string when omitted", () => {
      const { engineering_notes, ...withoutEngNotes } = validBase;
      const result = configSchema.parse(withoutEngNotes);
      expect(result.engineering_notes).toBe("");
    });

    test("should accept non-empty notes", () => {
      const data = {
        ...validBase,
        sales_notes: "Note per la vendita",
        engineering_notes: "Note per l'ufficio tecnico",
      };
      const result = configSchema.parse(data);
      expect(result.sales_notes).toBe("Note per la vendita");
      expect(result.engineering_notes).toBe("Note per l'ufficio tecnico");
    });
  });

  describe("Brush qty and pump restrictions", () => {
    test("should fail when brush_qty is 0 and has_shampoo_pump is true", () => {
      const data = {
        ...validBase,
        brush_qty: 0,
        has_shampoo_pump: true,
      };
      expect(() => configSchema.parse(data)).toThrow(
        "Non puoi selezionare la pompa sapone se non ci sono spazzole."
      );
    });

    test("should fail when brush_qty is 2 and has_acid_pump is true", () => {
      const data = {
        ...validBase,
        brush_qty: 2,
        brush_type: "THREAD",
        brush_color: "BLUE_SILVER",
        has_acid_pump: true,
        acid_pump_pos: "WASH_BAY",
      };
      expect(() => configSchema.parse(data)).toThrow(
        "Non puoi selezionare la pompa acido per un portale a 2 spazzole."
      );
    });

    test("should fail when brush_qty is 2 and has_omz_pump is true", () => {
      const data = {
        ...validBase,
        brush_qty: 2,
        brush_type: "THREAD",
        brush_color: "BLUE_SILVER",
        has_omz_pump: true,
        pump_outlet_omz: "SPINNERS",
      };
      expect(() => configSchema.parse(data)).toThrow(
        "Non puoi selezionare la pompa OMZ per un portale a 2 spazzole."
      );
    });

    test("should pass with brush_qty 3 and all restricted pumps disabled", () => {
      const data = {
        ...validBase,
        brush_qty: 3,
        brush_type: "THREAD",
        brush_color: "BLUE_SILVER",
        has_shampoo_pump: false,
        has_acid_pump: false,
        has_omz_pump: false,
      };
      expect(() => configSchema.parse(data)).not.toThrow();
    });

    test("should pass with brush_qty 2 and shampoo pump enabled", () => {
      const data = {
        ...validBase,
        brush_qty: 2,
        brush_type: "THREAD",
        brush_color: "BLUE_SILVER",
        has_shampoo_pump: true,
      };
      expect(() => configSchema.parse(data)).not.toThrow();
    });
  });
});
