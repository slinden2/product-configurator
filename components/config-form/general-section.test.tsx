// @vitest-environment jsdom

import { cleanup, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, test } from "vitest";
import GeneralSection from "@/components/config-form/general-section";
import {
  renderWithConfigFormProvider,
  selectRadixOption,
} from "@/test/form-test-utils";
import { STANDARD_MACHINE_HEIGHT_MM, WASH_HEIGHT_OFFSET_MM } from "@/types";
import type { ConfigSchema } from "@/validation/config-schema";

afterEach(cleanup);

const renderGeneralSection = (overrides: Partial<ConfigSchema> = {}) =>
  renderWithConfigFormProvider(<GeneralSection />, overrides);

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

  describe("Verniciatura checkbox", () => {
    test("is hidden when machine_type is STD", () => {
      renderGeneralSection({ machine_type: "STD" });

      expect(screen.queryByLabelText("Verniciatura")).not.toBeInTheDocument();
    });

    test("appears when machine_type is OMZ", () => {
      renderGeneralSection({ machine_type: "OMZ" });

      expect(screen.getByLabelText("Verniciatura")).toBeInTheDocument();
    });

    test("checking it sets has_omz_paint to true", async () => {
      const { getValues } = renderGeneralSection({ machine_type: "OMZ" });

      await userEvent.click(screen.getByLabelText("Verniciatura"));

      expect(getValues().has_omz_paint).toBe(true);
    });

    test("switching machine_type from OMZ to STD resets has_omz_paint to false", async () => {
      const { getValues } = renderGeneralSection({
        machine_type: "OMZ",
        has_omz_paint: true,
      });

      await selectRadixOption("Tipo impianto", "Standard");

      expect(getValues().has_omz_paint).toBe(false);
      expect(screen.queryByLabelText("Verniciatura")).not.toBeInTheDocument();
    });
  });
});
