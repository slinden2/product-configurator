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

const mockAddOfferLineAction = vi.fn();
vi.mock("@/app/actions/offer-line-actions", () => ({
  addOfferLineAction: (...args: unknown[]) => mockAddOfferLineAction(...args),
}));

// --- Imports (after mocks) ---

import { toast } from "sonner";
import ConfigForm from "@/components/config-form";
import { makeValidConfig } from "@/test/form-test-utils";

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

    test("keeps the required customer field for standalone configurations", () => {
      render(<ConfigForm />);

      expect(screen.getByLabelText("Nome del cliente")).toBeInTheDocument();
    });

    test("shows the offer customer as static text without an input", () => {
      render(<ConfigForm offerId={12} offerCustomerName="Cliente offerta" />);

      expect(
        screen.queryByLabelText("Nome del cliente"),
      ).not.toBeInTheDocument();
      expect(screen.getByText("Nome del cliente")).toBeInTheDocument();
      expect(screen.getByText("Cliente offerta")).toBeInTheDocument();
    });

    test("shows the resolved customer as static text when editing an offer config", () => {
      render(
        <ConfigForm
          id={1}
          configuration={makeValidConfig({ name: "Cliente intestatario" })}
          status="IN_TECH_REVIEW"
          origin="OFFER"
          userRole="ENGINEER"
        />,
      );

      expect(
        screen.queryByLabelText("Nome del cliente"),
      ).not.toBeInTheDocument();
      expect(screen.getByText("Cliente intestatario")).toBeInTheDocument();
    });
  });

  describe("Disabled state", () => {
    test("disables the fieldset when status is SALES_APPROVED for SALES role", () => {
      const config = makeValidConfig();
      render(
        <ConfigForm
          id={1}
          configuration={config}
          status="SALES_APPROVED"
          userRole="SALES"
        />,
      );

      const fieldset = document.querySelector("fieldset");
      expect(fieldset).toBeDisabled();
    });

    test("enables the fieldset when status is IN_TECH_REVIEW for ENGINEER role", () => {
      const config = makeValidConfig();
      render(
        <ConfigForm
          id={1}
          configuration={config}
          status="IN_TECH_REVIEW"
          origin="OFFER"
          userRole="ENGINEER"
        />,
      );

      const fieldset = document.querySelector("fieldset");
      expect(fieldset).not.toBeDisabled();
    });

    test("disables the fieldset when status is TECH_APPROVED", () => {
      const config = makeValidConfig();
      render(
        <ConfigForm
          id={1}
          configuration={config}
          status="TECH_APPROVED"
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
          origin="OFFER"
          offerRevisionStatus="DRAFT"
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
          origin="STANDALONE"
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

      expect(toast.success).toHaveBeenCalledWith(
        "Configurazione salvata. Puoi inviarla dalla pagina di visualizzazione.",
      );
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
          origin="STANDALONE"
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

    test("shows the thrown Error message when editConfigurationAction rejects", async () => {
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      mockEditAction.mockRejectedValueOnce(new Error("Boom"));
      const config = makeValidConfig();

      render(
        <ConfigForm
          id={1}
          configuration={config}
          status="DRAFT"
          origin="STANDALONE"
          userRole="ENGINEER"
        />,
      );

      await userEvent.click(
        screen.getByRole("button", { name: /salva configurazione/i }),
      );

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Boom");
      });
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    test("shows a fallback toast when editConfigurationAction rejects with a non-Error", async () => {
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      mockEditAction.mockRejectedValueOnce("string failure");
      const config = makeValidConfig();

      render(
        <ConfigForm
          id={1}
          configuration={config}
          status="DRAFT"
          origin="STANDALONE"
          userRole="ENGINEER"
        />,
      );

      await userEvent.click(
        screen.getByRole("button", { name: /salva configurazione/i }),
      );

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          "Errore sconosciuto durante il salvataggio della configurazione.",
        );
      });
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    test("shows error toast when configuration data is missing user_id", async () => {
      const config = { ...makeValidConfig() };
      // The branch checks `"user_id" in configuration`, so the key must be
      // absent — an undefined override is not enough.
      delete (config as Record<string, unknown>).user_id;

      render(
        <ConfigForm
          id={1}
          configuration={config}
          status="DRAFT"
          origin="STANDALONE"
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
          origin="OFFER"
          offerRevisionStatus="DRAFT"
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
          origin="OFFER"
          offerRevisionStatus="DRAFT"
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
          origin="STANDALONE"
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
          origin="STANDALONE"
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
          origin="STANDALONE"
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
          origin="STANDALONE"
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
          origin="STANDALONE"
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
          origin="STANDALONE"
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
          origin="STANDALONE"
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
          origin="STANDALONE"
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
          origin="STANDALONE"
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
          origin="STANDALONE"
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

  describe("Submit failure reporting", () => {
    test("fires onSubmitFailed on validation failure", async () => {
      const onSubmitFailed = vi.fn();
      const config = makeValidConfig();

      render(
        <ConfigForm
          id={1}
          configuration={config}
          status="DRAFT"
          origin="STANDALONE"
          userRole="ENGINEER"
          formKey="config-1"
          onSubmitFailed={onSubmitFailed}
        />,
      );

      // name requires min. 3 characters — clearing it makes the form invalid
      await userEvent.clear(
        screen.getByPlaceholderText("Inserire il nome del cliente"),
      );
      await userEvent.click(
        screen.getByRole("button", { name: /salva configurazione/i }),
      );

      await waitFor(() => {
        expect(onSubmitFailed).toHaveBeenCalledWith("config-1");
      });
      expect(toast.error).toHaveBeenCalledWith(
        "Errori di validazione: correggere i campi evidenziati.",
      );
      expect(mockEditAction).not.toHaveBeenCalled();
    });

    test("fires onSubmitFailed when editConfigurationAction fails", async () => {
      mockEditAction.mockResolvedValueOnce({
        success: false,
        error: "Errore server",
      });
      const onSubmitFailed = vi.fn();
      const config = makeValidConfig();

      render(
        <ConfigForm
          id={1}
          configuration={config}
          status="DRAFT"
          origin="STANDALONE"
          userRole="ENGINEER"
          formKey="config-1"
          onSubmitFailed={onSubmitFailed}
        />,
      );

      await userEvent.click(
        screen.getByRole("button", { name: /salva configurazione/i }),
      );

      await waitFor(() => {
        expect(onSubmitFailed).toHaveBeenCalledWith("config-1");
      });
    });

    test("fires onSubmitFailed when the BOM warning is cancelled", async () => {
      const onSubmitFailed = vi.fn();
      const config = makeValidConfig();

      render(
        <ConfigForm
          id={1}
          configuration={config}
          status="DRAFT"
          origin="STANDALONE"
          userRole="ENGINEER"
          formKey="config-1"
          onSubmitFailed={onSubmitFailed}
          hasEngineeringBom
        />,
      );

      // Dirty a non-BOM-exempt field so the warning dialog is triggered
      await userEvent.click(screen.getByText("Itecoweb"));
      await userEvent.click(
        screen.getByRole("button", { name: /salva configurazione/i }),
      );

      const dialog = await screen.findByRole("dialog");
      expect(
        within(dialog).getByText("Distinta di commessa presente"),
      ).toBeInTheDocument();
      await userEvent.click(
        within(dialog).getByRole("button", { name: "Annulla" }),
      );

      expect(onSubmitFailed).toHaveBeenCalledWith("config-1");
      expect(mockEditAction).not.toHaveBeenCalled();
    });

    test("does not fire onSubmitFailed when the BOM warning is confirmed", async () => {
      const onSubmitFailed = vi.fn();
      const onSaved = vi.fn();
      const config = makeValidConfig();

      render(
        <ConfigForm
          id={1}
          configuration={config}
          status="DRAFT"
          origin="STANDALONE"
          userRole="ENGINEER"
          formKey="config-1"
          onSaved={onSaved}
          onSubmitFailed={onSubmitFailed}
          hasEngineeringBom
        />,
      );

      await userEvent.click(screen.getByText("Itecoweb"));
      await userEvent.click(
        screen.getByRole("button", { name: /salva configurazione/i }),
      );

      const dialog = await screen.findByRole("dialog");
      await userEvent.click(
        within(dialog).getByRole("button", {
          name: "Salva e elimina distinta",
        }),
      );

      await waitFor(() => {
        expect(onSaved).toHaveBeenCalledWith("config-1");
      });
      expect(onSubmitFailed).not.toHaveBeenCalled();
    });
  });
});
