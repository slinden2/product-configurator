// @vitest-environment jsdom
import React from "react";
import { describe, test, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useForm, FormProvider } from "react-hook-form";
import { ConfigSchema, configDefaults } from "@/validation/config-schema";
import TouchSection from "@/components/config-form/touch-section";

afterEach(cleanup);

function renderTouchSection(overrides: Partial<ConfigSchema> = {}) {
  let getValues: () => ConfigSchema;

  const Wrapper = () => {
    const form = useForm<ConfigSchema>({
      defaultValues: { ...configDefaults, ...overrides } as ConfigSchema,
    });
    getValues = form.getValues;
    return (
      <FormProvider {...form}>
        <TouchSection />
      </FormProvider>
    );
  };

  render(<Wrapper />);
  return { getValues: () => getValues() };
}

describe("TouchSection", () => {
  test("renders section title, selects, and checkboxes", () => {
    renderTouchSection();

    expect(
      screen.getByText("Configurazione quadro elettrico"),
    ).toBeInTheDocument();
    expect(screen.getByText("Numero di pannelli")).toBeInTheDocument();
    expect(screen.getByText("Posizione touch")).toBeInTheDocument();
    expect(screen.getByText("Fissaggio touch esterno")).toBeInTheDocument();
    expect(screen.getByText("Itecoweb")).toBeInTheDocument();
    expect(screen.getByText("Lettore schede")).toBeInTheDocument();
    expect(screen.getByText("Portale fast")).toBeInTheDocument();
  });

  describe("Conditional disabling", () => {
    test("touch_pos is disabled when touch_qty is not 1", () => {
      renderTouchSection({ touch_qty: 2 });

      expect(screen.getByLabelText("Posizione touch")).toBeDisabled();
    });

    test("touch_pos is enabled when touch_qty is 1", () => {
      renderTouchSection({ touch_qty: 1 });

      expect(screen.getByLabelText("Posizione touch")).not.toBeDisabled();
    });

    test("touch_fixing_type is disabled when touch_qty is 1 and touch_pos is ON_PANEL", () => {
      renderTouchSection({ touch_qty: 1, touch_pos: "ON_PANEL" });

      expect(screen.getByLabelText("Fissaggio touch esterno")).toBeDisabled();
    });

    test("touch_fixing_type is enabled when touch_qty is 2", () => {
      renderTouchSection({ touch_qty: 2 });

      expect(
        screen.getByLabelText("Fissaggio touch esterno"),
      ).not.toBeDisabled();
    });

    test("touch_fixing_type is enabled when touch_qty is 1 and touch_pos is EXTERNAL", () => {
      renderTouchSection({ touch_qty: 1, touch_pos: "EXTERNAL" });

      expect(
        screen.getByLabelText("Fissaggio touch esterno"),
      ).not.toBeDisabled();
    });
  });

  describe("Card quantity conditional rendering", () => {
    test("card_qty is hidden by default", () => {
      renderTouchSection();

      expect(screen.queryByText("Numero di schede")).not.toBeInTheDocument();
    });

    test("card_qty is shown when has_itecoweb is true", () => {
      renderTouchSection({ has_itecoweb: true });

      expect(screen.getByText("Numero di schede")).toBeInTheDocument();
    });

    test("card_qty is shown when has_card_reader is true", () => {
      renderTouchSection({ has_card_reader: true });

      expect(screen.getByText("Numero di schede")).toBeInTheDocument();
    });

    test("checking Itecoweb reveals card_qty", async () => {
      renderTouchSection();

      expect(screen.queryByText("Numero di schede")).not.toBeInTheDocument();

      const checkboxes = screen.getAllByRole("checkbox");
      // has_itecoweb is the first checkbox in the second row
      await userEvent.click(checkboxes[0]);

      expect(screen.getByText("Numero di schede")).toBeInTheDocument();
    });
  });
});
