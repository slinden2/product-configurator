// @vitest-environment jsdom
import React from "react";
import { vi, describe, test, expect, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { UpdateConfigSchema } from "@/validation/config-schema";

// --- Mocks (before imports) ---

const mockPush = vi.fn();
const mockBack = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, back: mockBack }),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const mockInsertAction = vi.fn();
vi.mock("@/app/actions/insert-configuration-action", () => ({
  insertConfigurationAction: (...args: unknown[]) => mockInsertAction(...args),
}));

const mockEditAction = vi.fn();
vi.mock("@/app/actions/edit-configuration-action", () => ({
  editConfigurationAction: (...args: unknown[]) => mockEditAction(...args),
}));

vi.mock("@hookform/devtools", () => ({
  DevTool: () => null,
}));

// --- Imports (after mocks) ---

import ConfigForm from "@/components/config-form";
import { toast } from "sonner";

// --- Test Data ---

function makeValidConfig(): UpdateConfigSchema {
  return {
    user_id: "test-user-123",
    name: "Test Config",
    description: "",
    brush_qty: 0,
    brush_type: undefined,
    brush_color: undefined,
    has_chemical_pump: false,
    chemical_qty: undefined,
    chemical_pump_pos: undefined,
    has_foam: false,
    has_acid_pump: false,
    acid_pump_pos: undefined,
    has_shampoo_pump: false,
    has_wax_pump: false,
    water_1_type: "NETWORK",
    water_1_pump: undefined,
    water_2_type: undefined,
    water_2_pump: undefined,
    has_antifreeze: false,
    inv_pump_outlet_dosatron_qty: 0,
    inv_pump_outlet_pw_qty: 0,
    supply_type: "STRAIGHT_SHELF",
    supply_side: "LEFT",
    supply_fixing_type: undefined,
    has_post_frame: false,
    rail_type: "DOWELED",
    rail_length: 21,
    rail_guide_qty: 0,
    has_15kw_pump: false,
    pump_outlet_1_15kw: undefined,
    pump_outlet_2_15kw: undefined,
    has_30kw_pump: false,
    pump_outlet_1_30kw: undefined,
    pump_outlet_2_30kw: undefined,
    has_omz_pump: false,
    pump_outlet_omz: undefined,
    has_chemical_roof_bar: false,
    touch_qty: 1,
    touch_pos: "EXTERNAL",
    touch_fixing_type: "WALL",
    has_itecoweb: false,
    has_card_reader: false,
    card_qty: 0,
    is_fast: false,
  } as UpdateConfigSchema;
}

// --- Tests ---

afterEach(cleanup);

beforeEach(() => {
  vi.clearAllMocks();
  mockInsertAction.mockResolvedValue({ success: true, id: 42 });
  mockEditAction.mockResolvedValue({ success: true });
});

describe("ConfigForm", () => {
  describe("Rendering", () => {
    test("renders submit and cancel buttons", () => {
      render(<ConfigForm />);

      expect(
        screen.getByRole("button", { name: /salva configurazione/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /annulla/i })
      ).toBeInTheDocument();
    });
  });

  describe("Disabled state", () => {
    test("disables the fieldset when status is OPEN", () => {
      const config = makeValidConfig();
      render(
        <ConfigForm id={1} configuration={config} status="OPEN" />
      );

      const fieldset = document.querySelector("fieldset");
      expect(fieldset).toBeDisabled();
    });

    test("disables the fieldset when status is LOCKED", () => {
      const config = makeValidConfig();
      render(
        <ConfigForm id={1} configuration={config} status="LOCKED" />
      );

      const fieldset = document.querySelector("fieldset");
      expect(fieldset).toBeDisabled();
    });

    test("enables the fieldset when status is DRAFT", () => {
      const config = makeValidConfig();
      render(
        <ConfigForm id={1} configuration={config} status="DRAFT" />
      );

      const fieldset = document.querySelector("fieldset");
      expect(fieldset).not.toBeDisabled();
    });

    test("enables the fieldset for new configuration", () => {
      render(<ConfigForm />);

      const fieldset = document.querySelector("fieldset");
      expect(fieldset).not.toBeDisabled();
    });
  });

  describe("Edit submission", () => {
    test("calls editConfigurationAction and shows success toast", async () => {
      const config = makeValidConfig();
      render(
        <ConfigForm
          id={1}
          configuration={config}
          status="DRAFT"
          formKey="config-1"
        />
      );

      const submitButton = screen.getByRole("button", {
        name: /salva configurazione/i,
      });
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(mockEditAction).toHaveBeenCalledWith(
          1,
          "test-user-123",
          expect.objectContaining({ name: "Test Config" })
        );
      });

      expect(toast.success).toHaveBeenCalledWith(
        "Configurazione aggiornata."
      );
    });

    test("displays error text when editConfigurationAction throws", async () => {
      mockEditAction.mockResolvedValueOnce({ success: false, error: "Network error" });
      const config = makeValidConfig();

      render(
        <ConfigForm id={1} configuration={config} status="DRAFT" />
      );

      const submitButton = screen.getByRole("button", {
        name: /salva configurazione/i,
      });
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText("Network error")).toBeInTheDocument();
      });
    });
  });
});
