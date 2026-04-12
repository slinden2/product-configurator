// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FormProvider, useForm } from "react-hook-form";
import { afterEach, describe, expect, test } from "vitest";
import GeneralSection from "@/components/config-form/general-section";
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
});
