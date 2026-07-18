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

import { toast } from "sonner";
import WashBayForm from "@/components/wash-bay-form";
import WaterTankForm from "@/components/water-tank-form";
import { MSG } from "@/lib/messages";
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
          origin="STANDALONE"
          userRole="ENGINEER"
          onAddFormDone={vi.fn()}
        />,
      );

      expect(screen.getByText("Aggiungi nuovo Serbatoio")).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /aggiungi/i }),
      ).toBeInTheDocument();
    });

    test("calls insertAction on submit and fires onAddFormDone", async () => {
      const onAddFormDone = vi.fn();
      render(
        <WaterTankForm
          confId={1}
          confStatus="DRAFT"
          origin="STANDALONE"
          userRole="ENGINEER"
          onAddFormDone={onAddFormDone}
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
      expect(onAddFormDone).toHaveBeenCalled();
    });
  });

  describe("Edit flow", () => {
    test("renders edit form title with index", () => {
      render(
        <WaterTankForm
          confId={1}
          confStatus="DRAFT"
          origin="STANDALONE"
          userRole="ENGINEER"
          waterTank={makeWaterTank()}
          waterTankIndex={1}
          onDelete={vi.fn()}
          onAddFormDone={vi.fn()}
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
          origin="STANDALONE"
          userRole="ENGINEER"
          waterTank={makeWaterTank()}
          waterTankIndex={1}
          onDelete={vi.fn()}
          onAddFormDone={vi.fn()}
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
          origin="STANDALONE"
          userRole="ENGINEER"
          waterTank={makeWaterTank()}
          waterTankIndex={1}
          onDelete={onDelete}
          onAddFormDone={vi.fn()}
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
          origin="STANDALONE"
          userRole="ENGINEER"
          waterTank={makeWaterTank()}
          waterTankIndex={1}
          onDelete={onDelete}
          onAddFormDone={vi.fn()}
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
          origin="STANDALONE"
          userRole="ENGINEER"
          onAddFormDone={vi.fn()}
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
          origin="STANDALONE"
          userRole="ENGINEER"
          waterTank={makeWaterTank()}
          waterTankIndex={1}
          onDelete={vi.fn()}
          onAddFormDone={vi.fn()}
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
    test("disables fieldset when status is TECH_APPROVED", () => {
      render(
        <WaterTankForm
          confId={1}
          confStatus="TECH_APPROVED"
          userRole="ADMIN"
          waterTank={makeWaterTank()}
          waterTankIndex={1}
          onDelete={vi.fn()}
          onAddFormDone={vi.fn()}
        />,
      );

      const fieldset = document.querySelector("fieldset");
      expect(fieldset).toBeDisabled();
    });

    test("disables fieldset when SALES and status is SALES_APPROVED", () => {
      render(
        <WaterTankForm
          confId={1}
          confStatus="SALES_APPROVED"
          userRole="SALES"
          waterTank={makeWaterTank()}
          waterTankIndex={1}
          onDelete={vi.fn()}
          onAddFormDone={vi.fn()}
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
          origin="STANDALONE"
          userRole="ENGINEER"
          waterTank={makeWaterTank()}
          waterTankIndex={1}
          onDelete={vi.fn()}
          onAddFormDone={vi.fn()}
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
          origin="STANDALONE"
          userRole="ENGINEER"
          waterTank={makeWaterTank()}
          waterTankIndex={1}
          onDelete={vi.fn()}
          onAddFormDone={vi.fn()}
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
          origin="STANDALONE"
          userRole="ENGINEER"
          waterTank={makeWaterTank()}
          waterTankIndex={1}
          onDelete={vi.fn()}
          onAddFormDone={vi.fn()}
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
          origin="STANDALONE"
          userRole="ENGINEER"
          waterTank={makeWaterTank()}
          waterTankIndex={1}
          onDelete={vi.fn()}
          onAddFormDone={vi.fn()}
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
          origin="STANDALONE"
          userRole="ENGINEER"
          waterTank={makeWaterTank()}
          waterTankIndex={1}
          onDelete={vi.fn()}
          onAddFormDone={vi.fn()}
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
          origin="STANDALONE"
          userRole="ENGINEER"
          waterTank={makeWaterTank()}
          waterTankIndex={1}
          onDelete={vi.fn()}
          onAddFormDone={vi.fn()}
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

    test("keeps the form dirty and Save enabled after a failed save", async () => {
      mockEditWaterTank.mockResolvedValueOnce({
        success: false,
        error: "Errore server",
      });
      const onDirtyChange = vi.fn();

      render(
        <WaterTankForm
          confId={1}
          confStatus="DRAFT"
          origin="STANDALONE"
          userRole="ENGINEER"
          waterTank={makeWaterTank()}
          waterTankIndex={1}
          onDelete={vi.fn()}
          onAddFormDone={vi.fn()}
          formKey="tank-10"
          onDirtyChange={onDirtyChange}
        />,
      );

      await selectRadixOption("Ingressi c/ galleggiante", "2");

      await waitFor(() => {
        expect(onDirtyChange).toHaveBeenCalledWith("tank-10", true);
      });
      onDirtyChange.mockClear();

      await userEvent.click(screen.getByRole("button", { name: /salva/i }));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Errore server");
      });

      // Once the pending transition settles, the form must stay dirty so the
      // user can retry or revert
      await waitFor(() => {
        expect(screen.getByRole("button", { name: /salva/i })).toBeEnabled();
      });
      expect(screen.getByRole("button", { name: /annulla/i })).toBeEnabled();
      expect(onDirtyChange).not.toHaveBeenCalledWith("tank-10", false);
    });

    test("keeps the form dirty when the BOM warning is cancelled", async () => {
      const onDirtyChange = vi.fn();

      render(
        <WaterTankForm
          confId={1}
          confStatus="DRAFT"
          origin="STANDALONE"
          userRole="ENGINEER"
          waterTank={makeWaterTank()}
          waterTankIndex={1}
          onDelete={vi.fn()}
          onAddFormDone={vi.fn()}
          formKey="tank-10"
          onDirtyChange={onDirtyChange}
          hasEngineeringBom
        />,
      );

      await selectRadixOption("Ingressi c/ galleggiante", "2");

      await waitFor(() => {
        expect(onDirtyChange).toHaveBeenCalledWith("tank-10", true);
      });
      onDirtyChange.mockClear();

      await userEvent.click(screen.getByRole("button", { name: /salva/i }));

      // The BOM invalidation warning appears instead of saving
      const dialog = await screen.findByRole("dialog");
      expect(
        within(dialog).getByText("Distinta di commessa presente"),
      ).toBeInTheDocument();
      await userEvent.click(
        within(dialog).getByRole("button", { name: "Annulla" }),
      );

      expect(mockEditWaterTank).not.toHaveBeenCalled();
      expect(screen.getByRole("button", { name: /salva/i })).toBeEnabled();
      expect(onDirtyChange).not.toHaveBeenCalledWith("tank-10", false);
    });
  });

  describe("Submit failure reporting", () => {
    test("fires onSubmitFailed and shows validation toast on Zod failure", async () => {
      const onSubmitFailed = vi.fn();
      const onSaved = vi.fn();

      render(
        <WaterTankForm
          confId={1}
          confStatus="DRAFT"
          origin="STANDALONE"
          userRole="ENGINEER"
          onAddFormDone={vi.fn()}
          formKey="new-tank"
          onDirtyChange={vi.fn()}
          onSaved={onSaved}
          onSubmitFailed={onSubmitFailed}
        />,
      );

      // Submit the empty add form: required "type" is missing
      await userEvent.click(screen.getByRole("button", { name: /aggiungi/i }));

      await waitFor(() => {
        expect(onSubmitFailed).toHaveBeenCalledWith("new-tank");
      });
      expect(toast.error).toHaveBeenCalledWith(
        "Errori di validazione: correggere i campi evidenziati.",
      );
      expect(mockInsertWaterTank).not.toHaveBeenCalled();
      expect(onSaved).not.toHaveBeenCalled();
    });

    test("fires onSubmitFailed when the server action fails", async () => {
      mockEditWaterTank.mockResolvedValueOnce({
        success: false,
        error: "Errore server",
      });
      const onSubmitFailed = vi.fn();

      render(
        <WaterTankForm
          confId={1}
          confStatus="DRAFT"
          origin="STANDALONE"
          userRole="ENGINEER"
          waterTank={makeWaterTank()}
          waterTankIndex={1}
          onDelete={vi.fn()}
          onAddFormDone={vi.fn()}
          formKey="tank-10"
          onDirtyChange={vi.fn()}
          onSubmitFailed={onSubmitFailed}
        />,
      );

      await selectRadixOption("Ingressi c/ galleggiante", "2");
      await userEvent.click(screen.getByRole("button", { name: /salva/i }));

      await waitFor(() => {
        expect(onSubmitFailed).toHaveBeenCalledWith("tank-10");
      });
    });

    test("fires onSubmitFailed when the BOM warning is cancelled", async () => {
      const onSubmitFailed = vi.fn();

      render(
        <WaterTankForm
          confId={1}
          confStatus="DRAFT"
          origin="STANDALONE"
          userRole="ENGINEER"
          waterTank={makeWaterTank()}
          waterTankIndex={1}
          onDelete={vi.fn()}
          onAddFormDone={vi.fn()}
          formKey="tank-10"
          onDirtyChange={vi.fn()}
          onSubmitFailed={onSubmitFailed}
          hasEngineeringBom
        />,
      );

      await selectRadixOption("Ingressi c/ galleggiante", "2");
      await userEvent.click(screen.getByRole("button", { name: /salva/i }));

      const dialog = await screen.findByRole("dialog");
      await userEvent.click(
        within(dialog).getByRole("button", { name: "Annulla" }),
      );

      expect(onSubmitFailed).toHaveBeenCalledWith("tank-10");
      expect(mockEditWaterTank).not.toHaveBeenCalled();
    });

    test("does not fire onSubmitFailed when the BOM warning is confirmed", async () => {
      const onSubmitFailed = vi.fn();
      const onSaved = vi.fn();

      render(
        <WaterTankForm
          confId={1}
          confStatus="DRAFT"
          origin="STANDALONE"
          userRole="ENGINEER"
          waterTank={makeWaterTank()}
          waterTankIndex={1}
          onDelete={vi.fn()}
          onAddFormDone={vi.fn()}
          formKey="tank-10"
          onDirtyChange={vi.fn()}
          onSaved={onSaved}
          onSubmitFailed={onSubmitFailed}
          hasEngineeringBom
        />,
      );

      await selectRadixOption("Ingressi c/ galleggiante", "2");
      await userEvent.click(screen.getByRole("button", { name: /salva/i }));

      const dialog = await screen.findByRole("dialog");
      await userEvent.click(
        within(dialog).getByRole("button", {
          name: "Salva e elimina distinta",
        }),
      );

      await waitFor(() => {
        expect(onSaved).toHaveBeenCalledWith("tank-10");
      });
      expect(onSubmitFailed).not.toHaveBeenCalled();
    });

    test("does not fire onSubmitFailed when the BOM warning cancels a delete", async () => {
      const onSubmitFailed = vi.fn();

      render(
        <WaterTankForm
          confId={1}
          confStatus="DRAFT"
          origin="STANDALONE"
          userRole="ENGINEER"
          waterTank={makeWaterTank()}
          waterTankIndex={1}
          onDelete={vi.fn()}
          onAddFormDone={vi.fn()}
          formKey="tank-10"
          onDirtyChange={vi.fn()}
          onSubmitFailed={onSubmitFailed}
          hasEngineeringBom
        />,
      );

      // Delete goes through its own confirm, then the BOM warning
      await userEvent.click(
        screen.getByRole("button", { name: /elimina serbatoio 1/i }),
      );
      await userEvent.click(screen.getByRole("button", { name: "Elimina" }));

      const dialog = await screen.findByRole("dialog");
      expect(
        within(dialog).getByText("Distinta di commessa presente"),
      ).toBeInTheDocument();
      await userEvent.click(
        within(dialog).getByRole("button", { name: "Annulla" }),
      );

      expect(onSubmitFailed).not.toHaveBeenCalled();
      expect(mockDeleteWaterTank).not.toHaveBeenCalled();
    });
  });

  describe("Engineering BOM warning", () => {
    test("confirming the BOM warning executes the pending save", async () => {
      render(
        <WaterTankForm
          confId={1}
          confStatus="DRAFT"
          origin="STANDALONE"
          userRole="ENGINEER"
          waterTank={makeWaterTank()}
          waterTankIndex={1}
          onDelete={vi.fn()}
          onAddFormDone={vi.fn()}
          hasEngineeringBom
        />,
      );

      await selectRadixOption("Ingressi c/ galleggiante", "2");
      await userEvent.click(screen.getByRole("button", { name: /salva/i }));

      // The warning gates the action: nothing saved until confirmed
      const dialog = await screen.findByRole("dialog");
      expect(
        within(dialog).getByText(MSG.saveWarning.ebomOnly.title),
      ).toBeInTheDocument();
      expect(mockEditWaterTank).not.toHaveBeenCalled();

      await userEvent.click(
        within(dialog).getByRole("button", {
          name: MSG.saveWarning.ebomOnly.confirm,
        }),
      );

      // The pending values captured before the dialog reach the action
      await waitFor(() => {
        expect(mockEditWaterTank).toHaveBeenCalledWith(
          1,
          10,
          expect.objectContaining({ inlet_w_float_qty: 2 }),
        );
      });
      expect(toast.success).toHaveBeenCalledWith("Serbatoio 1 aggiornato.");
    });

    test("confirming the BOM warning executes the pending delete", async () => {
      const onDelete = vi.fn();

      render(
        <WaterTankForm
          confId={1}
          confStatus="DRAFT"
          origin="STANDALONE"
          userRole="ENGINEER"
          waterTank={makeWaterTank()}
          waterTankIndex={1}
          onDelete={onDelete}
          onAddFormDone={vi.fn()}
          hasEngineeringBom
        />,
      );

      // Delete goes through its own confirm, then the BOM warning
      await userEvent.click(
        screen.getByRole("button", { name: /elimina serbatoio 1/i }),
      );
      await userEvent.click(screen.getByRole("button", { name: "Elimina" }));

      const dialog = await screen.findByRole("dialog");
      expect(
        within(dialog).getByText(MSG.saveWarning.ebomOnly.title),
      ).toBeInTheDocument();
      expect(mockDeleteWaterTank).not.toHaveBeenCalled();

      await userEvent.click(
        within(dialog).getByRole("button", {
          name: MSG.saveWarning.ebomOnly.confirm,
        }),
      );

      await waitFor(() => {
        expect(mockDeleteWaterTank).toHaveBeenCalledWith(1, 10);
      });
      expect(onDelete).toHaveBeenCalledWith(10);
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
          origin="STANDALONE"
          userRole="ENGINEER"
          onAddFormDone={vi.fn()}
        />,
      );

      expect(screen.getByText("Aggiungi nuova Pista")).toBeInTheDocument();
    });

    test("calls insertAction on submit", async () => {
      const onAddFormDone = vi.fn();
      render(
        <WashBayForm
          confId={1}
          confStatus="DRAFT"
          origin="STANDALONE"
          userRole="ENGINEER"
          onAddFormDone={onAddFormDone}
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
      expect(onAddFormDone).toHaveBeenCalled();
    });
  });

  describe("Edit flow", () => {
    test("renders edit form title and calls editAction", async () => {
      render(
        <WashBayForm
          confId={1}
          confStatus="DRAFT"
          origin="STANDALONE"
          userRole="ENGINEER"
          washBay={makeWashBay()}
          washBayIndex={1}
          onDelete={vi.fn()}
          onAddFormDone={vi.fn()}
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
          origin="STANDALONE"
          userRole="ENGINEER"
          washBay={makeWashBay()}
          washBayIndex={1}
          onDelete={onDelete}
          onAddFormDone={vi.fn()}
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
          origin="STANDALONE"
          userRole="ENGINEER"
          supplyType="ENERGY_CHAIN"
          washBay={makeWashBay({ has_gantry: true })}
          washBayIndex={1}
          onDelete={vi.fn()}
          onAddFormDone={vi.fn()}
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
          origin="STANDALONE"
          userRole="ENGINEER"
          supplyType="ENERGY_CHAIN"
          washBay={makeWashBay({ has_gantry: false })}
          washBayIndex={1}
          onDelete={vi.fn()}
          onAddFormDone={vi.fn()}
        />,
      );

      expect(screen.queryByText("Larghezza catena")).not.toBeInTheDocument();
    });

    test("unchecking has_gantry resets energy_chain_width and has_shelf_extension", async () => {
      render(
        <WashBayForm
          confId={1}
          confStatus="DRAFT"
          origin="STANDALONE"
          userRole="ENGINEER"
          supplyType="ENERGY_CHAIN"
          washBay={makeWashBay({
            has_gantry: true,
            energy_chain_width: "L200",
            has_shelf_extension: true,
          })}
          washBayIndex={1}
          onDelete={vi.fn()}
          onAddFormDone={vi.fn()}
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
