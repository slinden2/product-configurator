// @vitest-environment jsdom

import { describe, test, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useForm, FormProvider } from "react-hook-form";
import { type ConfigSchema, configDefaults } from "@/validation/config-schema";
import ChemPumpSection from "@/components/config-form/chem-pump-section";

afterEach(cleanup);

function renderChemPumpSection(overrides: Partial<ConfigSchema> = {}) {
  let getValues: () => ConfigSchema;

  const Wrapper = () => {
    const form = useForm<ConfigSchema>({
      defaultValues: { ...configDefaults, ...overrides } as ConfigSchema,
    });
    getValues = form.getValues;
    return (
      <FormProvider {...form}>
        <ChemPumpSection />
      </FormProvider>
    );
  };

  render(<Wrapper />);
  return { getValues: () => getValues() };
}

describe("ChemPumpSection", () => {
  test("renders section title and all four checkboxes", () => {
    renderChemPumpSection();

    expect(screen.getByText("Pompe dosatrici")).toBeInTheDocument();
    expect(screen.getByText("Pompa sapone")).toBeInTheDocument();
    expect(screen.getByText("Pompa cera")).toBeInTheDocument();
    expect(screen.getByText("Pompa prelavaggio")).toBeInTheDocument();
    expect(screen.getByText("Pompa acido")).toBeInTheDocument();
  });

  describe("Conditional disabling", () => {
    test("shampoo pump is disabled when brush_qty is 0", () => {
      renderChemPumpSection({ brush_qty: 0 });

      const checkboxes = screen.getAllByRole("checkbox");
      // has_shampoo_pump is the first checkbox
      expect(checkboxes[0]).toBeDisabled();
    });

    test("shampoo pump is enabled when brush_qty > 0", () => {
      renderChemPumpSection({ brush_qty: 2 });

      const checkboxes = screen.getAllByRole("checkbox");
      expect(checkboxes[0]).not.toBeDisabled();
    });

    test("acid pump is disabled when brush_qty is 2", () => {
      renderChemPumpSection({ brush_qty: 2 });

      const checkboxes = screen.getAllByRole("checkbox");
      // has_acid_pump is the last checkbox (4th)
      expect(checkboxes[3]).toBeDisabled();
    });

    test("acid pump is enabled when brush_qty is 3", () => {
      renderChemPumpSection({ brush_qty: 3 });

      const checkboxes = screen.getAllByRole("checkbox");
      expect(checkboxes[3]).not.toBeDisabled();
    });
  });

  describe("Conditional rendering", () => {
    test("chemical pump fields are hidden by default", () => {
      renderChemPumpSection();

      expect(
        screen.queryByText("Numero di pompe di prelavaggio"),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByText("Posizione delle pompe di prelavaggio"),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByText("Nebulizzazione con schiuma"),
      ).not.toBeInTheDocument();
    });

    test("chemical pump fields are shown when has_chemical_pump is true", () => {
      renderChemPumpSection({ has_chemical_pump: true });

      expect(
        screen.getByText("Numero di pompe di prelavaggio"),
      ).toBeInTheDocument();
      expect(
        screen.getByText("Posizione delle pompe di prelavaggio"),
      ).toBeInTheDocument();
      expect(
        screen.getByText("Nebulizzazione con schiuma"),
      ).toBeInTheDocument();
    });

    test("acid pump position is hidden by default", () => {
      renderChemPumpSection();

      expect(
        screen.queryByText("Posizione della pompa acido"),
      ).not.toBeInTheDocument();
    });

    test("acid pump position is shown when has_acid_pump is true", () => {
      renderChemPumpSection({ has_acid_pump: true });

      expect(
        screen.getByText("Posizione della pompa acido"),
      ).toBeInTheDocument();
    });
  });

  describe("Checkbox toggling", () => {
    test("checking chemical pump reveals its fields", async () => {
      renderChemPumpSection();

      expect(
        screen.queryByText("Numero di pompe di prelavaggio"),
      ).not.toBeInTheDocument();

      // The chemical pump checkbox is the 3rd one
      const checkboxes = screen.getAllByRole("checkbox");
      await userEvent.click(checkboxes[2]);

      expect(
        screen.getByText("Numero di pompe di prelavaggio"),
      ).toBeInTheDocument();
    });

    test("unchecking chemical pump resets chemical_qty, chemical_pump_pos, and has_foam", async () => {
      const { getValues } = renderChemPumpSection({
        has_chemical_pump: true,
        chemical_qty: 1,
        chemical_pump_pos: "ONBOARD",
        has_foam: true,
      });

      // Uncheck chemical pump (3rd checkbox)
      const checkboxes = screen.getAllByRole("checkbox");
      await userEvent.click(checkboxes[2]);

      expect(getValues().has_chemical_pump).toBe(false);
      expect(getValues().chemical_qty).toBeUndefined();
      expect(getValues().chemical_pump_pos).toBeUndefined();
      expect(getValues().has_foam).toBe(false);
    });

    test("unchecking acid pump resets acid_pump_pos", async () => {
      const { getValues } = renderChemPumpSection({
        has_acid_pump: true,
        acid_pump_pos: "WASH_BAY",
        brush_qty: 3,
      });

      // Acid pump is the 4th checkbox
      const checkboxes = screen.getAllByRole("checkbox");
      await userEvent.click(checkboxes[3]);

      expect(getValues().has_acid_pump).toBe(false);
      expect(getValues().acid_pump_pos).toBeUndefined();
    });
  });
});
