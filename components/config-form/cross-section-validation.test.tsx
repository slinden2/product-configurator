// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

// --- Mocks (before imports) ---

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, back: vi.fn() }),
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
import { makeValidConfig } from "@/test/form-test-utils";

// --- Setup ---

afterEach(cleanup);

beforeEach(() => {
  vi.clearAllMocks();
  mockEditAction.mockResolvedValue({ success: true });
});

// --- Tests ---

describe("Cross-section validation (superRefine)", () => {
  describe("Rail length + Energy chain", () => {
    test("shows error when energy chain selected with rail_length < 25", async () => {
      const config = makeValidConfig({
        supply_type: "ENERGY_CHAIN",
        supply_side: "LEFT",
        supply_fixing_type: "POST",
        rail_length: 21,
      });

      render(
        <ConfigForm
          id={1}
          configuration={config}
          status="DRAFT"
          userRole="ENGINEER"
        />,
      );

      await userEvent.click(
        screen.getByRole("button", { name: /salva configurazione/i }),
      );

      await waitFor(() => {
        expect(
          screen.getByText(
            "Con la catena portacavi le rotaie devono essere almeno 25 metri.",
          ),
        ).toBeInTheDocument();
      });

      // Action should NOT be called due to validation failure
      expect(mockEditAction).not.toHaveBeenCalled();
    });
  });

  describe("Rail length + Fast portal", () => {
    test("shows error when is_fast with rail_length > 7", async () => {
      const config = makeValidConfig({
        is_fast: true,
        rail_length: 21,
      });

      render(
        <ConfigForm
          id={1}
          configuration={config}
          status="DRAFT"
          userRole="ENGINEER"
        />,
      );

      await userEvent.click(
        screen.getByRole("button", { name: /salva configurazione/i }),
      );

      await waitFor(() => {
        expect(
          screen.getByText(
            "Per un portale fast le rotaie devono essere da 7 metri.",
          ),
        ).toBeInTheDocument();
      });

      expect(mockEditAction).not.toHaveBeenCalled();
    });
  });

  describe("Brush restrictions (no path — blocks submission)", () => {
    test("blocks submission when brush_qty=0 and has_shampoo_pump=true", async () => {
      const config = makeValidConfig({
        brush_qty: 0,
        has_shampoo_pump: true,
      });

      render(
        <ConfigForm
          id={1}
          configuration={config}
          status="DRAFT"
          userRole="ENGINEER"
        />,
      );

      await userEvent.click(
        screen.getByRole("button", { name: /salva configurazione/i }),
      );

      // Wait for validation to process
      await waitFor(() => {
        expect(mockEditAction).not.toHaveBeenCalled();
      });
    });

    test("blocks submission when brush_qty=2 and has_acid_pump=true", async () => {
      const config = makeValidConfig({
        brush_qty: 2,
        brush_type: "THREAD",
        brush_color: "BLUE_SILVER",
        has_acid_pump: true,
        acid_pump_pos: "ONBOARD",
      });

      render(
        <ConfigForm
          id={1}
          configuration={config}
          status="DRAFT"
          userRole="ENGINEER"
        />,
      );

      await userEvent.click(
        screen.getByRole("button", { name: /salva configurazione/i }),
      );

      await waitFor(() => {
        expect(mockEditAction).not.toHaveBeenCalled();
      });
    });

    test("blocks submission when brush_qty=2 and has_omz_pump=true", async () => {
      const config = makeValidConfig({
        brush_qty: 2,
        brush_type: "THREAD",
        brush_color: "BLUE_SILVER",
        has_omz_pump: true,
        pump_outlet_omz: "HP_ROOF_BAR",
      });

      render(
        <ConfigForm
          id={1}
          configuration={config}
          status="DRAFT"
          userRole="ENGINEER"
        />,
      );

      await userEvent.click(
        screen.getByRole("button", { name: /salva configurazione/i }),
      );

      await waitFor(() => {
        expect(mockEditAction).not.toHaveBeenCalled();
      });
    });
  });

  describe("Regression: non-inverter pump submission", () => {
    test("submits successfully with boost pump and outlet quantities at 0", async () => {
      // Regression: inv_pump_outlet fields must default to 0 when no inverter pump is selected.
      // Previously, changing water_1_pump from inverter to non-inverter reset outlets to undefined,
      // causing z.number() validation failure and blocking all form submissions.
      const config = makeValidConfig({
        water_1_type: "NETWORK",
        water_1_pump: "BOOST_15KW",
        inv_pump_outlet_dosatron_qty: 0,
        inv_pump_outlet_pw_qty: 0,
      });

      render(
        <ConfigForm
          id={1}
          configuration={config}
          status="DRAFT"
          userRole="ENGINEER"
        />,
      );

      await userEvent.click(
        screen.getByRole("button", { name: /salva configurazione/i }),
      );

      await waitFor(() => {
        expect(mockEditAction).toHaveBeenCalled();
      });
    });

    test("submits successfully with no water pump configured", async () => {
      // Regression: default config (no inverter pump) must pass validation
      const config = makeValidConfig({
        water_1_type: "NETWORK",
        water_1_pump: undefined,
        inv_pump_outlet_dosatron_qty: 0,
        inv_pump_outlet_pw_qty: 0,
      });

      render(
        <ConfigForm
          id={1}
          configuration={config}
          status="DRAFT"
          userRole="ENGINEER"
        />,
      );

      await userEvent.click(
        screen.getByRole("button", { name: /salva configurazione/i }),
      );

      await waitFor(() => {
        expect(mockEditAction).toHaveBeenCalled();
      });
    });
  });

  describe("Valid submissions proceed", () => {
    test("submits successfully with valid energy chain + long rail", async () => {
      const config = makeValidConfig({
        supply_type: "ENERGY_CHAIN",
        supply_side: "LEFT",
        supply_fixing_type: "POST",
        rail_length: 25,
      });

      render(
        <ConfigForm
          id={1}
          configuration={config}
          status="DRAFT"
          userRole="ENGINEER"
        />,
      );

      await userEvent.click(
        screen.getByRole("button", { name: /salva configurazione/i }),
      );

      await waitFor(() => {
        expect(mockEditAction).toHaveBeenCalled();
      });
    });

    test("submits successfully with valid fast portal + short rail", async () => {
      const config = makeValidConfig({
        is_fast: true,
        rail_length: 7,
      });

      render(
        <ConfigForm
          id={1}
          configuration={config}
          status="DRAFT"
          userRole="ENGINEER"
        />,
      );

      await userEvent.click(
        screen.getByRole("button", { name: /salva configurazione/i }),
      );

      await waitFor(() => {
        expect(mockEditAction).toHaveBeenCalled();
      });
    });
  });
});
