// @vitest-environment jsdom
import type React from "react";
import { vi, describe, test, expect, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// --- Mock functions (before vi.mock) ---

const mockDeleteConfiguration = vi.fn();

vi.mock("@/app/actions/delete-configuration-action", () => ({
  deleteConfigurationAction: (...args: unknown[]) =>
    mockDeleteConfiguration(...args),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("@/components/confirm-modal", () => ({
  ConfirmModal: ({
    isOpen,
    onConfirm,
    onOpenChange,
    confirmText,
    cancelText,
  }: {
    isOpen: boolean;
    onConfirm: () => void;
    onOpenChange: (open: boolean) => void;
    confirmText?: string;
    cancelText?: string;
  }) =>
    isOpen ? (
      <tr data-testid="confirm-modal">
        <td>
          <button type="button" onClick={onConfirm}>
            {confirmText ?? "Conferma"}
          </button>
          <button type="button" onClick={() => onOpenChange(false)}>
            {cancelText ?? "Annulla"}
          </button>
        </td>
      </tr>
    ) : null,
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

// --- Imports (after mocks) ---

import ConfigurationRow from "@/components/all-configuration-table/configuration-row";
import { toast } from "sonner";
import { MSG } from "@/lib/messages";
import { formatDateDDMMYYYYHHMM } from "@/lib/utils";
import type { ConfigurationStatusType } from "@/types";
import type { Role } from "@/types";

// --- Helpers ---

function makeConfiguration(
  overrides?: Partial<{
    id: number;
    status: ConfigurationStatusType;
    name: string;
    description: string;
    created_at: Date;
    updated_at: Date;
    user: { id: string; email: string; initials: string | null };
  }>,
) {
  return {
    id: 1,
    status: "DRAFT" as ConfigurationStatusType,
    name: "Config Test",
    description: "Descrizione test",
    created_at: new Date("2025-06-15T10:30:00"),
    updated_at: new Date("2025-06-16T14:00:00"),
    user: { id: "user-1", email: "test@example.com", initials: "TE" },
    ...overrides,
  };
}

function makeUser(
  overrides?: Partial<{ id: string; role: Role; initials: string }>,
) {
  return {
    id: "user-1",
    role: "ENGINEER" as Role,
    initials: "TE",
    ...overrides,
  };
}

function renderRow(
  configOverrides?: Parameters<typeof makeConfiguration>[0],
  userOverrides?: Parameters<typeof makeUser>[0],
) {
  const configuration = makeConfiguration(configOverrides);
  const user = makeUser(userOverrides);
  return render(
    <table>
      <tbody>
        <ConfigurationRow configuration={configuration} user={user} />
      </tbody>
    </table>,
  );
}

// --- Setup ---

afterEach(cleanup);

beforeEach(() => {
  vi.clearAllMocks();
  mockDeleteConfiguration.mockResolvedValue({ success: true });
});

// --- Tests ---

describe("ConfigurationRow", () => {
  describe("Rendering", () => {
    test("displays configuration id, name, and description", () => {
      renderRow();

      expect(screen.getByText("1")).toBeInTheDocument();
      expect(screen.getByText("Config Test")).toBeInTheDocument();
      expect(screen.getByText("Descrizione test")).toBeInTheDocument();
    });

    test("displays user initials with email as title", () => {
      renderRow();

      const initialsCell = screen.getByText("TE");
      expect(initialsCell).toBeInTheDocument();
      expect(initialsCell).toHaveAttribute("title", "test@example.com");
    });

    test("displays formatted dates", () => {
      const createdAt = new Date("2025-06-15T10:30:00");
      const updatedAt = new Date("2025-06-16T14:00:00");

      renderRow({ created_at: createdAt, updated_at: updatedAt });

      expect(
        screen.getByText(formatDateDDMMYYYYHHMM(createdAt)),
      ).toBeInTheDocument();
      expect(
        screen.getByText(formatDateDDMMYYYYHHMM(updatedAt)),
      ).toBeInTheDocument();
    });

    test("renders status badge with correct status text", () => {
      renderRow({ status: "SUBMITTED" });

      expect(screen.getByText("Inviato")).toBeInTheDocument();
    });
  });

  describe("canEdit — Edit button (navigation access)", () => {
    test("ENGINEER user can open any configuration", () => {
      renderRow(
        { user: { id: "other-user", email: "other@test.com", initials: "OT" } },
        { id: "user-1", role: "ENGINEER" },
      );

      expect(
        screen.getByLabelText("Modifica configurazione"),
      ).not.toBeDisabled();
    });

    test("ADMIN user can open any configuration", () => {
      renderRow(
        { user: { id: "other-user", email: "other@test.com", initials: "OT" } },
        { id: "user-1", role: "ADMIN" },
      );

      expect(
        screen.getByLabelText("Modifica configurazione"),
      ).not.toBeDisabled();
    });

    test("SALES owner can open own configuration", () => {
      renderRow(
        { user: { id: "user-1", email: "ext@test.com", initials: "EX" } },
        { id: "user-1", role: "SALES" },
      );

      expect(
        screen.getByLabelText("Modifica configurazione"),
      ).not.toBeDisabled();
    });

    test("SALES non-owner cannot open configuration", () => {
      renderRow(
        { user: { id: "other-user", email: "other@test.com", initials: "OT" } },
        { id: "user-1", role: "SALES" },
      );

      expect(screen.getByLabelText("Modifica configurazione")).toBeDisabled();
    });
  });

  describe("canDelete — Delete button (requires editable status)", () => {
    test("ENGINEER user can delete DRAFT configuration", () => {
      renderRow(
        {
          status: "DRAFT",
          user: { id: "other-user", email: "other@test.com", initials: "OT" },
        },
        { id: "user-1", role: "ENGINEER" },
      );

      expect(
        screen.getByLabelText("Elimina configurazione"),
      ).not.toBeDisabled();
    });

    test("ENGINEER user can delete SUBMITTED configuration", () => {
      renderRow(
        {
          status: "SUBMITTED",
          user: { id: "other-user", email: "other@test.com", initials: "OT" },
        },
        { id: "user-1", role: "ENGINEER" },
      );

      expect(
        screen.getByLabelText("Elimina configurazione"),
      ).not.toBeDisabled();
    });

    test("ENGINEER user cannot delete APPROVED configuration", () => {
      renderRow(
        {
          status: "APPROVED",
          user: { id: "other-user", email: "other@test.com", initials: "OT" },
        },
        { id: "user-1", role: "ENGINEER" },
      );

      expect(screen.getByLabelText("Elimina configurazione")).toBeDisabled();
    });

    test("ADMIN user cannot delete CLOSED configuration", () => {
      renderRow(
        {
          status: "CLOSED",
          user: { id: "other-user", email: "other@test.com", initials: "OT" },
        },
        { id: "user-1", role: "ADMIN" },
      );

      expect(screen.getByLabelText("Elimina configurazione")).toBeDisabled();
    });

    test("SALES owner can delete own DRAFT configuration", () => {
      renderRow(
        {
          status: "DRAFT",
          user: { id: "user-1", email: "ext@test.com", initials: "EX" },
        },
        { id: "user-1", role: "SALES" },
      );

      expect(
        screen.getByLabelText("Elimina configurazione"),
      ).not.toBeDisabled();
    });

    test("SALES owner cannot delete own SUBMITTED configuration", () => {
      renderRow(
        {
          status: "SUBMITTED",
          user: { id: "user-1", email: "ext@test.com", initials: "EX" },
        },
        { id: "user-1", role: "SALES" },
      );

      expect(screen.getByLabelText("Elimina configurazione")).toBeDisabled();
    });

    test("SALES non-owner cannot delete", () => {
      renderRow(
        { user: { id: "other-user", email: "other@test.com", initials: "OT" } },
        { id: "user-1", role: "SALES" },
      );

      expect(screen.getByLabelText("Elimina configurazione")).toBeDisabled();
    });
  });

  describe("Action links", () => {
    test("Edit button links to /configurazioni/modifica/{id}", () => {
      renderRow({ id: 42 });

      const editLink = screen.getByLabelText("Modifica configurazione");
      expect(editLink.closest("a")).toHaveAttribute(
        "href",
        "/configurazioni/modifica/42",
      );
    });

    test("BOM button links to /configurazioni/bom/{id} and is always enabled", () => {
      renderRow(
        {
          id: 42,
          user: { id: "other-user", email: "o@t.com", initials: "OT" },
        },
        { role: "SALES" },
      );

      const bomLink = screen.getByLabelText("Visualizza distinta");
      expect(bomLink.closest("a")).toHaveAttribute(
        "href",
        "/configurazioni/bom/42",
      );
    });
  });

  describe("Delete flow — success", () => {
    test("clicking delete opens confirmation modal", async () => {
      renderRow();

      await userEvent.click(screen.getByLabelText("Elimina configurazione"));

      expect(screen.getByTestId("confirm-modal")).toBeInTheDocument();
    });

    test("confirming delete calls action with config id only", async () => {
      renderRow({ id: 5 }, { id: "user-abc" });

      await userEvent.click(screen.getByLabelText("Elimina configurazione"));
      await userEvent.click(screen.getByText("Elimina"));

      await waitFor(() => {
        expect(mockDeleteConfiguration).toHaveBeenCalledWith(5);
      });
    });

    test("shows success toast on successful deletion", async () => {
      renderRow();

      await userEvent.click(screen.getByLabelText("Elimina configurazione"));
      await userEvent.click(screen.getByText("Elimina"));

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith(MSG.toast.configDeleted);
      });
    });
  });

  describe("Delete flow — server error", () => {
    test("shows error toast when action returns failure", async () => {
      mockDeleteConfiguration.mockResolvedValue({ success: false });

      renderRow();

      await userEvent.click(screen.getByLabelText("Elimina configurazione"));
      await userEvent.click(screen.getByText("Elimina"));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(MSG.toast.deleteError);
      });
    });
  });

  describe("Delete flow — exception", () => {
    test("shows generic error toast when action throws", async () => {
      mockDeleteConfiguration.mockRejectedValue(new Error("Network error"));

      renderRow();

      await userEvent.click(screen.getByLabelText("Elimina configurazione"));
      await userEvent.click(screen.getByText("Elimina"));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(MSG.toast.deleteError);
      });
    });
  });
});
