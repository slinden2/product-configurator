// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { FormProvider, useForm } from "react-hook-form";
import { afterEach, describe, expect, test } from "vitest";
import RailSection from "@/components/config-form/rail-section";
import { type ConfigSchema, configDefaults } from "@/validation/config-schema";

afterEach(cleanup);

function renderRailSection(overrides: Partial<ConfigSchema> = {}) {
  const Wrapper = () => {
    const form = useForm<ConfigSchema>({
      defaultValues: { ...configDefaults, ...overrides } as ConfigSchema,
    });
    return (
      <FormProvider {...form}>
        <RailSection />
      </FormProvider>
    );
  };
  render(<Wrapper />);
}

describe("RailSection", () => {
  test("renders section title and all three select fields", () => {
    renderRailSection();

    expect(screen.getByText("Rotaie")).toBeInTheDocument();
    expect(screen.getByText("Tipo di rotaie")).toBeInTheDocument();
    expect(screen.getByText("Lunghezza rotaie")).toBeInTheDocument();
    expect(screen.getByText("Guida ruote")).toBeInTheDocument();
  });
});
