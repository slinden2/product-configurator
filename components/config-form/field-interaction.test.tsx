// @vitest-environment jsdom
import React from "react";
import { describe, test, expect, afterEach } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useForm, FormProvider } from "react-hook-form";
import { ConfigSchema, configDefaults } from "@/validation/config-schema";
import BrushSection from "@/components/config-form/brush-section";
import WaterSupplySection from "@/components/config-form/water-supply-section";
import SupplySection from "@/components/config-form/supply-section";
import HPPumpSection from "@/components/config-form/hp-pump-section";
import TouchSection from "@/components/config-form/touch-section";
import { selectRadixOption } from "@/test/form-test-utils";

afterEach(cleanup);

// --- Helper: render sections with shared form state ---

function renderSections(
  overrides: Partial<ConfigSchema> = {},
  sections: React.ReactNode,
) {
  let getValues: () => ConfigSchema;

  const Wrapper = () => {
    const form = useForm<ConfigSchema>({
      defaultValues: { ...configDefaults, ...overrides } as ConfigSchema,
    });
    getValues = form.getValues;
    return (
      <FormProvider {...form}>
        {sections}
      </FormProvider>
    );
  };

  render(<Wrapper />);
  return { getValues: () => getValues() };
}

// --- Tests ---

describe("Multi-step field dependency chains", () => {
  describe("Brush cascade", () => {
    test("changing brush_qty from 3 to 0 resets brush_type, brush_color, and has_shampoo_pump", async () => {
      const { getValues } = renderSections(
        {
          brush_qty: 3,
          brush_type: "THREAD",
          brush_color: "BLUE_SILVER",
          has_shampoo_pump: true,
        },
        <BrushSection />,
      );

      // Verify initial state
      expect(getValues().brush_qty).toBe(3);
      expect(getValues().brush_type).toBe("THREAD");

      // Change brush_qty to 0
      await selectRadixOption("Numero di spazzole", "No spazzole");

      expect(getValues().brush_qty).toBe(0);
      expect(getValues().brush_type).toBeUndefined();
      expect(getValues().brush_color).toBeUndefined();
      // has_shampoo_pump is also reset by the brush_qty=0 trigger
      expect(getValues().has_shampoo_pump).toBeUndefined();
    });

    test("changing brush_qty from 3 to 2 resets acid pump and OMZ fields", async () => {
      const { getValues } = renderSections(
        {
          brush_qty: 3,
          brush_type: "THREAD",
          brush_color: "BLUE_SILVER",
          has_acid_pump: true,
          acid_pump_pos: "ONBOARD",
          has_omz_pump: true,
          pump_outlet_omz: "HP_ROOF_BAR",
        },
        <BrushSection />,
      );

      // Change brush_qty to 2
      await selectRadixOption("Numero di spazzole", "Due spazzole");

      expect(getValues().brush_qty).toBe(2);
      // Acid pump and OMZ fields should be reset
      expect(getValues().has_acid_pump).toBeUndefined();
      expect(getValues().acid_pump_pos).toBeUndefined();
      expect(getValues().has_omz_pump).toBeUndefined();
      expect(getValues().pump_outlet_omz).toBeUndefined();
      // Type and color should remain unchanged
      expect(getValues().brush_type).toBe("THREAD");
      expect(getValues().brush_color).toBe("BLUE_SILVER");
    });
  });

  describe("Water supply chain", () => {
    test("deselecting water_1_type resets water_1_pump and inverter outlets", async () => {
      const { getValues } = renderSections(
        {
          water_1_type: "NETWORK",
          water_1_pump: "INV_3KW_200L",
          inv_pump_outlet_dosatron_qty: 2,
          inv_pump_outlet_pw_qty: 1,
        },
        <WaterSupplySection />,
      );

      expect(getValues().water_1_type).toBe("NETWORK");
      expect(getValues().water_1_pump).toBe("INV_3KW_200L");
      expect(getValues().inv_pump_outlet_dosatron_qty).toBe(2);
      expect(getValues().inv_pump_outlet_pw_qty).toBe(1);

      // Deselect water_1_type
      await selectRadixOption("Tipo acqua 1", "---");

      expect(getValues().water_1_type).toBeUndefined();
      expect(getValues().water_1_pump).toBeUndefined();
      // Outlets must reset to 0, not undefined, to satisfy inverterPumpSchema
      expect(getValues().inv_pump_outlet_dosatron_qty).toBe(0);
      expect(getValues().inv_pump_outlet_pw_qty).toBe(0);
    });

    test("deselecting water_1_type with non-inverter pump resets outlets to 0", async () => {
      const { getValues } = renderSections(
        {
          water_1_type: "NETWORK",
          water_1_pump: "BOOST_15KW",
        },
        <WaterSupplySection />,
      );

      // Deselect water_1_type
      await selectRadixOption("Tipo acqua 1", "---");

      expect(getValues().water_1_type).toBeUndefined();
      expect(getValues().water_1_pump).toBeUndefined();
      expect(getValues().inv_pump_outlet_dosatron_qty).toBe(0);
      expect(getValues().inv_pump_outlet_pw_qty).toBe(0);
    });

    test("deselecting water_2_type resets water_2_pump", async () => {
      const { getValues } = renderSections(
        {
          water_1_type: "NETWORK",
          water_2_type: "RECYCLED",
          water_2_pump: "BOOST_15KW",
        },
        <WaterSupplySection />,
      );

      expect(getValues().water_2_pump).toBe("BOOST_15KW");

      // Deselect water_2_type (select the "---" option)
      await selectRadixOption("Tipo acqua 2", "---");

      expect(getValues().water_2_type).toBeUndefined();
      expect(getValues().water_2_pump).toBeUndefined();
    });

    test("changing water_1_pump to a non-inverter resets inverter outlets", async () => {
      const { getValues } = renderSections(
        {
          water_1_type: "NETWORK",
          water_1_pump: "INV_3KW_200L",
          inv_pump_outlet_dosatron_qty: 2,
          inv_pump_outlet_pw_qty: 1,
        },
        <WaterSupplySection />,
      );

      expect(getValues().inv_pump_outlet_dosatron_qty).toBe(2);
      expect(getValues().inv_pump_outlet_pw_qty).toBe(1);

      // There are two "Pompa di rilancio" fields (water 1 and water 2). Target the first.
      const allPumpTriggers = screen.getAllByLabelText("Pompa di rilancio");
      await userEvent.click(allPumpTriggers[0]);
      const options = screen.getAllByRole("option", { name: "Pompa di rilancio 1.5kW" });
      await userEvent.click(options[0]);

      expect(getValues().water_1_pump).toBe("BOOST_15KW");
      // Inverter outlets should be reset
      expect(getValues().inv_pump_outlet_dosatron_qty).toBe(undefined);
      expect(getValues().inv_pump_outlet_pw_qty).toBe(undefined);
    });
  });

  describe("HP pump chain", () => {
    test("unchecking has_15kw_pump resets its outlet fields", async () => {
      const { getValues } = renderSections(
        {
          has_15kw_pump: true,
          pump_outlet_1_15kw: "CHASSIS_WASH",
          pump_outlet_2_15kw: "LOW_SPINNERS",
        },
        <HPPumpSection />,
      );

      expect(getValues().pump_outlet_1_15kw).toBe("CHASSIS_WASH");

      // Uncheck 15kW pump
      await userEvent.click(screen.getByText("Pompa 15kW"));

      expect(getValues().has_15kw_pump).toBe(false);
      expect(getValues().pump_outlet_1_15kw).toBeUndefined();
      expect(getValues().pump_outlet_2_15kw).toBeUndefined();
    });

    test("unchecking has_30kw_pump resets its outlet fields", async () => {
      const { getValues } = renderSections(
        {
          has_30kw_pump: true,
          pump_outlet_1_30kw: "CHASSIS_WASH_HORIZONTAL",
          pump_outlet_2_30kw: "CHASSIS_WASH_LATERAL_HORIZONTAL",
        },
        <HPPumpSection />,
      );

      // Uncheck 30kW pump
      await userEvent.click(screen.getByText("Pompa 30kW"));

      expect(getValues().has_30kw_pump).toBe(false);
      expect(getValues().pump_outlet_1_30kw).toBeUndefined();
      expect(getValues().pump_outlet_2_30kw).toBeUndefined();
    });

    test("unchecking has_omz_pump resets pump_outlet_omz and has_chemical_roof_bar", async () => {
      const { getValues } = renderSections(
        {
          has_omz_pump: true,
          pump_outlet_omz: "HP_ROOF_BAR",
          has_chemical_roof_bar: true,
        },
        <HPPumpSection />,
      );

      expect(getValues().pump_outlet_omz).toBe("HP_ROOF_BAR");
      expect(getValues().has_chemical_roof_bar).toBe(true);

      // Uncheck OMZ pump
      await userEvent.click(screen.getByText("Pompa OMZ"));

      expect(getValues().has_omz_pump).toBe(false);
      expect(getValues().pump_outlet_omz).toBeUndefined();
      expect(getValues().has_chemical_roof_bar).toBe(false);
    });

    test("selecting pump_outlet_omz=SPINNERS resets has_chemical_roof_bar to false", async () => {
      const { getValues } = renderSections(
        {
          has_omz_pump: true,
          pump_outlet_omz: "HP_ROOF_BAR",
          has_chemical_roof_bar: true,
        },
        <HPPumpSection />,
      );

      // There are multiple "Uscita 1" labels (15kw, 30kw, OMZ). Target the OMZ one
      // by finding all and clicking the one that is not disabled (OMZ pump is enabled).
      const allUscita1Triggers = screen.getAllByLabelText("Uscita 1");
      // The OMZ trigger is the one that's not disabled
      const omzTrigger = allUscita1Triggers.find(
        (el) => !el.hasAttribute("disabled") && el.getAttribute("aria-disabled") !== "true"
      );
      expect(omzTrigger).toBeDefined();
      await userEvent.click(omzTrigger!);
      const options = screen.getAllByRole("option", { name: "4 robottine" });
      await userEvent.click(options[0]);

      expect(getValues().pump_outlet_omz).toBe("SPINNERS");
      expect(getValues().has_chemical_roof_bar).toBe(false);
    });
  });

  describe("Touch section", () => {
    test("both itecoweb and card_reader unchecked resets card_qty to 0", async () => {
      const { getValues } = renderSections(
        {
          touch_qty: 1,
          touch_pos: "EXTERNAL",
          touch_fixing_type: "WALL",
          has_itecoweb: true,
          has_card_reader: false,
          card_qty: 5,
        },
        <TouchSection />,
      );

      expect(getValues().card_qty).toBe(5);

      // Uncheck itecoweb (card_reader is already unchecked)
      await userEvent.click(screen.getByText("Itecoweb"));

      await waitFor(() => {
        expect(getValues().card_qty).toBe(0);
      });
    });

    test("card_qty field visible when itecoweb or card_reader is checked", async () => {
      renderSections(
        {
          touch_qty: 1,
          touch_pos: "EXTERNAL",
          touch_fixing_type: "WALL",
          has_itecoweb: false,
          has_card_reader: false,
        },
        <TouchSection />,
      );

      // card_qty should not be visible
      expect(screen.queryByText("Numero di schede")).not.toBeInTheDocument();

      // Check itecoweb
      await userEvent.click(screen.getByText("Itecoweb"));

      // card_qty should be visible
      expect(screen.getByText("Numero di schede")).toBeInTheDocument();
    });

    test("selecting touch_qty=2 resets touch_pos", async () => {
      const { getValues } = renderSections(
        {
          touch_qty: 1,
          touch_pos: "EXTERNAL",
          touch_fixing_type: "WALL",
        },
        <TouchSection />,
      );

      expect(getValues().touch_pos).toBe("EXTERNAL");

      // Change to 2 panels
      await selectRadixOption("Numero di pannelli", "2");

      expect(getValues().touch_qty).toBe(2);
      expect(getValues().touch_pos).toBeUndefined();
    });
  });

  describe("Supply section", () => {
    test("changing supply_type away from BOOM resets has_post_frame", async () => {
      const { getValues } = renderSections(
        {
          supply_type: "BOOM",
          supply_fixing_type: "POST",
          has_post_frame: true,
          supply_side: "LEFT",
        },
        <SupplySection />,
      );

      expect(getValues().has_post_frame).toBe(true);

      // Change to ENERGY_CHAIN (not BOOM)
      await selectRadixOption("Tipo di alimentazione", "Catena portacavi");

      expect(getValues().supply_type).toBe("ENERGY_CHAIN");
      expect(getValues().has_post_frame).toBe(false);
    });

    test("changing supply_fixing_type away from POST resets has_post_frame", async () => {
      const { getValues } = renderSections(
        {
          supply_type: "STRAIGHT_SHELF",
          supply_fixing_type: "POST",
          has_post_frame: true,
          supply_side: "LEFT",
        },
        <SupplySection />,
      );

      expect(getValues().has_post_frame).toBe(true);

      // Change to WALL fixing
      await selectRadixOption("Tipo di fissaggio", "Staffa a muro");

      expect(getValues().supply_fixing_type).toBe("WALL");
      expect(getValues().has_post_frame).toBeUndefined();
    });
  });
});
