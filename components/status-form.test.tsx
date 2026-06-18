// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

// --- Mocks (before imports) ---

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const mockUpdateConfigStatus = vi.fn();
vi.mock("@/app/actions/update-config-status-action", () => ({
  updateConfigStatusAction: (...args: unknown[]) =>
    mockUpdateConfigStatus(...args),
}));

// --- Imports (after mocks) ---

import { toast } from "sonner";
import StatusControl from "@/components/status-form";
import { MSG } from "@/lib/messages";

// --- Helpers ---

const LOCKOUT_TEXT = /Non potrai più modificare la configurazione/;

async function clickButton(name: string | RegExp) {
  await userEvent.click(screen.getByRole("button", { name }));
}

async function confirm() {
  await userEvent.click(screen.getByRole("button", { name: "Conferma" }));
}

async function selectJump(optionText: string) {
  await userEvent.click(screen.getByRole("combobox", { name: "Cambia stato" }));
  await userEvent.click(screen.getByRole("option", { name: optionText }));
}

// --- Setup ---

afterEach(cleanup);

beforeEach(() => {
  vi.clearAllMocks();
  mockUpdateConfigStatus.mockResolvedValue({ success: true, id: 1 });
});

// --- Tests ---

describe("StatusControl", () => {
  describe("Badge rendering", () => {
    test("renders the current status label", () => {
      render(
        <StatusControl confId={1} initialStatus="DRAFT" userRole="ENGINEER" />,
      );

      expect(screen.getByText("Stato")).toBeInTheDocument();
      expect(screen.getByText("Bozza")).toBeInTheDocument();
    });
  });

  describe("Role-based action buttons", () => {
    test("SALES at DRAFT sees only the Invia button", () => {
      render(
        <StatusControl confId={1} initialStatus="DRAFT" userRole="SALES" />,
      );

      expect(screen.getByRole("button", { name: "Invia" })).toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: "Approva" }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("combobox", { name: "Cambia stato" }),
      ).not.toBeInTheDocument();
    });

    test("SALES at SUBMITTED sees only the Riporta in bozza button", () => {
      render(
        <StatusControl confId={1} initialStatus="SUBMITTED" userRole="SALES" />,
      );

      expect(
        screen.getByRole("button", { name: "Riporta in bozza" }),
      ).toBeInTheDocument();
    });

    test("SALES at IN_REVIEW is read-only (badge, no controls)", () => {
      render(
        <StatusControl confId={1} initialStatus="IN_REVIEW" userRole="SALES" />,
      );

      expect(screen.getByText("In revisione")).toBeInTheDocument();
      expect(screen.queryByRole("button")).not.toBeInTheDocument();
      expect(
        screen.queryByRole("combobox", { name: "Cambia stato" }),
      ).not.toBeInTheDocument();
    });

    test("ENGINEER at IN_REVIEW sees forward and backward buttons", () => {
      render(
        <StatusControl
          confId={1}
          initialStatus="IN_REVIEW"
          userRole="ENGINEER"
        />,
      );

      expect(
        screen.getByRole("button", { name: "Approva" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Rimanda" }),
      ).toBeInTheDocument();
    });

    test("ENGINEER at APPROVED sees only the Riapri button", () => {
      render(
        <StatusControl
          confId={1}
          initialStatus="APPROVED"
          userRole="ENGINEER"
        />,
      );

      expect(
        screen.getByRole("button", { name: "Riapri" }),
      ).toBeInTheDocument();
    });
  });

  describe("ADMIN manual dropdown", () => {
    test("ADMIN at DRAFT sees the adjacent button plus a jump dropdown", () => {
      render(
        <StatusControl confId={1} initialStatus="DRAFT" userRole="ADMIN" />,
      );

      // Adjacent (±1) move is a button.
      expect(screen.getByRole("button", { name: "Invia" })).toBeInTheDocument();
      // Non-adjacent jumps live in the manual dropdown.
      expect(
        screen.getByRole("combobox", { name: "Cambia stato" }),
      ).toBeInTheDocument();
    });

    test("dropdown is not shown for SALES or ENGINEER", () => {
      render(
        <StatusControl confId={1} initialStatus="DRAFT" userRole="ENGINEER" />,
      );

      expect(
        screen.queryByRole("combobox", { name: "Cambia stato" }),
      ).not.toBeInTheDocument();
    });

    test("ADMIN can jump to a non-adjacent status via the dropdown", async () => {
      render(
        <StatusControl confId={7} initialStatus="DRAFT" userRole="ADMIN" />,
      );

      await selectJump("Chiuso");
      await confirm();

      await waitFor(() => {
        expect(mockUpdateConfigStatus).toHaveBeenCalledWith(7, {
          status: "CLOSED",
        });
      });
    });
  });

  describe("Confirmation dialog", () => {
    test("clicking an action opens the confirmation dialog", async () => {
      render(
        <StatusControl confId={1} initialStatus="DRAFT" userRole="SALES" />,
      );

      await clickButton("Invia");

      expect(
        screen.getByRole("alertdialog", { name: "Conferma cambio di stato" }),
      ).toBeInTheDocument();
    });

    test("warns about losing edit access when the target is non-editable", async () => {
      render(
        <StatusControl confId={1} initialStatus="DRAFT" userRole="SALES" />,
      );

      await clickButton("Invia");

      expect(screen.getByText(LOCKOUT_TEXT)).toBeInTheDocument();
    });

    test("omits the lockout warning when the config stays editable", async () => {
      render(
        <StatusControl confId={1} initialStatus="DRAFT" userRole="ENGINEER" />,
      );

      await clickButton("Invia");

      expect(screen.queryByText(LOCKOUT_TEXT)).not.toBeInTheDocument();
    });

    test("does not call the action until confirmed", async () => {
      render(
        <StatusControl confId={1} initialStatus="DRAFT" userRole="SALES" />,
      );

      await clickButton("Invia");
      expect(mockUpdateConfigStatus).not.toHaveBeenCalled();

      await confirm();
      await waitFor(() => {
        expect(mockUpdateConfigStatus).toHaveBeenCalled();
      });
    });
  });

  describe("Transition — success", () => {
    test("calls the action with the confId and target status", async () => {
      render(
        <StatusControl confId={42} initialStatus="DRAFT" userRole="ENGINEER" />,
      );

      await clickButton("Invia");
      await confirm();

      await waitFor(() => {
        expect(mockUpdateConfigStatus).toHaveBeenCalledWith(42, {
          status: "SUBMITTED",
        });
      });
    });

    test("shows the success toast", async () => {
      render(
        <StatusControl confId={1} initialStatus="DRAFT" userRole="ENGINEER" />,
      );

      await clickButton("Invia");
      await confirm();

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith(MSG.toast.statusUpdated);
      });
    });
  });

  describe("Transition — failure", () => {
    test("shows the error returned by the action", async () => {
      mockUpdateConfigStatus.mockResolvedValue({
        success: false,
        error: "Permesso negato",
      });

      render(
        <StatusControl confId={1} initialStatus="DRAFT" userRole="ENGINEER" />,
      );

      await clickButton("Invia");
      await confirm();

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Permesso negato");
      });
    });

    test("shows a generic error toast on exception", async () => {
      mockUpdateConfigStatus.mockRejectedValue(new Error("Network error"));

      render(
        <StatusControl confId={1} initialStatus="SUBMITTED" userRole="ADMIN" />,
      );

      await clickButton("Prendi in revisione");
      await confirm();

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(MSG.toast.statusUpdateFailed);
      });
    });
  });
});
