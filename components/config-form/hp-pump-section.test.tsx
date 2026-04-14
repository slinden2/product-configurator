// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FormProvider, useForm } from "react-hook-form";
import { afterEach, describe, expect, test } from "vitest";
import HPPumpSection from "@/components/config-form/hp-pump-section";
import { type ConfigSchema, configDefaults } from "@/validation/config-schema";

afterEach(cleanup);

function renderHPPumpSection(overrides: Partial<ConfigSchema> = {}) {
  let getValues: () => ConfigSchema;

  const Wrapper = () => {
    const form = useForm<ConfigSchema>({
      defaultValues: { ...configDefaults, ...overrides } as ConfigSchema,
    });
    getValues = form.getValues;
    return (
      <FormProvider {...form}>
        <HPPumpSection />
      </FormProvider>
    );
  };

  render(<Wrapper />);
  return { getValues: () => getValues() };
}

describe("HPPumpSection", () => {
  test("renders section title and all pump checkboxes", () => {
    renderHPPumpSection();

    expect(screen.getByText("Pompe HP")).toBeInTheDocument();
    expect(screen.getByText("Pompa 7.5kW")).toBeInTheDocument();
    expect(screen.getByText("Pompa 15kW")).toBeInTheDocument();
    expect(screen.getByText("Pompa 30kW")).toBeInTheDocument();
    expect(screen.getByText("Pompa OMZ")).toBeInTheDocument();
  });

  describe("7.5kW pump outlets", () => {
    test("outlet selects are disabled when has_75kw_pump is false", () => {
      renderHPPumpSection({ has_75kw_pump: false });

      const outlets = screen.getAllByLabelText("Uscita 1");
      const outlets2 = screen.getAllByLabelText("Uscita 2");
      // First row outlets (7.5kW)
      expect(outlets[0]).toBeDisabled();
      expect(outlets2[0]).toBeDisabled();
    });

    test("outlet selects are enabled when has_75kw_pump is true", () => {
      renderHPPumpSection({ has_75kw_pump: true });

      const outlets = screen.getAllByLabelText("Uscita 1");
      const outlets2 = screen.getAllByLabelText("Uscita 2");
      expect(outlets[0]).not.toBeDisabled();
      expect(outlets2[0]).not.toBeDisabled();
    });

    test("unchecking 7.5kW pump resets its outlet fields", async () => {
      const { getValues } = renderHPPumpSection({
        has_75kw_pump: true,
        pump_outlet_1_75kw: "CHASSIS_WASH",
        pump_outlet_2_75kw: "LOW_BARS",
      });

      const checkboxes = screen.getAllByRole("checkbox");
      // has_75kw_pump is the first checkbox
      await userEvent.click(checkboxes[0]);

      expect(getValues().has_75kw_pump).toBe(false);
      expect(getValues().pump_outlet_1_75kw).toBeUndefined();
      expect(getValues().pump_outlet_2_75kw).toBeUndefined();
    });

    test("chassis wash accessories appear when 7.5kW has CHASSIS_WASH outlet", () => {
      renderHPPumpSection({
        has_75kw_pump: true,
        pump_outlet_1_75kw: "CHASSIS_WASH",
      });

      expect(screen.getByText("Piastre lavachassis")).toBeInTheDocument();
    });

    test("unchecking 7.5kW pump when it is the only chassis wash pump resets has_chassis_wash_plates", async () => {
      const { getValues } = renderHPPumpSection({
        has_75kw_pump: true,
        pump_outlet_1_75kw: "CHASSIS_WASH",
        has_chassis_wash_plates: true,
      });

      const checkboxes = screen.getAllByRole("checkbox");
      // has_75kw_pump is the first checkbox
      await userEvent.click(checkboxes[0]);

      expect(getValues().has_chassis_wash_plates).toBe(false);
    });
  });

  describe("15kW pump outlets", () => {
    test("outlet selects are disabled when has_15kw_pump is false", () => {
      renderHPPumpSection({ has_15kw_pump: false });

      const outlets = screen.getAllByLabelText("Uscita 1");
      const outlets2 = screen.getAllByLabelText("Uscita 2");
      // second row outlets (15kW)
      expect(outlets[1]).toBeDisabled();
      expect(outlets2[1]).toBeDisabled();
    });

    test("outlet selects are enabled when has_15kw_pump is true", () => {
      renderHPPumpSection({ has_15kw_pump: true });

      const outlets = screen.getAllByLabelText("Uscita 1");
      const outlets2 = screen.getAllByLabelText("Uscita 2");
      expect(outlets[1]).not.toBeDisabled();
      expect(outlets2[1]).not.toBeDisabled();
    });

    test("unchecking 15kW pump resets its outlet fields", async () => {
      const { getValues } = renderHPPumpSection({
        has_15kw_pump: true,
        pump_outlet_1_15kw: "CHASSIS_WASH",
        pump_outlet_2_15kw: "LOW_SPINNERS",
      });

      const checkboxes = screen.getAllByRole("checkbox");
      // has_15kw_pump is the second checkbox
      await userEvent.click(checkboxes[1]);

      expect(getValues().has_15kw_pump).toBe(false);
      expect(getValues().pump_outlet_1_15kw).toBeUndefined();
      expect(getValues().pump_outlet_2_15kw).toBeUndefined();
    });
  });

  describe("30kW pump outlets", () => {
    test("outlet selects are disabled when has_30kw_pump is false", () => {
      renderHPPumpSection({ has_30kw_pump: false });

      const outlets = screen.getAllByLabelText("Uscita 1");
      const outlets2 = screen.getAllByLabelText("Uscita 2");
      // Third row outlets (30kW)
      expect(outlets[2]).toBeDisabled();
      expect(outlets2[2]).toBeDisabled();
    });

    test("outlet selects are enabled when has_30kw_pump is true", () => {
      renderHPPumpSection({ has_30kw_pump: true });

      const outlets = screen.getAllByLabelText("Uscita 1");
      const outlets2 = screen.getAllByLabelText("Uscita 2");
      expect(outlets[2]).not.toBeDisabled();
      expect(outlets2[2]).not.toBeDisabled();
    });

    test("unchecking 30kW pump resets its outlet fields", async () => {
      const { getValues } = renderHPPumpSection({
        has_30kw_pump: true,
        pump_outlet_1_30kw: "CHASSIS_WASH_HORIZONTAL",
        pump_outlet_2_30kw: "LOW_SPINNERS_HIGH_BARS",
      });

      const checkboxes = screen.getAllByRole("checkbox");
      // has_30kw_pump is the third checkbox
      await userEvent.click(checkboxes[2]);

      expect(getValues().has_30kw_pump).toBe(false);
      expect(getValues().pump_outlet_1_30kw).toBeUndefined();
      expect(getValues().pump_outlet_2_30kw).toBeUndefined();
    });
  });

  describe("chassis wash accessories", () => {
    test("Piastre lavachassis checkbox renders when 15kW pump has chassis wash outlet", () => {
      renderHPPumpSection({
        has_15kw_pump: true,
        pump_outlet_1_15kw: "CHASSIS_WASH",
      });

      expect(screen.getByText("Piastre lavachassis")).toBeInTheDocument();
    });

    test("Piastre lavachassis checkbox is not rendered when no chassis wash outlet is active", () => {
      renderHPPumpSection();

      expect(screen.queryByText("Piastre lavachassis")).not.toBeInTheDocument();
    });

    test("unchecking 15kW pump when it is the only chassis wash pump resets has_chassis_wash_plates", async () => {
      const { getValues } = renderHPPumpSection({
        has_15kw_pump: true,
        pump_outlet_1_15kw: "CHASSIS_WASH",
        has_chassis_wash_plates: true,
      });

      const checkboxes = screen.getAllByRole("checkbox");
      // has_15kw_pump is the second checkbox
      await userEvent.click(checkboxes[1]);

      expect(getValues().has_chassis_wash_plates).toBe(false);
    });

    test("unchecking 30kW pump when it has no chassis wash outlet does not reset has_chassis_wash_plates", async () => {
      // 15kW has chassis wash (accessories are active), 30kW does not
      const { getValues } = renderHPPumpSection({
        has_15kw_pump: true,
        pump_outlet_1_15kw: "CHASSIS_WASH",
        has_chassis_wash_plates: true,
        has_30kw_pump: true,
        pump_outlet_1_30kw: "FULL_ARCH",
      });

      await userEvent.click(screen.getByLabelText("Pompa 30kW"));

      expect(getValues().has_30kw_pump).toBe(false);
      expect(getValues().has_chassis_wash_plates).toBe(true);
    });
  });

  describe("OMZ pump", () => {
    test("OMZ outlet is disabled when has_omz_pump is false", () => {
      renderHPPumpSection({ has_omz_pump: false });

      const outlets = screen.getAllByLabelText("Uscita 1");
      // Fourth row outlet (OMZ) — after 15kW, 30kW, 7.5kW rows
      expect(outlets[3]).toBeDisabled();
    });

    test("OMZ outlet is enabled when has_omz_pump is true", () => {
      renderHPPumpSection({ has_omz_pump: true });

      const outlets = screen.getAllByLabelText("Uscita 1");
      expect(outlets[3]).not.toBeDisabled();
    });

    test("chemical roof bar checkbox is hidden (opacity-0) when outlet is not HP_ROOF_BAR", () => {
      renderHPPumpSection({ has_omz_pump: true, pump_outlet_omz: "SPINNERS" });

      const chemBarLabel = screen.getByText("Con barra di prelavaggio");
      const wrapper = chemBarLabel.closest("div.opacity-0, div.opacity-100");
      expect(wrapper).toHaveClass("opacity-0");
    });

    test("chemical roof bar checkbox is visible when outlet is HP_ROOF_BAR", () => {
      renderHPPumpSection({
        has_omz_pump: true,
        pump_outlet_omz: "HP_ROOF_BAR",
      });

      const chemBarLabel = screen.getByText("Con barra di prelavaggio");
      const wrapper = chemBarLabel.closest("div.opacity-0, div.opacity-100");
      expect(wrapper).toHaveClass("opacity-100");
    });

    test("unchecking OMZ pump resets pump_outlet_omz and has_chemical_roof_bar", async () => {
      const { getValues } = renderHPPumpSection({
        has_omz_pump: true,
        pump_outlet_omz: "HP_ROOF_BAR",
        has_chemical_roof_bar: true,
      });

      const checkboxes = screen.getAllByRole("checkbox");
      // has_omz_pump is the fourth checkbox (after 15kW, 30kW, 7.5kW)
      await userEvent.click(checkboxes[3]);

      expect(getValues().has_omz_pump).toBe(false);
      expect(getValues().pump_outlet_omz).toBeUndefined();
      expect(getValues().has_chemical_roof_bar).toBe(false);
    });
  });
});
