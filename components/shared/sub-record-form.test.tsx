// @vitest-environment jsdom
import React from "react";
import { vi, describe, test, expect, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { UpdateWaterTankSchema } from "@/validation/water-tank-schema";
import type { UpdateWashBaySchema } from "@/validation/wash-bay-schema";

// --- Mocks (before imports) ---

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const mockInsertWaterTank = vi.fn();
const mockEditWaterTank = vi.fn();
const mockDeleteWaterTank = vi.fn();
vi.mock("@/app/actions/water-tank-actions", () => ({
  insertWaterTankAction: (...args: unknown[]) => mockInsertWaterTank(...args),
  editWaterTankAction: (...args: unknown[]) => mockEditWaterTank(...args),
  deleteWaterTankAction: (...args: unknown[]) => mockDeleteWaterTank(...args),
}));

const mockInsertWashBay = vi.fn();
const mockEditWashBay = vi.fn();
const mockDeleteWashBay = vi.fn();
vi.mock("@/app/actions/wash-bay-actions", () => ({
  insertWashBayAction: (...args: unknown[]) => mockInsertWashBay(...args),
  editWashBayAction: (...args: unknown[]) => mockEditWashBay(...args),
  deleteWashBayAction: (...args: unknown[]) => mockDeleteWashBay(...args),
}));

// --- Imports (after mocks) ---

import WaterTankForm from "@/components/water-tank-form";
import WashBayForm from "@/components/wash-bay-form";
import { toast } from "sonner";
import { selectRadixOption } from "@/test/form-test-utils";

// --- Test Data ---

function makeWaterTank(
  overrides: Partial<UpdateWaterTankSchema> = {},
): UpdateWaterTankSchema {
  return {
    id: 10,
    configuration_id: 1,
    type: "L2000",
    inlet_w_float_qty: 1,
    inlet_no_float_qty: 0,
    outlet_w_valve_qty: 1,
    outlet_no_valve_qty: 0,
    has_blower: false,
    ...overrides,
  } as UpdateWaterTankSchema;
}

function makeWashBay(
  overrides: Partial<UpdateWashBaySchema> = {},
): UpdateWashBaySchema {
  return {
    id: 20,
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
    ...overrides,
  } as UpdateWashBaySchema;
}

// --- Setup ---

afterEach(cleanup);

beforeEach(() => {
  vi.clearAllMocks();
  mockInsertWaterTank.mockResolvedValue({ success: true });
  mockEditWaterTank.mockResolvedValue({ success: true });
  mockDeleteWaterTank.mockResolvedValue({ success: true });
  mockInsertWashBay.mockResolvedValue({ success: true });
  mockEditWashBay.mockResolvedValue({ success: true });
  mockDeleteWashBay.mockResolvedValue({ success: true });
});

// --- Water Tank Tests ---

describe("SubRecordForm — WaterTankForm", () => {
  describe("Create flow", () => {
    test("renders add form title and Aggiungi button", () => {
      render(
        <WaterTankForm
          confId={1}
          confStatus="DRAFT"
          userRole="ENGINEER"
          onSaveSuccess={vi.fn()}
        />,
      );

      expect(screen.getByText("Aggiungi nuovo Serbatoio")).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /aggiungi/i }),
      ).toBeInTheDocument();
    });

    test("calls insertAction on submit and fires onSaveSuccess", async () => {
      const onSaveSuccess = vi.fn();
      render(
        <WaterTankForm
          confId={1}
          confStatus="DRAFT"
          userRole="ENGINEER"
          onSaveSuccess={onSaveSuccess}
        />,
      );

      // Fill required fields
      await selectRadixOption("Tipo di serbatoio", "2000L");
      await selectRadixOption("Uscite c/ rubinetto", "1");

      // Submit
      await userEvent.click(screen.getByRole("button", { name: /aggiungi/i }));

      await waitFor(() => {
        expect(mockInsertWaterTank).toHaveBeenCalledWith(
          1,
          expect.objectContaining({ type: "L2000", outlet_w_valve_qty: 1 }),
        );
      });

      expect(toast.success).toHaveBeenCalledWith("Serbatoio creato.");
      expect(onSaveSuccess).toHaveBeenCalledWith("Serbatoio");
    });
  });

  describe("Edit flow", () => {
    test("renders edit form title with index", () => {
      render(
        <WaterTankForm
          confId={1}
          confStatus="DRAFT"
          userRole="ENGINEER"
          waterTank={makeWaterTank()}
          waterTankIndex={1}
          onDelete={vi.fn()}
          onSaveSuccess={vi.fn()}
        />,
      );

      expect(screen.getByText("Serbatoio 1")).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /salva/i }),
      ).toBeInTheDocument();
    });

    test("calls editAction on submit", async () => {
      render(
        <WaterTankForm
          confId={1}
          confStatus="DRAFT"
          userRole="ENGINEER"
          waterTank={makeWaterTank()}
          waterTankIndex={1}
          onDelete={vi.fn()}
          onSaveSuccess={vi.fn()}
        />,
      );

      // Change a field to make form dirty
      await selectRadixOption("Ingressi c/ galleggiante", "2");

      await userEvent.click(screen.getByRole("button", { name: /salva/i }));

      await waitFor(() => {
        expect(mockEditWaterTank).toHaveBeenCalledWith(
          1,
          10,
          expect.objectContaining({ inlet_w_float_qty: 2 }),
        );
      });

      expect(toast.success).toHaveBeenCalledWith("Serbatoio 1 aggiornato.");
    });
  });

  describe("Delete flow", () => {
    test("calls deleteAction and onDelete after confirm", async () => {
      const onDelete = vi.fn();

      render(
        <WaterTankForm
          confId={1}
          confStatus="DRAFT"
          userRole="ENGINEER"
          waterTank={makeWaterTank()}
          waterTankIndex={1}
          onDelete={onDelete}
          onSaveSuccess={vi.fn()}
        />,
      );

      // Click delete button to open confirmation dialog
      await userEvent.click(
        screen.getByRole("button", { name: /elimina serbatoio 1/i }),
      );

      // Confirm in the dialog
      expect(screen.getByText("Conferma eliminazione")).toBeInTheDocument();
      await userEvent.click(screen.getByRole("button", { name: "Elimina" }));

      await waitFor(() => {
        expect(mockDeleteWaterTank).toHaveBeenCalledWith(1, 10);
      });

      expect(onDelete).toHaveBeenCalledWith(10);
      expect(toast.success).toHaveBeenCalledWith("Serbatoio 1 eliminato.");
    });

    test("does not delete when confirm is cancelled", async () => {
      const onDelete = vi.fn();

      render(
        <WaterTankForm
          confId={1}
          confStatus="DRAFT"
          userRole="ENGINEER"
          waterTank={makeWaterTank()}
          waterTankIndex={1}
          onDelete={onDelete}
          onSaveSuccess={vi.fn()}
        />,
      );

      // Click delete button to open confirmation dialog
      await userEvent.click(
        screen.getByRole("button", { name: /elimina serbatoio 1/i }),
      );

      // Cancel in the dialog
      expect(screen.getByText("Conferma eliminazione")).toBeInTheDocument();
      await userEvent.click(screen.getByRole("button", { name: "Annulla" }));

      expect(mockDeleteWaterTank).not.toHaveBeenCalled();
      expect(onDelete).not.toHaveBeenCalled();
    });
  });

  describe("Error handling", () => {
    test("shows error toast when insert fails", async () => {
      mockInsertWaterTank.mockResolvedValueOnce({
        success: false,
        error: "Errore DB",
      });

      render(
        <WaterTankForm
          confId={1}
          confStatus="DRAFT"
          userRole="ENGINEER"
          onSaveSuccess={vi.fn()}
        />,
      );

      await selectRadixOption("Tipo di serbatoio", "2000L");
      await selectRadixOption("Uscite c/ rubinetto", "1");
      await userEvent.click(screen.getByRole("button", { name: /aggiungi/i }));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Errore DB");
      });
    });

    test("shows error toast when edit fails", async () => {
      mockEditWaterTank.mockResolvedValueOnce({
        success: false,
        error: "Errore aggiornamento",
      });

      render(
        <WaterTankForm
          confId={1}
          confStatus="DRAFT"
          userRole="ENGINEER"
          waterTank={makeWaterTank()}
          waterTankIndex={1}
          onDelete={vi.fn()}
          onSaveSuccess={vi.fn()}
        />,
      );

      await selectRadixOption("Ingressi c/ galleggiante", "2");
      await userEvent.click(screen.getByRole("button", { name: /salva/i }));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Errore aggiornamento");
      });
    });
  });

  describe("Role-based disabling", () => {
    test("disables fieldset when status is APPROVED", () => {
      render(
        <WaterTankForm
          confId={1}
          confStatus="APPROVED"
          userRole="ADMIN"
          waterTank={makeWaterTank()}
          waterTankIndex={1}
          onDelete={vi.fn()}
          onSaveSuccess={vi.fn()}
        />,
      );

      const fieldset = document.querySelector("fieldset");
      expect(fieldset).toBeDisabled();
    });

    test("disables fieldset when SALES and status is SUBMITTED", () => {
      render(
        <WaterTankForm
          confId={1}
          confStatus="SUBMITTED"
          userRole="SALES"
          waterTank={makeWaterTank()}
          waterTankIndex={1}
          onDelete={vi.fn()}
          onSaveSuccess={vi.fn()}
        />,
      );

      const fieldset = document.querySelector("fieldset");
      expect(fieldset).toBeDisabled();
    });

    test("enables fieldset when ENGINEER and status is DRAFT", () => {
      render(
        <WaterTankForm
          confId={1}
          confStatus="DRAFT"
          userRole="ENGINEER"
          waterTank={makeWaterTank()}
          waterTankIndex={1}
          onDelete={vi.fn()}
          onSaveSuccess={vi.fn()}
        />,
      );

      const fieldset = document.querySelector("fieldset");
      expect(fieldset).not.toBeDisabled();
    });
  });

  describe("Dirty state tracking", () => {
    test("fires onDirtyChange when a field is modified", async () => {
      const onDirtyChange = vi.fn();

      render(
        <WaterTankForm
          confId={1}
          confStatus="DRAFT"
          userRole="ENGINEER"
          waterTank={makeWaterTank()}
          waterTankIndex={1}
          onDelete={vi.fn()}
          onSaveSuccess={vi.fn()}
          formKey="tank-10"
          onDirtyChange={onDirtyChange}
        />,
      );

      await selectRadixOption("Ingressi c/ galleggiante", "2");

      await waitFor(() => {
        expect(onDirtyChange).toHaveBeenCalledWith("tank-10", true);
      });
    });

    test("fires onSaved after successful edit", async () => {
      const onSaved = vi.fn();

      render(
        <WaterTankForm
          confId={1}
          confStatus="DRAFT"
          userRole="ENGINEER"
          waterTank={makeWaterTank()}
          waterTankIndex={1}
          onDelete={vi.fn()}
          onSaveSuccess={vi.fn()}
          formKey="tank-10"
          onDirtyChange={vi.fn()}
          onSaved={onSaved}
        />,
      );

      await selectRadixOption("Ingressi c/ galleggiante", "2");
      await userEvent.click(screen.getByRole("button", { name: /salva/i }));

      await waitFor(() => {
        expect(onSaved).toHaveBeenCalledWith("tank-10");
      });
    });

    test("notifies parent dirty state is false after successful save", async () => {
      const onDirtyChange = vi.fn();

      render(
        <WaterTankForm
          confId={1}
          confStatus="DRAFT"
          userRole="ENGINEER"
          waterTank={makeWaterTank()}
          waterTankIndex={1}
          onDelete={vi.fn()}
          onSaveSuccess={vi.fn()}
          formKey="tank-10"
          onDirtyChange={onDirtyChange}
          onSaved={vi.fn()}
        />,
      );

      await selectRadixOption("Ingressi c/ galleggiante", "2");

      await waitFor(() => {
        expect(onDirtyChange).toHaveBeenCalledWith("tank-10", true);
      });

      await userEvent.click(screen.getByRole("button", { name: /salva/i }));

      await waitFor(() => {
        expect(onDirtyChange).toHaveBeenCalledWith("tank-10", false);
      });
    });

    test("notifies parent dirty state is false when discarding via Annulla", async () => {
      const onDirtyChange = vi.fn();

      render(
        <WaterTankForm
          confId={1}
          confStatus="DRAFT"
          userRole="ENGINEER"
          waterTank={makeWaterTank()}
          waterTankIndex={1}
          onDelete={vi.fn()}
          onSaveSuccess={vi.fn()}
          formKey="tank-10"
          onDirtyChange={onDirtyChange}
        />,
      );

      await selectRadixOption("Ingressi c/ galleggiante", "2");

      await waitFor(() => {
        expect(onDirtyChange).toHaveBeenCalledWith("tank-10", true);
      });

      await userEvent.click(screen.getByRole("button", { name: /annulla/i }));

      await waitFor(() => {
        expect(onDirtyChange).toHaveBeenCalledWith("tank-10", false);
      });
    });

    test("does not call onSaved when server action fails", async () => {
      mockEditWaterTank.mockResolvedValueOnce({
        success: false,
        error: "Errore server",
      });
      const onSaved = vi.fn();

      render(
        <WaterTankForm
          confId={1}
          confStatus="DRAFT"
          userRole="ENGINEER"
          waterTank={makeWaterTank()}
          waterTankIndex={1}
          onDelete={vi.fn()}
          onSaveSuccess={vi.fn()}
          formKey="tank-10"
          onDirtyChange={vi.fn()}
          onSaved={onSaved}
        />,
      );

      await selectRadixOption("Ingressi c/ galleggiante", "2");
      await userEvent.click(screen.getByRole("button", { name: /salva/i }));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Errore server");
      });
      expect(onSaved).not.toHaveBeenCalled();
    });
  });
});

// --- Wash Bay Tests ---

describe("SubRecordForm — WashBayForm", () => {
  describe("Create flow", () => {
    test("renders add form title", () => {
      render(
        <WashBayForm
          confId={1}
          confStatus="DRAFT"
          userRole="ENGINEER"
          onSaveSuccess={vi.fn()}
        />,
      );

      expect(screen.getByText("Aggiungi nuova Pista")).toBeInTheDocument();
    });

    test("calls insertAction on submit", async () => {
      const onSaveSuccess = vi.fn();
      render(
        <WashBayForm
          confId={1}
          confStatus="DRAFT"
          userRole="ENGINEER"
          onSaveSuccess={onSaveSuccess}
        />,
      );

      // Submit with defaults (hp_lance_qty=0, det_lance_qty=0 are valid)
      await userEvent.click(screen.getByRole("button", { name: /aggiungi/i }));

      await waitFor(() => {
        expect(mockInsertWashBay).toHaveBeenCalledWith(
          1,
          expect.objectContaining({ hp_lance_qty: 0 }),
        );
      });

      expect(toast.success).toHaveBeenCalledWith("Pista creata.");
      expect(onSaveSuccess).toHaveBeenCalledWith("Pista");
    });
  });

  describe("Edit flow", () => {
    test("renders edit form title and calls editAction", async () => {
      render(
        <WashBayForm
          confId={1}
          confStatus="DRAFT"
          userRole="ENGINEER"
          washBay={makeWashBay()}
          washBayIndex={1}
          onDelete={vi.fn()}
          onSaveSuccess={vi.fn()}
        />,
      );

      expect(screen.getByText("Pista 1")).toBeInTheDocument();

      // Check the "Pista con portale" checkbox to make form dirty
      await userEvent.click(screen.getByText("Pista con portale"));

      await userEvent.click(screen.getByRole("button", { name: /salva/i }));

      await waitFor(() => {
        expect(mockEditWashBay).toHaveBeenCalledWith(
          1,
          20,
          expect.objectContaining({ has_gantry: true }),
        );
      });

      expect(toast.success).toHaveBeenCalledWith("Pista 1 aggiornata.");
    });
  });

  describe("Delete flow", () => {
    test("calls deleteAction after confirm", async () => {
      const onDelete = vi.fn();

      render(
        <WashBayForm
          confId={1}
          confStatus="DRAFT"
          userRole="ENGINEER"
          washBay={makeWashBay()}
          washBayIndex={1}
          onDelete={onDelete}
          onSaveSuccess={vi.fn()}
        />,
      );

      // Click delete button to open confirmation dialog
      await userEvent.click(
        screen.getByRole("button", { name: /elimina pista 1/i }),
      );

      // Confirm in the dialog
      expect(screen.getByText("Conferma eliminazione")).toBeInTheDocument();
      await userEvent.click(screen.getByRole("button", { name: "Elimina" }));

      await waitFor(() => {
        expect(mockDeleteWashBay).toHaveBeenCalledWith(1, 20);
      });

      expect(onDelete).toHaveBeenCalledWith(20);
      expect(toast.success).toHaveBeenCalledWith("Pista 1 eliminata.");
    });
  });

  describe("Conditional fields — energy chain", () => {
    test("shows energy chain fields when has_gantry and supplyType is ENERGY_CHAIN", async () => {
      render(
        <WashBayForm
          confId={1}
          confStatus="DRAFT"
          userRole="ENGINEER"
          supplyType="ENERGY_CHAIN"
          washBay={makeWashBay({ has_gantry: true })}
          washBayIndex={1}
          onDelete={vi.fn()}
          onSaveSuccess={vi.fn()}
        />,
      );

      expect(screen.getByText("Larghezza catena")).toBeInTheDocument();
      expect(
        screen.getByText("Con prolunga per mensola alim."),
      ).toBeInTheDocument();
    });

    test("hides energy chain fields when has_gantry is false", () => {
      render(
        <WashBayForm
          confId={1}
          confStatus="DRAFT"
          userRole="ENGINEER"
          supplyType="ENERGY_CHAIN"
          washBay={makeWashBay({ has_gantry: false })}
          washBayIndex={1}
          onDelete={vi.fn()}
          onSaveSuccess={vi.fn()}
        />,
      );

      expect(screen.queryByText("Larghezza catena")).not.toBeInTheDocument();
    });

    test("unchecking has_gantry resets energy_chain_width and has_shelf_extension", async () => {
      render(
        <WashBayForm
          confId={1}
          confStatus="DRAFT"
          userRole="ENGINEER"
          supplyType="ENERGY_CHAIN"
          washBay={makeWashBay({
            has_gantry: true,
            energy_chain_width: "L200",
            has_shelf_extension: true,
          })}
          washBayIndex={1}
          onDelete={vi.fn()}
          onSaveSuccess={vi.fn()}
        />,
      );

      // Verify fields are visible
      expect(screen.getByText("Larghezza catena")).toBeInTheDocument();

      // Uncheck has_gantry
      await userEvent.click(screen.getByText("Pista con portale"));

      // Energy chain fields should disappear
      expect(screen.queryByText("Larghezza catena")).not.toBeInTheDocument();
    });
  });
});
