// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { FormProvider, useForm } from "react-hook-form";
import { afterEach, describe, expect, test } from "vitest";
import SupplySection from "@/components/config-form/supply-section";
import { MSG } from "@/lib/messages";
import { type ConfigSchema, configDefaults } from "@/validation/config-schema";

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

  describe("supply_fixing_type labels", () => {
    // Radix Select renders option text into the trigger via <SelectValue> when
    // a value is selected. The dropdown content is only in the DOM when open,
    // so we verify the trigger text (selected item label) instead of option list items.
    test("trigger shows ENERGY_CHAIN labels when supply_type is ENERGY_CHAIN", () => {
      renderSupplySection({
        supply_type: "ENERGY_CHAIN",
        supply_fixing_type: "POST",
      });

      expect(screen.getByText("Linea pali")).toBeInTheDocument();
      expect(screen.queryByText("Palo alimentazione")).not.toBeInTheDocument();
    });

    test("trigger shows default labels when supply_type is BOOM", () => {
      renderSupplySection({ supply_type: "BOOM", supply_fixing_type: "POST" });

      expect(screen.getByText("Palo alimentazione")).toBeInTheDocument();
      expect(screen.queryByText("Linea pali")).not.toBeInTheDocument();
    });
  });

  describe("ENERGY_CHAIN + WALL warning banner", () => {
    test("shown when supply_type is ENERGY_CHAIN and fixing is WALL", () => {
      renderSupplySection({
        supply_type: "ENERGY_CHAIN",
        supply_fixing_type: "WALL",
      });

      expect(
        screen.getByText(MSG.energyChainWall.supplySection),
      ).toBeInTheDocument();
    });

    test("hidden when supply_type is ENERGY_CHAIN and fixing is POST", () => {
      renderSupplySection({
        supply_type: "ENERGY_CHAIN",
        supply_fixing_type: "POST",
      });

      expect(
        screen.queryByText(MSG.energyChainWall.supplySection),
      ).not.toBeInTheDocument();
    });

    test("hidden when supply_type is BOOM and fixing is WALL", () => {
      renderSupplySection({
        supply_type: "BOOM",
        supply_fixing_type: "WALL",
      });

      expect(
        screen.queryByText(MSG.energyChainWall.supplySection),
      ).not.toBeInTheDocument();
    });
  });

  describe("Post frame checkbox visibility", () => {
    test("hidden by default (no supply_type set)", () => {
      renderSupplySection();

      expect(
        screen.queryByText("Con telaio e coperchio"),
      ).not.toBeInTheDocument();
    });

    test("hidden when supply_type is ENERGY_CHAIN with POST fixing", () => {
      renderSupplySection({
        supply_type: "ENERGY_CHAIN",
        supply_fixing_type: "POST",
      });

      expect(
        screen.queryByText("Con telaio e coperchio"),
      ).not.toBeInTheDocument();
    });

    test("hidden when supply_type is BOOM but fixing is WALL", () => {
      renderSupplySection({
        supply_type: "BOOM",
        supply_fixing_type: "WALL",
      });

      expect(
        screen.queryByText("Con telaio e coperchio"),
      ).not.toBeInTheDocument();
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
