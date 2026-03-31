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
    dowel_type: "ZINCATO",
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
    sales_notes: "",
    engineering_notes: "",
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
        screen.getByRole("button", { name: /salva configurazione/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /annulla/i }),
      ).toBeInTheDocument();
    });
  });

  describe("Disabled state", () => {
    test("disables the fieldset when status is SUBMITTED for SALES role", () => {
      const config = makeValidConfig();
      render(
        <ConfigForm
          id={1}
          configuration={config}
          status="SUBMITTED"
          userRole="SALES"
        />,
      );

      const fieldset = document.querySelector("fieldset");
      expect(fieldset).toBeDisabled();
    });

    test("enables the fieldset when status is SUBMITTED for ENGINEER role", () => {
      const config = makeValidConfig();
      render(
        <ConfigForm
          id={1}
          configuration={config}
          status="SUBMITTED"
          userRole="ENGINEER"
        />,
      );

      const fieldset = document.querySelector("fieldset");
      expect(fieldset).not.toBeDisabled();
    });

    test("disables the fieldset when status is APPROVED", () => {
      const config = makeValidConfig();
      render(
        <ConfigForm
          id={1}
          configuration={config}
          status="APPROVED"
          userRole="ADMIN"
        />,
      );

      const fieldset = document.querySelector("fieldset");
      expect(fieldset).toBeDisabled();
    });

    test("enables the fieldset when status is DRAFT", () => {
      const config = makeValidConfig();
      render(
        <ConfigForm
          id={1}
          configuration={config}
          status="DRAFT"
          userRole="SALES"
        />,
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
          userRole="ENGINEER"
          formKey="config-1"
        />,
      );

      const submitButton = screen.getByRole("button", {
        name: /salva configurazione/i,
      });
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(mockEditAction).toHaveBeenCalledWith(
          1,
          expect.objectContaining({ name: "Test Config" }),
        );
      });

      expect(toast.success).toHaveBeenCalledWith("Configurazione aggiornata.");
    });

    test("shows error toast when editConfigurationAction fails", async () => {
      mockEditAction.mockResolvedValueOnce({
        success: false,
        error: "Network error",
      });
      const config = makeValidConfig();

      render(
        <ConfigForm
          id={1}
          configuration={config}
          status="DRAFT"
          userRole="ENGINEER"
        />,
      );

      const submitButton = screen.getByRole("button", {
        name: /salva configurazione/i,
      });
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Network error");
      });
    });

    test("shows error toast when configuration data is missing user_id", async () => {
      const config = { ...makeValidConfig() };
      // Remove user_id to trigger the "Dati incompleti" branch
      delete (config as Record<string, unknown>).user_id;

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
        expect(toast.error).toHaveBeenCalledWith(
          "Dati incompleti per l'aggiornamento.",
        );
      });

      expect(mockEditAction).not.toHaveBeenCalled();
    });
  });

  describe("Insert submission", () => {
    test("does not submit new config when required fields are missing", async () => {
      render(<ConfigForm />);

      // Only fill name, leave other required fields at defaults (undefined)
      const nameInput = screen.getByPlaceholderText(
        "Inserire il nome del cliente",
      );
      await userEvent.type(nameInput, "Nuovo Cliente");

      await userEvent.click(
        screen.getByRole("button", { name: /salva configurazione/i }),
      );

      // Validation should prevent submission
      await waitFor(() => {
        expect(mockInsertAction).not.toHaveBeenCalled();
      });
    });
  });

  describe("Notes visibility per role", () => {
    test("SALES sees sales notes but not engineering notes", () => {
      const config = makeValidConfig();
      render(
        <ConfigForm
          id={1}
          configuration={config}
          status="DRAFT"
          userRole="SALES"
        />,
      );

      expect(
        screen.getByPlaceholderText("Inserire eventuali note commerciali"),
      ).toBeInTheDocument();
      expect(
        screen.queryByPlaceholderText("Inserire eventuali note tecniche"),
      ).not.toBeInTheDocument();
    });

    test("SALES can edit sales notes", () => {
      const config = makeValidConfig();
      render(
        <ConfigForm
          id={1}
          configuration={config}
          status="DRAFT"
          userRole="SALES"
        />,
      );

      const salesTextarea = screen.getByPlaceholderText(
        "Inserire eventuali note commerciali",
      );
      expect(salesTextarea).not.toBeDisabled();
    });

    test("ENGINEER sees both notes fields", () => {
      const config = makeValidConfig();
      render(
        <ConfigForm
          id={1}
          configuration={config}
          status="DRAFT"
          userRole="ENGINEER"
        />,
      );

      expect(
        screen.getByPlaceholderText("Inserire eventuali note commerciali"),
      ).toBeInTheDocument();
      expect(
        screen.getByPlaceholderText("Inserire eventuali note tecniche"),
      ).toBeInTheDocument();
    });

    test("ENGINEER cannot edit sales notes", () => {
      const config = makeValidConfig();
      render(
        <ConfigForm
          id={1}
          configuration={config}
          status="DRAFT"
          userRole="ENGINEER"
        />,
      );

      const salesTextarea = screen.getByPlaceholderText(
        "Inserire eventuali note commerciali",
      );
      expect(salesTextarea).toBeDisabled();
    });

    test("ENGINEER can edit engineering notes", () => {
      const config = makeValidConfig();
      render(
        <ConfigForm
          id={1}
          configuration={config}
          status="DRAFT"
          userRole="ENGINEER"
        />,
      );

      const engTextarea = screen.getByPlaceholderText(
        "Inserire eventuali note tecniche",
      );
      expect(engTextarea).not.toBeDisabled();
    });

    test("ADMIN sees both notes fields", () => {
      const config = makeValidConfig();
      render(
        <ConfigForm
          id={1}
          configuration={config}
          status="DRAFT"
          userRole="ADMIN"
        />,
      );

      expect(
        screen.getByPlaceholderText("Inserire eventuali note commerciali"),
      ).toBeInTheDocument();
      expect(
        screen.getByPlaceholderText("Inserire eventuali note tecniche"),
      ).toBeInTheDocument();
    });

    test("ADMIN can edit both sales and engineering notes", () => {
      const config = makeValidConfig();
      render(
        <ConfigForm
          id={1}
          configuration={config}
          status="DRAFT"
          userRole="ADMIN"
        />,
      );

      const salesTextarea = screen.getByPlaceholderText(
        "Inserire eventuali note commerciali",
      );
      const engTextarea = screen.getByPlaceholderText(
        "Inserire eventuali note tecniche",
      );
      expect(salesTextarea).not.toBeDisabled();
      expect(engTextarea).not.toBeDisabled();
    });
  });

  describe("Dirty state tracking", () => {
    test("fires onDirtyChange when name is modified", async () => {
      const onDirtyChange = vi.fn();
      const config = makeValidConfig();

      render(
        <ConfigForm
          id={1}
          configuration={config}
          status="DRAFT"
          userRole="ENGINEER"
          formKey="config-1"
          onDirtyChange={onDirtyChange}
        />,
      );

      const nameInput = screen.getByPlaceholderText(
        "Inserire il nome del cliente",
      );
      await userEvent.type(nameInput, " modificato");

      await waitFor(() => {
        expect(onDirtyChange).toHaveBeenCalledWith("config-1", true);
      });
    });

    test("fires onSaved after successful edit", async () => {
      const onSaved = vi.fn();
      const config = makeValidConfig();

      render(
        <ConfigForm
          id={1}
          configuration={config}
          status="DRAFT"
          userRole="ENGINEER"
          formKey="config-1"
          onDirtyChange={vi.fn()}
          onSaved={onSaved}
        />,
      );

      await userEvent.click(
        screen.getByRole("button", { name: /salva configurazione/i }),
      );

      await waitFor(() => {
        expect(onSaved).toHaveBeenCalledWith("config-1");
      });
    });

    test("notifies parent dirty state is false after successful save", async () => {
      const onDirtyChange = vi.fn();
      const config = makeValidConfig();

      render(
        <ConfigForm
          id={1}
          configuration={config}
          status="DRAFT"
          userRole="ENGINEER"
          formKey="config-1"
          onDirtyChange={onDirtyChange}
          onSaved={vi.fn()}
        />,
      );

      const nameInput = screen.getByPlaceholderText(
        "Inserire il nome del cliente",
      );
      await userEvent.type(nameInput, " modificato");

      await waitFor(() => {
        expect(onDirtyChange).toHaveBeenCalledWith("config-1", true);
      });

      await userEvent.click(
        screen.getByRole("button", { name: /salva configurazione/i }),
      );

      await waitFor(() => {
        expect(onDirtyChange).toHaveBeenCalledWith("config-1", false);
      });
    });

    test("notifies parent dirty state is false when discarding via Annulla", async () => {
      const onDirtyChange = vi.fn();
      const config = makeValidConfig();

      render(
        <ConfigForm
          id={1}
          configuration={config}
          status="DRAFT"
          userRole="ENGINEER"
          formKey="config-1"
          onDirtyChange={onDirtyChange}
        />,
      );

      const nameInput = screen.getByPlaceholderText(
        "Inserire il nome del cliente",
      );
      await userEvent.type(nameInput, " modificato");

      await waitFor(() => {
        expect(onDirtyChange).toHaveBeenCalledWith("config-1", true);
      });

      await userEvent.click(screen.getByRole("button", { name: /annulla/i }));

      await waitFor(() => {
        expect(onDirtyChange).toHaveBeenCalledWith("config-1", false);
      });
    });

    test("does not call onSaved when server action fails", async () => {
      mockEditAction.mockResolvedValueOnce({
        success: false,
        error: "Errore server",
      });
      const onSaved = vi.fn();
      const onDirtyChange = vi.fn();
      const config = makeValidConfig();

      render(
        <ConfigForm
          id={1}
          configuration={config}
          status="DRAFT"
          userRole="ENGINEER"
          formKey="config-1"
          onDirtyChange={onDirtyChange}
          onSaved={onSaved}
        />,
      );

      const nameInput = screen.getByPlaceholderText(
        "Inserire il nome del cliente",
      );
      await userEvent.type(nameInput, " modificato");

      await userEvent.click(
        screen.getByRole("button", { name: /salva configurazione/i }),
      );

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Errore server");
      });
      expect(onSaved).not.toHaveBeenCalled();
    });
  });
});
