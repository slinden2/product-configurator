// @vitest-environment jsdom
import React from "react";
import { describe, test, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { useForm, FormProvider } from "react-hook-form";
import { ConfigSchema, configDefaults } from "@/validation/config-schema";
import SupplySection from "@/components/config-form/supply-section";

afterEach(cleanup);

function renderSupplySection(overrides: Partial<ConfigSchema> = {}) {
  const Wrapper = () => {
    const form = useForm<ConfigSchema>({
      defaultValues: { ...configDefaults, ...overrides } as ConfigSchema,
    });
    return (
      <FormProvider {...form}>
        <SupplySection />
      </FormProvider>
    );
  };
  render(<Wrapper />);
}

describe("SupplySection", () => {
  test("renders section title and all three select fields", () => {
    renderSupplySection();

    expect(screen.getByText("Alimentazione portale")).toBeInTheDocument();
    expect(screen.getByText("Tipo di alimentazione")).toBeInTheDocument();
    expect(screen.getByText("Tipo di fissaggio")).toBeInTheDocument();
    expect(screen.getByText("Lato di alimentazione")).toBeInTheDocument();
  });

  describe("Post frame checkbox visibility", () => {
    test("hidden by default (no supply_type set)", () => {
      renderSupplySection();

      expect(screen.queryByText("Con telaio e coperchio")).not.toBeInTheDocument();
    });

    test("hidden when supply_type is ENERGY_CHAIN with POST fixing", () => {
      renderSupplySection({
        supply_type: "ENERGY_CHAIN",
        supply_fixing_type: "POST",
      });

      expect(screen.queryByText("Con telaio e coperchio")).not.toBeInTheDocument();
    });

    test("hidden when supply_type is BOOM but fixing is WALL", () => {
      renderSupplySection({
        supply_type: "BOOM",
        supply_fixing_type: "WALL",
      });

      expect(screen.queryByText("Con telaio e coperchio")).not.toBeInTheDocument();
    });

    test("shown when supply_type is BOOM and fixing is POST", () => {
      renderSupplySection({
        supply_type: "BOOM",
        supply_fixing_type: "POST",
      });

      expect(screen.getByText("Con telaio e coperchio")).toBeInTheDocument();
    });

    test("shown when supply_type is STRAIGHT_SHELF and fixing is POST", () => {
      renderSupplySection({
        supply_type: "STRAIGHT_SHELF",
        supply_fixing_type: "POST",
      });

      expect(screen.getByText("Con telaio e coperchio")).toBeInTheDocument();
    });
  });
});
