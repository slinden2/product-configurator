// @vitest-environment jsdom
import React from "react";
import { vi, describe, test, expect, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

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

import StatusForm from "@/components/status-form";
import { toast } from "sonner";
import { MSG } from "@/lib/messages";

// --- Helpers ---

async function selectStatus(optionText: string) {
  await userEvent.click(screen.getByRole("combobox"));
  const option = screen.getByRole("option", { name: optionText });
  await userEvent.click(option);
}

// --- Setup ---

afterEach(cleanup);

beforeEach(() => {
  vi.clearAllMocks();
  mockUpdateConfigStatus.mockResolvedValue({ success: true, id: 1 });
});

// --- Tests ---

describe("StatusForm", () => {
  describe("Rendering", () => {
    test("renders label and initial status", () => {
      render(
        <StatusForm confId={1} initialStatus="DRAFT" userRole="INTERNAL" />
      );

      expect(screen.getByText("Stato")).toBeInTheDocument();
      expect(screen.getByText("Bozza")).toBeInTheDocument();
    });
  });

  describe("Role-based status filtering", () => {
    test("EXTERNAL sees only DRAFT and SUBMITTED", async () => {
      render(
        <StatusForm confId={1} initialStatus="DRAFT" userRole="EXTERNAL" />
      );

      await userEvent.click(screen.getByRole("combobox"));

      expect(screen.getByRole("option", { name: "Bozza" })).toBeInTheDocument();
      expect(screen.getByRole("option", { name: "Inviato" })).toBeInTheDocument();
      expect(screen.queryByRole("option", { name: "In Revisione" })).not.toBeInTheDocument();
      expect(screen.queryByRole("option", { name: "Approvato" })).not.toBeInTheDocument();
      expect(screen.queryByRole("option", { name: "Chiuso" })).not.toBeInTheDocument();
    });

    test("INTERNAL sees DRAFT, SUBMITTED, IN_REVIEW, and APPROVED", async () => {
      render(
        <StatusForm confId={1} initialStatus="DRAFT" userRole="INTERNAL" />
      );

      await userEvent.click(screen.getByRole("combobox"));

      expect(screen.getByRole("option", { name: "Bozza" })).toBeInTheDocument();
      expect(screen.getByRole("option", { name: "Inviato" })).toBeInTheDocument();
      expect(screen.getByRole("option", { name: "In Revisione" })).toBeInTheDocument();
      expect(screen.getByRole("option", { name: "Approvato" })).toBeInTheDocument();
      expect(screen.queryByRole("option", { name: "Chiuso" })).not.toBeInTheDocument();
    });

    test("ADMIN sees all statuses", async () => {
      render(
        <StatusForm confId={1} initialStatus="DRAFT" userRole="ADMIN" />
      );

      await userEvent.click(screen.getByRole("combobox"));

      expect(screen.getByRole("option", { name: "Bozza" })).toBeInTheDocument();
      expect(screen.getByRole("option", { name: "Inviato" })).toBeInTheDocument();
      expect(screen.getByRole("option", { name: "In Revisione" })).toBeInTheDocument();
      expect(screen.getByRole("option", { name: "Approvato" })).toBeInTheDocument();
      expect(screen.getByRole("option", { name: "Chiuso" })).toBeInTheDocument();
    });
  });

  describe("Status change — success", () => {
    test("calls action with correct confId and new status", async () => {
      render(
        <StatusForm confId={42} initialStatus="DRAFT" userRole="INTERNAL" />
      );

      await selectStatus("Inviato");

      await waitFor(() => {
        expect(mockUpdateConfigStatus).toHaveBeenCalledWith(42, {
          status: "SUBMITTED",
        });
      });
    });

    test("shows success toast", async () => {
      render(
        <StatusForm confId={1} initialStatus="DRAFT" userRole="INTERNAL" />
      );

      await selectStatus("Inviato");

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith(MSG.toast.statusUpdated);
      });
    });
  });

  describe("Status change — server error", () => {
    test("shows error from action and reverts status", async () => {
      mockUpdateConfigStatus.mockResolvedValue({
        success: false,
        error: "Permesso negato",
      });

      render(
        <StatusForm confId={1} initialStatus="DRAFT" userRole="INTERNAL" />
      );

      await selectStatus("Inviato");

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Permesso negato");
      });

      // Status should revert to initial
      expect(screen.getByText("Bozza")).toBeInTheDocument();
    });
  });

  describe("Status change — exception", () => {
    test("shows generic error toast and reverts status", async () => {
      mockUpdateConfigStatus.mockRejectedValue(new Error("Network error"));

      render(
        <StatusForm confId={1} initialStatus="SUBMITTED" userRole="ADMIN" />
      );

      await selectStatus("In Revisione");

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(MSG.toast.statusUpdateFailed);
      });

      // Status should revert to initial
      expect(screen.getByText("Inviato")).toBeInTheDocument();
    });
  });
});
