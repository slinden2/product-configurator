// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FormProvider, useForm } from "react-hook-form";
import { afterEach, describe, expect, test } from "vitest";
import GeneralSection from "@/components/config-form/general-section";
import { STANDARD_MACHINE_HEIGHT_MM, WASH_HEIGHT_OFFSET_MM } from "@/types";
import { type ConfigSchema, configDefaults } from "@/validation/config-schema";

afterEach(cleanup);

function renderGeneralSection(overrides: Partial<ConfigSchema> = {}) {
  let getValues: () => ConfigSchema;

  const Wrapper = () => {
    const form = useForm<ConfigSchema>({
      defaultValues: { ...configDefaults, ...overrides } as ConfigSchema,
    });
    getValues = form.getValues;
    return (
      <FormProvider {...form}>
        <GeneralSection />
      </FormProvider>
    );
  };

  render(<Wrapper />);
  return { getValues: () => getValues() };
}

describe("GeneralSection", () => {
  test("renders section title and both fields", () => {
    renderGeneralSection();

    expect(screen.getByText("Informazioni generali")).toBeInTheDocument();
    expect(screen.getByLabelText("Nome del cliente")).toBeInTheDocument();
    expect(screen.getByLabelText("Descrizione")).toBeInTheDocument();
  });

  test("name input updates form value", async () => {
    const { getValues } = renderGeneralSection();

    await userEvent.type(
      screen.getByLabelText("Nome del cliente"),
      "Acme Corp",
    );

    expect(getValues().name).toBe("Acme Corp");
  });

  test("description textarea updates form value", async () => {
    const { getValues } = renderGeneralSection();

    await userEvent.type(
      screen.getByLabelText("Descrizione"),
      "Test description",
    );

    expect(getValues().description).toBe("Test description");
  });

  test("displays pre-filled values from configuration", () => {
    renderGeneralSection({
      name: "Existing Client",
      description: "Existing desc",
    });

    expect(screen.getByLabelText("Nome del cliente")).toHaveValue(
      "Existing Client",
    );
    expect(screen.getByLabelText("Descrizione")).toHaveValue("Existing desc");
  });

  test("total_height input is pre-filled with the standard height", () => {
    renderGeneralSection();

    expect(screen.getByLabelText("Altezza totale")).toHaveValue(
      STANDARD_MACHINE_HEIGHT_MM,
    );
  });

  test("typing a new total_height value updates the input", async () => {
    renderGeneralSection();
    const input = screen.getByLabelText("Altezza totale");

    await userEvent.clear(input);
    await userEvent.type(input, "6000");

    expect(input).toHaveValue(6000);
  });

  test("wash_height display shows the derived value for the default total height", () => {
    renderGeneralSection();

    const expected = `${STANDARD_MACHINE_HEIGHT_MM - WASH_HEIGHT_OFFSET_MM} mm`;
    expect(screen.getByText(expected)).toBeInTheDocument();
  });

  test("wash_height display shows — when total_height is cleared", async () => {
    renderGeneralSection();

    await userEvent.clear(screen.getByLabelText("Altezza totale"));

    expect(screen.getByText("—")).toBeInTheDocument();
  });
});
