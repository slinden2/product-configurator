// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

// --- Mock functions ---

const mockPush = vi.fn();
const mockGet = vi.fn();
const mockResetPassword = vi.fn();
const mockToastSuccess = vi.fn();
const mockToastError = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => ({ get: mockGet }),
}));

vi.mock("@/app/actions/auth", () => ({
  resetPassword: (...args: unknown[]) => mockResetPassword(...args),
}));

vi.mock("sonner", () => ({
  toast: {
    success: (...args: unknown[]) => mockToastSuccess(...args),
    error: (...args: unknown[]) => mockToastError(...args),
  },
}));

// --- Import SUT after mocks ---

import ResetPasswordForm from "@/app/(auth)/resetta-password/reset-password-form";
import { MSG } from "@/lib/messages";

// --- Tests ---

describe("ResetPasswordForm", () => {
  afterEach(cleanup);

  beforeEach(() => {
    vi.clearAllMocks();
    mockGet.mockReturnValue("test-code-123");
    mockResetPassword.mockResolvedValue({ success: true });
  });

  describe("Rendering", () => {
    test("renders password field, confirm password field, and 'Resetta la password' button", () => {
      render(<ResetPasswordForm />);

      expect(screen.getByLabelText("Password")).toBeInTheDocument();
      expect(screen.getByLabelText("Conferma password")).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Resetta la password" }),
      ).toBeInTheDocument();
    });
  });

  describe("Form submission", () => {
    test("calls resetPassword with form data and code, shows toast success, redirects", async () => {
      const user = userEvent.setup();
      render(<ResetPasswordForm />);

      await user.type(screen.getByLabelText("Password"), "newpass123");
      await user.type(screen.getByLabelText("Conferma password"), "newpass123");
      await user.click(
        screen.getByRole("button", { name: "Resetta la password" }),
      );

      await waitFor(() => {
        expect(mockResetPassword).toHaveBeenCalledWith(
          { password: "newpass123", confirmPassword: "newpass123" },
          "test-code-123",
        );
        expect(mockToastSuccess).toHaveBeenCalledWith(
          MSG.toast.passwordResetSuccess,
        );
        expect(mockPush).toHaveBeenCalledWith("/login");
      });
    });

    test("shows toast error on error response and does not redirect", async () => {
      mockResetPassword.mockResolvedValue({
        success: false,
        error: "Errore durante l'autenticazione.",
      });

      const user = userEvent.setup();
      render(<ResetPasswordForm />);

      await user.type(screen.getByLabelText("Password"), "newpass123");
      await user.type(screen.getByLabelText("Conferma password"), "newpass123");
      await user.click(
        screen.getByRole("button", { name: "Resetta la password" }),
      );

      await waitFor(() => {
        expect(mockToastError).toHaveBeenCalledWith(
          "Errore durante l'autenticazione.",
        );
        expect(mockPush).not.toHaveBeenCalled();
      });
    });

    test("does not call resetPassword when passwords do not match", async () => {
      const user = userEvent.setup();
      render(<ResetPasswordForm />);

      await user.type(screen.getByLabelText("Password"), "newpass123");
      await user.type(
        screen.getByLabelText("Conferma password"),
        "different456",
      );
      await user.click(
        screen.getByRole("button", { name: "Resetta la password" }),
      );

      await waitFor(() => {
        expect(mockResetPassword).not.toHaveBeenCalled();
      });
    });

    test("does not call resetPassword when password is too short", async () => {
      const user = userEvent.setup();
      render(<ResetPasswordForm />);

      await user.type(screen.getByLabelText("Password"), "ab");
      await user.type(screen.getByLabelText("Conferma password"), "ab");
      await user.click(
        screen.getByRole("button", { name: "Resetta la password" }),
      );

      await waitFor(() => {
        expect(mockResetPassword).not.toHaveBeenCalled();
      });
    });

    test("passes null code when search param is missing", async () => {
      mockGet.mockReturnValue(null);

      const user = userEvent.setup();
      render(<ResetPasswordForm />);

      await user.type(screen.getByLabelText("Password"), "newpass123");
      await user.type(screen.getByLabelText("Conferma password"), "newpass123");
      await user.click(
        screen.getByRole("button", { name: "Resetta la password" }),
      );

      await waitFor(() => {
        expect(mockResetPassword).toHaveBeenCalledWith(
          { password: "newpass123", confirmPassword: "newpass123" },
          null,
        );
      });
    });
  });
});
