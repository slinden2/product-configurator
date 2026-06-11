// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FormProvider, useForm } from "react-hook-form";
import { afterEach, describe, expect, test } from "vitest";
import MiscSection from "@/components/config-form/misc-section";
import { type ConfigSchema, configDefaults } from "@/validation/config-schema";

afterEach(cleanup);

function renderMiscSection(overrides: Partial<ConfigSchema> = {}) {
  let getValues: () => ConfigSchema;

  const Wrapper = () => {
    const form = useForm<ConfigSchema>({
      defaultValues: { ...configDefaults, ...overrides } as ConfigSchema,
    });
    getValues = form.getValues;
    return (
      <FormProvider {...form}>
        <MiscSection />
      </FormProvider>
    );
  };

  render(<Wrapper />);
  return { getValues: () => getValues() };
}

describe("MiscSection", () => {
  test("renders section title and the chassis wash detergent checkbox", () => {
    renderMiscSection();

    expect(screen.getByText("Varie")).toBeInTheDocument();
    expect(screen.getByText("Lavachassis con detergente")).toBeInTheDocument();
  });

  describe("Conditional rendering", () => {
    test("manual antifreeze is hidden by default", () => {
      renderMiscSection();

      expect(screen.queryByText("Antigelo manuale")).not.toBeInTheDocument();
    });

    test("manual antifreeze is hidden when only the pump is enabled", () => {
      renderMiscSection({ has_chassis_wash_detergent_pump: true });

      expect(screen.queryByText("Antigelo manuale")).not.toBeInTheDocument();
    });

    test("manual antifreeze is hidden when only antifreeze is enabled", () => {
      renderMiscSection({ has_antifreeze: true });

      expect(screen.queryByText("Antigelo manuale")).not.toBeInTheDocument();
    });

    test("manual antifreeze is shown when pump and antifreeze are enabled", () => {
      renderMiscSection({
        has_chassis_wash_detergent_pump: true,
        has_antifreeze: true,
      });

      expect(screen.getByText("Antigelo manuale")).toBeInTheDocument();
    });
  });

  describe("Checkbox toggling", () => {
    test("checking the pump reveals manual antifreeze when has_antifreeze is set", async () => {
      renderMiscSection({ has_antifreeze: true });

      expect(screen.queryByText("Antigelo manuale")).not.toBeInTheDocument();

      const checkboxes = screen.getAllByRole("checkbox");
      await userEvent.click(checkboxes[0]);

      expect(screen.getByText("Antigelo manuale")).toBeInTheDocument();
    });

    test("unchecking the pump resets has_chassis_wash_detergent_manual_antifreeze", async () => {
      const { getValues } = renderMiscSection({
        has_chassis_wash_detergent_pump: true,
        has_antifreeze: true,
        has_chassis_wash_detergent_manual_antifreeze: true,
      });

      const checkboxes = screen.getAllByRole("checkbox");
      await userEvent.click(checkboxes[0]);

      expect(getValues().has_chassis_wash_detergent_pump).toBe(false);
      expect(getValues().has_chassis_wash_detergent_manual_antifreeze).toBe(
        false,
      );
    });
  });
});
