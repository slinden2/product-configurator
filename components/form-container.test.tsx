// @vitest-environment jsdom
import React from "react";
import { vi, describe, test, expect, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { UpdateWaterTankSchema } from "@/validation/water-tank-schema";
import type { UpdateWashBaySchema } from "@/validation/wash-bay-schema";

// --- Mocks (before imports) ---

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, back: vi.fn() }),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const mockInsertConfig = vi.fn();
vi.mock("@/app/actions/insert-configuration-action", () => ({
  insertConfigurationAction: (...args: unknown[]) => mockInsertConfig(...args),
}));

const mockEditConfig = vi.fn();
vi.mock("@/app/actions/edit-configuration-action", () => ({
  editConfigurationAction: (...args: unknown[]) => mockEditConfig(...args),
}));

vi.mock("@/app/actions/water-tank-actions", () => ({
  insertWaterTankAction: vi.fn().mockResolvedValue({ success: true }),
  editWaterTankAction: vi.fn().mockResolvedValue({ success: true }),
  deleteWaterTankAction: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock("@/app/actions/wash-bay-actions", () => ({
  insertWashBayAction: vi.fn().mockResolvedValue({ success: true }),
  editWashBayAction: vi.fn().mockResolvedValue({ success: true }),
  deleteWashBayAction: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock("@hookform/devtools", () => ({
  DevTool: () => null,
}));

// Mock useMediaQuery to return true (desktop mode = TabsList instead of Select dropdown)
vi.mock("@/hooks/use-media-query", () => ({
  default: () => true,
}));

// --- Imports (after mocks) ---

import FormContainer from "@/components/form-container";
import { makeValidConfig } from "@/test/form-test-utils";

// --- Test Data ---

function makeWaterTank(id: number): UpdateWaterTankSchema {
  return {
    id,
    configuration_id: 1,
    type: "L2000",
    inlet_w_float_qty: 0,
    inlet_no_float_qty: 0,
    outlet_w_valve_qty: 1,
    outlet_no_valve_qty: 0,
    has_blower: false,
  } as UpdateWaterTankSchema;
}

function makeWashBay(id: number): UpdateWashBaySchema {
  return {
    id,
    configuration_id: 1,
    hp_lance_qty: 0,
    det_lance_qty: 0,
    hose_reel_qty: 0,
    pressure_washer_type: undefined,
    pressure_washer_qty: undefined,
    has_gantry: false,
    energy_chain_width: undefined,
    has_shelf_extension: false,
    is_first_bay: false,
    has_bay_dividers: false,
  } as UpdateWashBaySchema;
}

// --- Setup ---

afterEach(cleanup);

beforeEach(() => {
  vi.clearAllMocks();
  mockInsertConfig.mockResolvedValue({ success: true, id: 42 });
  mockEditConfig.mockResolvedValue({ success: true });
});

// --- Tests ---

describe("FormContainer", () => {
  describe("New configuration (no confId)", () => {
    test("renders only ConfigForm without tabs", () => {
      render(<FormContainer />);

      // Should have the save button from ConfigForm
      expect(screen.getByRole("button", { name: /salva configurazione/i })).toBeInTheDocument();
      // Should NOT have tabs
      expect(screen.queryByText("Serbatoi")).not.toBeInTheDocument();
      expect(screen.queryByText("Piste lavaggio")).not.toBeInTheDocument();
    });
  });

  describe("Edit configuration with tabs", () => {
    const config = makeValidConfig();
    const defaultProps = {
      confId: 1,
      configuration: config,
      confStatus: "DRAFT" as const,
      userRole: "ENGINEER" as const,
      initialWaterTanks: [makeWaterTank(100)],
      initialWashBays: [makeWashBay(200)],
    };

    test("renders all three tabs", () => {
      render(<FormContainer {...defaultProps} />);

      expect(screen.getByRole("tab", { name: "Configurazione" })).toBeInTheDocument();
      expect(screen.getByRole("tab", { name: "Serbatoi" })).toBeInTheDocument();
      expect(screen.getByRole("tab", { name: "Piste lavaggio" })).toBeInTheDocument();
    });

    test("switching to Serbatoi tab shows water tank management", async () => {
      render(<FormContainer {...defaultProps} />);

      await userEvent.click(screen.getByRole("tab", { name: "Serbatoi" }));

      expect(screen.getByText("Gestione serbatoi")).toBeInTheDocument();
      expect(screen.getByText("Serbatoio 1")).toBeInTheDocument();
    });

    test("switching to Piste lavaggio tab shows wash bay management", async () => {
      render(<FormContainer {...defaultProps} />);

      await userEvent.click(screen.getByRole("tab", { name: "Piste lavaggio" }));

      expect(screen.getByText("Gestione piste")).toBeInTheDocument();
      expect(screen.getByText("Pista 1")).toBeInTheDocument();
    });

    test("shows Aggiungi serbatoio button on tanks tab", async () => {
      render(<FormContainer {...defaultProps} />);

      await userEvent.click(screen.getByRole("tab", { name: "Serbatoi" }));

      expect(screen.getByRole("button", { name: /aggiungi serbatoio/i })).toBeInTheDocument();
    });

    test("shows Aggiungi pista button on bays tab", async () => {
      render(<FormContainer {...defaultProps} />);

      await userEvent.click(screen.getByRole("tab", { name: "Piste lavaggio" }));

      expect(screen.getByRole("button", { name: /aggiungi pista/i })).toBeInTheDocument();
    });

    test("clicking Aggiungi serbatoio shows add form and hides button", async () => {
      render(<FormContainer {...defaultProps} />);

      await userEvent.click(screen.getByRole("tab", { name: "Serbatoi" }));
      await userEvent.click(screen.getByRole("button", { name: /aggiungi serbatoio/i }));

      expect(screen.getByText("Aggiungi nuovo Serbatoio")).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /aggiungi serbatoio/i })).not.toBeInTheDocument();
    });

    test("clicking Aggiungi pista shows add form and hides button", async () => {
      render(<FormContainer {...defaultProps} />);

      await userEvent.click(screen.getByRole("tab", { name: "Piste lavaggio" }));
      await userEvent.click(screen.getByRole("button", { name: /aggiungi pista/i }));

      expect(screen.getByText("Aggiungi nuova Pista")).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /aggiungi pista/i })).not.toBeInTheDocument();
    });
  });

  describe("Role-based add button visibility", () => {
    test("hides add buttons when status is APPROVED", async () => {
      const config = makeValidConfig();
      render(
        <FormContainer
          confId={1}
          configuration={config}
          confStatus="APPROVED"
          userRole="ADMIN"
          initialWaterTanks={[makeWaterTank(100)]}
          initialWashBays={[]}
        />
      );

      await userEvent.click(screen.getByRole("tab", { name: "Serbatoi" }));

      expect(screen.queryByRole("button", { name: /aggiungi serbatoio/i })).not.toBeInTheDocument();
    });

    test("hides add buttons when SALES and status is SUBMITTED", async () => {
      const config = makeValidConfig();
      render(
        <FormContainer
          confId={1}
          configuration={config}
          confStatus="SUBMITTED"
          userRole="SALES"
          initialWaterTanks={[]}
          initialWashBays={[]}
        />
      );

      await userEvent.click(screen.getByRole("tab", { name: "Serbatoi" }));

      expect(screen.queryByRole("button", { name: /aggiungi serbatoio/i })).not.toBeInTheDocument();
    });

    test("shows add buttons when ENGINEER and status is SUBMITTED", async () => {
      const config = makeValidConfig();
      render(
        <FormContainer
          confId={1}
          configuration={config}
          confStatus="SUBMITTED"
          userRole="ENGINEER"
          initialWaterTanks={[]}
          initialWashBays={[]}
        />
      );

      await userEvent.click(screen.getByRole("tab", { name: "Serbatoi" }));

      expect(screen.getByRole("button", { name: /aggiungi serbatoio/i })).toBeInTheDocument();
    });
  });

  describe("Energy chain warning on bays tab", () => {
    test("shows warning when supply_type is ENERGY_CHAIN and no bay has gantry with chain width", async () => {
      const config = makeValidConfig({ supply_type: "ENERGY_CHAIN" });
      render(
        <FormContainer
          confId={1}
          configuration={config}
          confStatus="DRAFT"
          userRole="ENGINEER"
          initialWaterTanks={[]}
          initialWashBays={[makeWashBay(200)]}
        />
      );

      await userEvent.click(screen.getByRole("tab", { name: "Piste lavaggio" }));

      expect(
        screen.getByText(/catena portacavi è obbligatoria almeno una pista/)
      ).toBeInTheDocument();
    });

    test("does not show warning when supply_type is not ENERGY_CHAIN", async () => {
      const config = makeValidConfig({ supply_type: "STRAIGHT_SHELF" });
      render(
        <FormContainer
          confId={1}
          configuration={config}
          confStatus="DRAFT"
          userRole="ENGINEER"
          initialWaterTanks={[]}
          initialWashBays={[makeWashBay(200)]}
        />
      );

      await userEvent.click(screen.getByRole("tab", { name: "Piste lavaggio" }));

      expect(
        screen.queryByText(/catena portacavi è obbligatoria almeno una pista/)
      ).not.toBeInTheDocument();
    });
  });
});
