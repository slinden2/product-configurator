// @vitest-environment jsdom

import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type { UpdateWashBaySchema } from "@/validation/wash-bay-schema";
import type { UpdateWaterTankSchema } from "@/validation/water-tank-schema";

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

vi.mock("@/app/actions/offer-line-actions", () => ({
  addOfferLineAction: vi.fn(),
}));

const mockInsertWaterTank = vi.fn();
const mockEditWaterTank = vi.fn();
vi.mock("@/app/actions/water-tank-actions", () => ({
  insertWaterTankAction: (...args: unknown[]) => mockInsertWaterTank(...args),
  editWaterTankAction: (...args: unknown[]) => mockEditWaterTank(...args),
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

import { toast } from "sonner";
import FormContainer from "@/components/form-container";
import { MSG } from "@/lib/messages";
import { makeValidConfig, selectRadixOption } from "@/test/form-test-utils";

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
    hose_reel_hp_with_post_qty: 0,
    hose_reel_hp_without_post_qty: 0,
    hose_reel_det_with_post_qty: 0,
    hose_reel_det_without_post_qty: 0,
    hose_reel_hp_det_with_post_qty: 0,
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
  mockInsertWaterTank.mockResolvedValue({ success: true });
  mockEditWaterTank.mockResolvedValue({ success: true });
});

// --- Tests ---

describe("FormContainer", () => {
  describe("New configuration (no confId)", () => {
    test("renders only ConfigForm without tabs", () => {
      render(<FormContainer />);

      // Should have the save button from ConfigForm
      expect(
        screen.getByRole("button", { name: /salva configurazione/i }),
      ).toBeInTheDocument();
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
      origin: "STANDALONE" as const,
      userRole: "ENGINEER" as const,
      initialWaterTanks: [makeWaterTank(100)],
      initialWashBays: [makeWashBay(200)],
    };

    test("renders all three tabs", () => {
      render(<FormContainer {...defaultProps} />);

      expect(
        screen.getByRole("tab", { name: "Configurazione" }),
      ).toBeInTheDocument();
      expect(screen.getByRole("tab", { name: "Serbatoi" })).toBeInTheDocument();
      expect(
        screen.getByRole("tab", { name: "Piste lavaggio" }),
      ).toBeInTheDocument();
    });

    test("switching to Serbatoi tab shows water tank management", async () => {
      render(<FormContainer {...defaultProps} />);

      await userEvent.click(screen.getByRole("tab", { name: "Serbatoi" }));

      expect(screen.getByText("Gestione serbatoi")).toBeInTheDocument();
      expect(screen.getByText("Serbatoio 1")).toBeInTheDocument();
    });

    test("switching to Piste lavaggio tab shows wash bay management", async () => {
      render(<FormContainer {...defaultProps} />);

      await userEvent.click(
        screen.getByRole("tab", { name: "Piste lavaggio" }),
      );

      expect(screen.getByText("Gestione piste")).toBeInTheDocument();
      expect(screen.getByText("Pista 1")).toBeInTheDocument();
    });

    test("shows Aggiungi serbatoio button on tanks tab", async () => {
      render(<FormContainer {...defaultProps} />);

      await userEvent.click(screen.getByRole("tab", { name: "Serbatoi" }));

      expect(
        screen.getByRole("button", { name: /aggiungi serbatoio/i }),
      ).toBeInTheDocument();
    });

    test("shows Aggiungi pista button on bays tab", async () => {
      render(<FormContainer {...defaultProps} />);

      await userEvent.click(
        screen.getByRole("tab", { name: "Piste lavaggio" }),
      );

      expect(
        screen.getByRole("button", { name: /aggiungi pista/i }),
      ).toBeInTheDocument();
    });

    test("clicking Aggiungi serbatoio shows add form and hides button", async () => {
      render(<FormContainer {...defaultProps} />);

      await userEvent.click(screen.getByRole("tab", { name: "Serbatoi" }));
      await userEvent.click(
        screen.getByRole("button", { name: /aggiungi serbatoio/i }),
      );

      expect(screen.getByText("Aggiungi nuovo Serbatoio")).toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: /aggiungi serbatoio/i }),
      ).not.toBeInTheDocument();
    });

    test("clicking Aggiungi pista shows add form and hides button", async () => {
      render(<FormContainer {...defaultProps} />);

      await userEvent.click(
        screen.getByRole("tab", { name: "Piste lavaggio" }),
      );
      await userEvent.click(
        screen.getByRole("button", { name: /aggiungi pista/i }),
      );

      expect(screen.getByText("Aggiungi nuova Pista")).toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: /aggiungi pista/i }),
      ).not.toBeInTheDocument();
    });
  });

  describe("Role-based add button visibility", () => {
    test("hides add buttons when status is TECH_APPROVED", async () => {
      const config = makeValidConfig();
      render(
        <FormContainer
          confId={1}
          configuration={config}
          confStatus="TECH_APPROVED"
          userRole="ADMIN"
          initialWaterTanks={[makeWaterTank(100)]}
          initialWashBays={[]}
        />,
      );

      await userEvent.click(screen.getByRole("tab", { name: "Serbatoi" }));

      expect(
        screen.queryByRole("button", { name: /aggiungi serbatoio/i }),
      ).not.toBeInTheDocument();
    });

    test("hides add buttons when SALES and status is SALES_APPROVED", async () => {
      const config = makeValidConfig();
      render(
        <FormContainer
          confId={1}
          configuration={config}
          confStatus="SALES_APPROVED"
          userRole="SALES"
          initialWaterTanks={[]}
          initialWashBays={[]}
        />,
      );

      await userEvent.click(screen.getByRole("tab", { name: "Serbatoi" }));

      expect(
        screen.queryByRole("button", { name: /aggiungi serbatoio/i }),
      ).not.toBeInTheDocument();
    });

    test("shows add buttons when ENGINEER and status is IN_TECH_REVIEW", async () => {
      const config = makeValidConfig();
      render(
        <FormContainer
          confId={1}
          configuration={config}
          confStatus="IN_TECH_REVIEW"
          origin="OFFER"
          userRole="ENGINEER"
          initialWaterTanks={[]}
          initialWashBays={[]}
        />,
      );

      await userEvent.click(screen.getByRole("tab", { name: "Serbatoi" }));

      expect(
        screen.getByRole("button", { name: /aggiungi serbatoio/i }),
      ).toBeInTheDocument();
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
        />,
      );

      await userEvent.click(
        screen.getByRole("tab", { name: "Piste lavaggio" }),
      );

      expect(
        screen.getByText(MSG.config.energyChainRequiresGantry),
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
        />,
      );

      await userEvent.click(
        screen.getByRole("tab", { name: "Piste lavaggio" }),
      );

      expect(
        screen.queryByText(MSG.config.energyChainRequiresGantry),
      ).not.toBeInTheDocument();
    });
  });

  describe("Unsaved changes — save and switch", () => {
    const config = makeValidConfig();
    const defaultProps = {
      confId: 1,
      configuration: config,
      confStatus: "DRAFT" as const,
      origin: "STANDALONE" as const,
      userRole: "ENGINEER" as const,
      initialWaterTanks: [makeWaterTank(100)],
      initialWashBays: [makeWashBay(200)],
    };

    async function dirtyTankAndAttemptSwitch() {
      await userEvent.click(screen.getByRole("tab", { name: "Serbatoi" }));
      await selectRadixOption("Ingressi c/ galleggiante", "2");
      await userEvent.click(
        screen.getByRole("tab", { name: "Piste lavaggio" }),
      );
      const dialog = await screen.findByRole("dialog");
      expect(
        within(dialog).getByText("Modifiche non salvate"),
      ).toBeInTheDocument();
      return dialog;
    }

    test("auto-switches to the pending tab after a successful save", async () => {
      render(<FormContainer {...defaultProps} />);

      const dialog = await dirtyTankAndAttemptSwitch();
      await userEvent.click(
        within(dialog).getByRole("button", { name: "Salva" }),
      );

      await waitFor(() => {
        expect(mockEditWaterTank).toHaveBeenCalled();
      });
      await waitFor(() => {
        expect(screen.getByText("Gestione piste")).toBeInTheDocument();
      });
    });

    test("a failed save disarms the pending tab — a later save must not switch (#148)", async () => {
      mockEditWaterTank.mockResolvedValueOnce({
        success: false,
        error: "Errore server",
      });
      render(<FormContainer {...defaultProps} />);

      const dialog = await dirtyTankAndAttemptSwitch();
      await userEvent.click(
        within(dialog).getByRole("button", { name: "Salva" }),
      );

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Errore server");
      });
      expect(screen.getByText("Gestione serbatoi")).toBeInTheDocument();

      // Later, unrelated save succeeds: the stale pending tab must not yank
      await waitFor(() => {
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      });
      // findByRole: while a save is pending the button's accessible name is
      // "Caricamento…Salva" (Spinner's sr-only announcement), so wait for it
      // to settle back to idle.
      const saveButton = await screen.findByRole("button", { name: "Salva" });
      await waitFor(() => {
        expect(saveButton).toBeEnabled();
      });
      await userEvent.click(saveButton);

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalled();
      });
      expect(screen.getByText("Gestione serbatoi")).toBeInTheDocument();
      expect(screen.queryByText("Gestione piste")).not.toBeInTheDocument();
    });

    test("a Zod validation failure disarms the pending tab and shows feedback", async () => {
      render(
        <FormContainer
          {...defaultProps}
          initialWaterTanks={[]}
          initialWashBays={[]}
        />,
      );

      // Dirty the add-tank form into an invalid state (required type missing)
      await userEvent.click(screen.getByRole("tab", { name: "Serbatoi" }));
      await userEvent.click(
        screen.getByRole("button", { name: /aggiungi serbatoio/i }),
      );
      await selectRadixOption("Ingressi c/ galleggiante", "1");

      await userEvent.click(
        screen.getByRole("tab", { name: "Configurazione" }),
      );
      const dialog = await screen.findByRole("dialog");
      await userEvent.click(
        within(dialog).getByRole("button", { name: "Salva" }),
      );

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(MSG.toast.validationErrors);
      });
      expect(screen.getByText("Gestione serbatoi")).toBeInTheDocument();

      // Fix the form and save: still no yank to the stale pending tab
      await waitFor(() => {
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      });
      await selectRadixOption("Tipo di serbatoio", "2000L");
      await selectRadixOption("Uscite c/ rubinetto", "1");
      await userEvent.click(screen.getByRole("button", { name: "Aggiungi" }));

      await waitFor(() => {
        expect(mockInsertWaterTank).toHaveBeenCalled();
      });
      expect(screen.getByText("Gestione serbatoi")).toBeInTheDocument();
    });

    test("discarding changes switches immediately", async () => {
      render(<FormContainer {...defaultProps} />);

      const dialog = await dirtyTankAndAttemptSwitch();
      await userEvent.click(
        within(dialog).getByRole("button", { name: "Scarta modifiche" }),
      );

      expect(screen.getByText("Gestione piste")).toBeInTheDocument();
      expect(mockEditWaterTank).not.toHaveBeenCalled();
    });
  });
});
