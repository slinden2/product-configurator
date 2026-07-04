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

const LOCKOUT_TEXT = /In questo stato non potrai modificare la configurazione/;

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
    // Sales roles have no config transitions: approval happens on the offer
    // revision and the hand-off is set by the acceptance fan-out.
    test.each([
      "SALES",
      "SALES_MANAGER",
      "SALES_DIRECTOR",
    ] as const)("%s at DRAFT is read-only (badge, no controls)", (role) => {
      render(
        <StatusControl confId={1} initialStatus="DRAFT" userRole={role} />,
      );

      expect(screen.queryByRole("button")).not.toBeInTheDocument();
      expect(
        screen.queryByRole("combobox", { name: "Cambia stato" }),
      ).not.toBeInTheDocument();
    });

    test("SALES at IN_TECH_REVIEW is read-only (badge, no controls)", () => {
      render(
        <StatusControl
          confId={1}
          initialStatus="IN_TECH_REVIEW"
          userRole="SALES"
        />,
      );

      expect(screen.getByText("In revisione tecnica")).toBeInTheDocument();
      expect(screen.queryByRole("button")).not.toBeInTheDocument();
      expect(
        screen.queryByRole("combobox", { name: "Cambia stato" }),
      ).not.toBeInTheDocument();
    });

    test("SALES_DIRECTOR at SALES_APPROVED is read-only (no Riapri vendite trap)", () => {
      render(
        <StatusControl
          confId={1}
          initialStatus="SALES_APPROVED"
          userRole="SALES_DIRECTOR"
        />,
      );

      expect(screen.queryByRole("button")).not.toBeInTheDocument();
      expect(
        screen.queryByRole("combobox", { name: "Cambia stato" }),
      ).not.toBeInTheDocument();
    });

    test("ENGINEER at IN_TECH_REVIEW sees forward and backward buttons", () => {
      render(
        <StatusControl
          confId={1}
          initialStatus="IN_TECH_REVIEW"
          userRole="ENGINEER"
        />,
      );

      expect(
        screen.getByRole("button", { name: "Approva" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Rimanda a vendite" }),
      ).toBeInTheDocument();
    });

    test("ENGINEER at SALES_APPROVED sees only the Prendi in revisione tecnica button", () => {
      render(
        <StatusControl
          confId={1}
          initialStatus="SALES_APPROVED"
          userRole="ENGINEER"
        />,
      );

      expect(
        screen.getByRole("button", { name: "Prendi in revisione tecnica" }),
      ).toBeInTheDocument();
    });

    // Regression: the standalone DRAFT -> IN_TECH_REVIEW edge is non-adjacent
    // in STATUS_PIPELINE (SALES_APPROVED sits between), so an adjacency-based
    // split hid the button and leaked the dropdown to the engineer.
    test("ENGINEER at standalone DRAFT sees the Avvia revisione tecnica button and no dropdown", () => {
      render(
        <StatusControl
          confId={1}
          initialStatus="DRAFT"
          userRole="ENGINEER"
          origin="STANDALONE"
        />,
      );

      expect(
        screen.getByRole("button", { name: "Avvia revisione tecnica" }),
      ).toBeInTheDocument();
      expect(
        screen.queryByRole("combobox", { name: "Cambia stato" }),
      ).not.toBeInTheDocument();
    });

    test("ENGINEER at standalone IN_TECH_REVIEW sees forward and backward buttons and no dropdown", () => {
      render(
        <StatusControl
          confId={1}
          initialStatus="IN_TECH_REVIEW"
          userRole="ENGINEER"
          origin="STANDALONE"
        />,
      );

      expect(
        screen.getByRole("button", { name: "Approva" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Riporta in bozza" }),
      ).toBeInTheDocument();
      expect(
        screen.queryByRole("combobox", { name: "Cambia stato" }),
      ).not.toBeInTheDocument();
    });
  });

  describe("ADMIN manual dropdown", () => {
    test("ADMIN at OFFER DRAFT sees only the jump dropdown", () => {
      render(
        <StatusControl confId={1} initialStatus="DRAFT" userRole="ADMIN" />,
      );

      // No named edge leaves DRAFT on an OFFER config (SALES_APPROVED is only
      // reachable via the acceptance fan-out), so every ADMIN move is a manual
      // jump in the dropdown and no button renders.
      expect(screen.queryByRole("button")).not.toBeInTheDocument();
      expect(
        screen.getByRole("combobox", { name: "Cambia stato" }),
      ).toBeInTheDocument();
    });

    test("ADMIN at standalone DRAFT sees the named-edge button plus the jump dropdown", () => {
      render(
        <StatusControl
          confId={1}
          initialStatus="DRAFT"
          userRole="ADMIN"
          origin="STANDALONE"
        />,
      );

      expect(
        screen.getByRole("button", { name: "Avvia revisione tecnica" }),
      ).toBeInTheDocument();
      // Remaining jumps (TECH_APPROVED, CLOSED) live in the manual dropdown.
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
        <StatusControl
          confId={1}
          initialStatus="SALES_APPROVED"
          userRole="ENGINEER"
        />,
      );

      await clickButton("Prendi in revisione tecnica");

      expect(
        screen.getByRole("dialog", { name: "Conferma cambio di stato" }),
      ).toBeInTheDocument();
    });

    test("warns about losing edit access when the target is non-editable", async () => {
      render(
        <StatusControl
          confId={1}
          initialStatus="IN_TECH_REVIEW"
          userRole="ENGINEER"
        />,
      );

      await clickButton("Approva");

      expect(screen.getByText(LOCKOUT_TEXT)).toBeInTheDocument();
    });

    test("omits the lockout warning when the config stays editable", async () => {
      // An engineer keeps edit rights moving a standalone config from DRAFT
      // into IN_TECH_REVIEW, so no lockout warning.
      render(
        <StatusControl
          confId={1}
          initialStatus="DRAFT"
          userRole="ENGINEER"
          origin="STANDALONE"
        />,
      );

      await clickButton("Avvia revisione tecnica");

      expect(screen.queryByText(LOCKOUT_TEXT)).not.toBeInTheDocument();
    });

    test("does not call the action until confirmed", async () => {
      render(
        <StatusControl
          confId={1}
          initialStatus="SALES_APPROVED"
          userRole="ENGINEER"
        />,
      );

      await clickButton("Prendi in revisione tecnica");
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
        <StatusControl
          confId={42}
          initialStatus="SALES_APPROVED"
          userRole="ENGINEER"
        />,
      );

      await clickButton("Prendi in revisione tecnica");
      await confirm();

      await waitFor(() => {
        expect(mockUpdateConfigStatus).toHaveBeenCalledWith(42, {
          status: "IN_TECH_REVIEW",
        });
      });
    });

    test("shows the success toast", async () => {
      render(
        <StatusControl
          confId={1}
          initialStatus="SALES_APPROVED"
          userRole="ENGINEER"
        />,
      );

      await clickButton("Prendi in revisione tecnica");
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
        <StatusControl
          confId={1}
          initialStatus="SALES_APPROVED"
          userRole="ENGINEER"
        />,
      );

      await clickButton("Prendi in revisione tecnica");
      await confirm();

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Permesso negato");
      });
      // The badge reflects the prop, never an optimistic target, so it must
      // still show the original status after a failed transition.
      expect(screen.getByText("Approvato vendite")).toBeInTheDocument();
    });

    test("shows a generic error toast on exception", async () => {
      mockUpdateConfigStatus.mockRejectedValue(new Error("Network error"));

      render(
        <StatusControl
          confId={1}
          initialStatus="SALES_APPROVED"
          userRole="ADMIN"
        />,
      );

      await clickButton("Prendi in revisione tecnica");
      await confirm();

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(MSG.toast.statusUpdateFailed);
      });
      // Badge stays on the original status after the exception (no optimistic
      // update to roll back).
      expect(screen.getByText("Approvato vendite")).toBeInTheDocument();
    });
  });
});
