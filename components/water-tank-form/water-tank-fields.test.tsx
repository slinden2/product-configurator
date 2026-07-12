// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { FormProvider, useForm } from "react-hook-form";
import { afterEach, describe, expect, test } from "vitest";
import WaterTankFields from "@/components/water-tank-form/water-tank-fields";
import { selectRadixOption } from "@/test/form-test-utils";
import {
  type WaterTankSchema,
  waterTankDefaults,
} from "@/validation/water-tank-schema";

afterEach(cleanup);

function renderWaterTankFields(overrides: Partial<WaterTankSchema> = {}) {
  let getValues: () => WaterTankSchema;

  const Wrapper = () => {
    const form = useForm<WaterTankSchema>({
      defaultValues: { ...waterTankDefaults, ...overrides },
    });
    getValues = form.getValues;
    return (
      <FormProvider {...form}>
        <WaterTankFields />
      </FormProvider>
    );
  };

  render(<Wrapper />);
  return { getValues: () => getValues() };
}

describe("WaterTankFields", () => {
  test("renders tank type and inlet/outlet selects", () => {
    renderWaterTankFields();

    expect(screen.getByText("Tipo di serbatoio")).toBeInTheDocument();
    expect(screen.getByText("Ingressi c/ galleggiante")).toBeInTheDocument();
    expect(screen.getByText("Ingressi no galleggiante")).toBeInTheDocument();
    expect(screen.getByText("Uscite c/ rubinetto")).toBeInTheDocument();
    expect(screen.getByText("Uscite no rubinetto")).toBeInTheDocument();
  });

  describe("Blower and purifier float row", () => {
    test("is hidden when inlet_no_float_qty is 0", () => {
      renderWaterTankFields({ inlet_no_float_qty: 0 });

      expect(screen.queryByText("Con soffiante")).not.toBeInTheDocument();
      expect(
        screen.queryByText("Galleggiante elettrico per depuratore"),
      ).not.toBeInTheDocument();
    });

    test("is shown when inlet_no_float_qty is 1", () => {
      renderWaterTankFields({ inlet_no_float_qty: 1 });

      expect(screen.getByText("Con soffiante")).toBeInTheDocument();
      expect(
        screen.getByText("Galleggiante elettrico per depuratore"),
      ).toBeInTheDocument();
    });

    test("selecting 1 no-float inlet reveals the row", async () => {
      renderWaterTankFields({ inlet_no_float_qty: 0 });

      await selectRadixOption("Ingressi no galleggiante", "1");

      expect(screen.getByText("Con soffiante")).toBeInTheDocument();
      expect(
        screen.getByText("Galleggiante elettrico per depuratore"),
      ).toBeInTheDocument();
    });

    test("selecting 0 no-float inlets resets both booleans to false", async () => {
      const { getValues } = renderWaterTankFields({
        inlet_no_float_qty: 1,
        has_blower: true,
        has_electric_float_for_purifier: true,
      });

      await selectRadixOption("Ingressi no galleggiante", "0");

      expect(getValues().has_blower).toBe(false);
      expect(getValues().has_electric_float_for_purifier).toBe(false);
      expect(screen.queryByText("Con soffiante")).not.toBeInTheDocument();
      expect(
        screen.queryByText("Galleggiante elettrico per depuratore"),
      ).not.toBeInTheDocument();
    });
  });
});
