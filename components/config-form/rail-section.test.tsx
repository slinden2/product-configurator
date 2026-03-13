// @vitest-environment jsdom
import React from "react";
import { describe, test, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { useForm, FormProvider } from "react-hook-form";
import { ConfigSchema, configDefaults } from "@/validation/config-schema";
import RailSection from "@/components/config-form/rail-section";

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
