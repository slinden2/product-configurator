// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type React from "react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

// --- Mock functions (before vi.mock) ---

const mockActivateUser = vi.fn();
const mockDeactivateUser = vi.fn();
const mockAssignManager = vi.fn();
const mockChangeUserRole = vi.fn();
const mockSendPasswordReset = vi.fn();

vi.mock("@/app/actions/user-actions", () => ({
  activateUserAction: (...args: unknown[]) => mockActivateUser(...args),
  deactivateUserAction: (...args: unknown[]) => mockDeactivateUser(...args),
  assignManagerAction: (...args: unknown[]) => mockAssignManager(...args),
  changeUserRoleAction: (...args: unknown[]) => mockChangeUserRole(...args),
  sendPasswordResetAction: (...args: unknown[]) =>
    mockSendPasswordReset(...args),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("@/components/confirm-modal", () => ({
  ConfirmModal: ({
    isOpen,
    onConfirm,
    onOpenChange,
    title,
    confirmText,
  }: {
    isOpen: boolean;
    onConfirm: () => void;
    onOpenChange: (open: boolean) => void;
    title?: string;
    confirmText?: string;
  }) =>
    isOpen ? (
      <tr data-testid="confirm-modal">
        <td>
          <div data-testid="modal-title">{title}</div>
          <button type="button" onClick={onConfirm}>
            {confirmText ?? "Conferma"}
          </button>
          <button type="button" onClick={() => onOpenChange(false)}>
            Annulla
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

import { toast } from "sonner";
import UserRow from "@/components/users-table/user-row";
import type { UserWithStats } from "@/db/queries";
import { MSG } from "@/lib/messages";

// --- Helpers ---

const CURRENT_USER_ID = "00000000-0000-4000-8000-000000000001";
const ROW_USER_ID = "00000000-0000-4000-8000-000000000002";
const MANAGER_ID = "00000000-0000-4000-8000-000000000003";

function makeUser(overrides?: Partial<UserWithStats>): UserWithStats {
  return {
    id: ROW_USER_ID,
    email: "sales@itecosrl.com",
    role: "SALES",
    initials: "SA",
    manager_id: null,
    is_active: true,
    deactivated_at: null,
    last_login_at: null,
    configCount: 0,
    lastActivity: null,
    ...overrides,
  };
}

function renderRow(
  userOverrides?: Partial<UserWithStats>,
  managers: { id: string; email: string; isActive: boolean }[] = [],
) {
  return render(
    <table>
      <tbody>
        <UserRow
          user={makeUser(userOverrides)}
          currentUserId={CURRENT_USER_ID}
          managers={managers}
        />
      </tbody>
    </table>,
  );
}

async function openActionsMenu() {
  await userEvent.click(screen.getByRole("button", { name: "Apri azioni" }));
}

// --- Setup ---

afterEach(cleanup);

beforeEach(() => {
  vi.clearAllMocks();
  mockDeactivateUser.mockResolvedValue({ success: true });
  mockActivateUser.mockResolvedValue({ success: true });
});

// --- Tests ---

describe("UserRow", () => {
  describe("status badge", () => {
    test("shows Attivo for an active user", () => {
      renderRow({ is_active: true, deactivated_at: null });
      expect(screen.getByText(MSG.users.statusActive)).toBeInTheDocument();
    });

    test("shows Disattivato for a deactivated user", () => {
      renderRow({ is_active: false, deactivated_at: new Date() });
      expect(screen.getByText(MSG.users.statusDeactivated)).toBeInTheDocument();
    });

    test("shows In attesa for a never-activated user", () => {
      renderRow({ is_active: false, deactivated_at: null });
      expect(screen.getByText(MSG.users.statusPending)).toBeInTheDocument();
    });
  });

  describe("deactivate menu item visibility", () => {
    test("visible for an active non-self non-ADMIN user", async () => {
      renderRow();
      await openActionsMenu();
      expect(
        screen.getByRole("menuitem", { name: /Disattiva utente/ }),
      ).toBeInTheDocument();
    });

    test("hidden for the current user's own row", async () => {
      renderRow({ id: CURRENT_USER_ID });
      await openActionsMenu();
      expect(
        screen.queryByRole("menuitem", { name: /Disattiva utente/ }),
      ).toBeNull();
    });

    test("hidden for an ADMIN row", async () => {
      renderRow({ role: "ADMIN" });
      await openActionsMenu();
      expect(
        screen.queryByRole("menuitem", { name: /Disattiva utente/ }),
      ).toBeNull();
    });

    test("hidden for an inactive user, which shows Attiva utente instead", async () => {
      renderRow({ is_active: false, deactivated_at: new Date() });
      await openActionsMenu();
      expect(
        screen.queryByRole("menuitem", { name: /Disattiva utente/ }),
      ).toBeNull();
      expect(
        screen.getByRole("menuitem", { name: /Attiva utente/ }),
      ).toBeInTheDocument();
    });
  });

  describe("deactivate flow", () => {
    test("opens the confirm modal without calling the action", async () => {
      renderRow();
      await openActionsMenu();
      await userEvent.click(
        screen.getByRole("menuitem", { name: /Disattiva utente/ }),
      );
      expect(screen.getByTestId("confirm-modal")).toBeInTheDocument();
      expect(screen.getByTestId("modal-title")).toHaveTextContent(
        MSG.deactivateUserConfirm.title,
      );
      expect(mockDeactivateUser).not.toHaveBeenCalled();
    });

    test("confirming calls deactivateUserAction and shows the success toast", async () => {
      renderRow();
      await openActionsMenu();
      await userEvent.click(
        screen.getByRole("menuitem", { name: /Disattiva utente/ }),
      );
      await userEvent.click(
        screen.getByText(MSG.deactivateUserConfirm.confirm),
      );

      await waitFor(() => {
        expect(mockDeactivateUser).toHaveBeenCalledWith({
          userId: ROW_USER_ID,
        });
      });
      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith(MSG.toast.userDeactivated);
      });
    });

    test("shows the returned error toast when the action fails", async () => {
      mockDeactivateUser.mockResolvedValue({
        success: false,
        error: MSG.users.cannotDeactivateAdmin,
      });
      renderRow();
      await openActionsMenu();
      await userEvent.click(
        screen.getByRole("menuitem", { name: /Disattiva utente/ }),
      );
      await userEvent.click(
        screen.getByText(MSG.deactivateUserConfirm.confirm),
      );

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          MSG.users.cannotDeactivateAdmin,
        );
      });
    });
  });

  describe("manager picker", () => {
    test("renders a deactivated assigned manager with the inactive suffix", () => {
      renderRow({ role: "SALES", manager_id: MANAGER_ID }, [
        { id: MANAGER_ID, email: "manager@itecosrl.com", isActive: false },
      ]);
      // The selected (deactivated) manager still renders in the closed trigger.
      expect(
        screen.getByText(
          `manager@itecosrl.com ${MSG.users.managerInactiveSuffix}`,
        ),
      ).toBeInTheDocument();
    });

    test("drops an unassigned deactivated manager from the options entirely", () => {
      renderRow({ role: "SALES", manager_id: null }, [
        { id: MANAGER_ID, email: "manager@itecosrl.com", isActive: false },
      ]);
      // Empty option list → the select is disabled and no manager text renders.
      expect(screen.queryByText(/manager@itecosrl\.com/)).toBeNull();
    });
  });
});
