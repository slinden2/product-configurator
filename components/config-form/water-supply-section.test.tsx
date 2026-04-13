// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FormProvider, useForm } from "react-hook-form";
import { afterEach, describe, expect, test } from "vitest";
import WaterSupplySection from "@/components/config-form/water-supply-section";
import { type ConfigSchema, configDefaults } from "@/validation/config-schema";

afterEach(cleanup);

function renderWaterSupplySection(overrides: Partial<ConfigSchema> = {}) {
  let getValues: () => ConfigSchema;

  const Wrapper = () => {
    const form = useForm<ConfigSchema>({
      defaultValues: { ...configDefaults, ...overrides } as ConfigSchema,
    });
    getValues = form.getValues;
    return (
      <FormProvider {...form}>
        <WaterSupplySection />
      </FormProvider>
    );
  };

  render(<Wrapper />);
  return { getValues: () => getValues() };
}

describe("WaterSupplySection", () => {
  test("renders section title and base fields", () => {
    renderWaterSupplySection();

    expect(screen.getByText("Alimentazione acqua")).toBeInTheDocument();
    expect(screen.getByText("Tipo acqua 1")).toBeInTheDocument();
    expect(screen.getAllByText("Pompa di rilancio")).toHaveLength(2);
    expect(screen.getByText("Tipo acqua 2")).toBeInTheDocument();
    expect(screen.getByText("Scarico invernale")).toBeInTheDocument();
  });

  describe("Conditional rendering of inverter pump outlets", () => {
    test("outlet fields are hidden when no inverter pump is selected", () => {
      renderWaterSupplySection({ water_1_pump: "BOOST_15KW" });

      expect(screen.queryByText("Uscite Dosatron")).not.toBeInTheDocument();
      expect(
        screen.queryByText("Uscite idropulitrice"),
      ).not.toBeInTheDocument();
    });

    test("outlet fields are shown when INV_3KW_200L is selected", () => {
      renderWaterSupplySection({ water_1_pump: "INV_3KW_200L" });

      expect(screen.getByText("Uscite Dosatron")).toBeInTheDocument();
      expect(screen.getByText("Uscite idropulitrice")).toBeInTheDocument();
    });

    test("outlet fields are shown when INV_3KW_250L is selected", () => {
      renderWaterSupplySection({ water_1_pump: "INV_3KW_250L" });

      expect(screen.getByText("Uscite Dosatron")).toBeInTheDocument();
      expect(screen.getByText("Uscite idropulitrice")).toBeInTheDocument();
    });
  });

  describe("Water 2 pump disabling", () => {
    test("water 2 pump is disabled when water_2_type is undefined", () => {
      renderWaterSupplySection({ water_2_type: undefined });

      const pumpSelects = screen.getAllByLabelText("Pompa di rilancio");
      // The second "Pompa di rilancio" is water 2 pump
      expect(pumpSelects[1]).toBeDisabled();
    });

    test("water 2 pump is enabled when water_2_type is set", () => {
      renderWaterSupplySection({ water_2_type: "NETWORK" });

      const pumpSelects = screen.getAllByLabelText("Pompa di rilancio");
      expect(pumpSelects[1]).not.toBeDisabled();
    });
  });

  test("antifreeze checkbox toggles form value", async () => {
    const { getValues } = renderWaterSupplySection();

    expect(getValues().has_antifreeze).toBe(false);

    await userEvent.click(screen.getByRole("checkbox"));

    expect(getValues().has_antifreeze).toBe(true);
  });

  describe("Filter backwash checkbox", () => {
    test("checkbox is hidden when no inverter pump is selected", () => {
      renderWaterSupplySection({ water_1_pump: "BOOST_15KW" });

      expect(
        screen.queryByText("Uscita controlavaggio filtro"),
      ).not.toBeInTheDocument();
    });

    test("checkbox is shown when INV_3KW_200L is selected", () => {
      renderWaterSupplySection({ water_1_pump: "INV_3KW_200L" });

      expect(
        screen.getByText("Uscita controlavaggio filtro"),
      ).toBeInTheDocument();
    });

    test("checkbox is shown when INV_3KW_250L is selected", () => {
      renderWaterSupplySection({ water_1_pump: "INV_3KW_250L" });

      expect(
        screen.getByText("Uscita controlavaggio filtro"),
      ).toBeInTheDocument();
    });

    test("checkbox toggles has_filter_backwash form value", async () => {
      const { getValues } = renderWaterSupplySection({
        water_1_pump: "INV_3KW_200L",
      });

      expect(getValues().has_filter_backwash).toBe(false);

      const checkboxes = screen.getAllByRole("checkbox");
      const filterCheckbox = checkboxes.find(
        (el) => el.getAttribute("data-state") !== undefined,
      );
      await userEvent.click(
        filterCheckbox ?? checkboxes[checkboxes.length - 1],
      );

      expect(getValues().has_filter_backwash).toBe(true);
    });
  });
});
