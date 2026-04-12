// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

// --- Mock functions ---

const mockPush = vi.fn();
const mockForgotPassword = vi.fn();
const mockToastSuccess = vi.fn();
const mockToastError = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("@/app/actions/auth", () => ({
  forgotPassword: (...args: unknown[]) => mockForgotPassword(...args),
}));

vi.mock("sonner", () => ({
  toast: {
    success: (...args: unknown[]) => mockToastSuccess(...args),
    error: (...args: unknown[]) => mockToastError(...args),
  },
}));

// --- Import SUT after mocks ---

import ForgotPasswordForm from "@/app/(auth)/recupera-password/forgot-password-form";
import { MSG } from "@/lib/messages";

// --- Tests ---

describe("ForgotPasswordForm", () => {
  afterEach(cleanup);

  beforeEach(() => {
    vi.clearAllMocks();
    mockForgotPassword.mockResolvedValue({ success: true });
  });

  describe("Rendering", () => {
    test("renders email field and 'Resetta la password' button", () => {
      render(<ForgotPasswordForm />);

      expect(screen.getByLabelText("Email")).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Resetta la password" }),
      ).toBeInTheDocument();
    });
  });

  describe("Form submission", () => {
    test("calls forgotPassword, shows toast success, and redirects on success", async () => {
      const user = userEvent.setup();
      render(<ForgotPasswordForm />);

      await user.type(screen.getByLabelText("Email"), "test@itecosrl.com");
      await user.click(
        screen.getByRole("button", { name: "Resetta la password" }),
      );

      await waitFor(() => {
        expect(mockForgotPassword).toHaveBeenCalledWith({
          email: "test@itecosrl.com",
        });
        expect(mockToastSuccess).toHaveBeenCalledWith(
          MSG.toast.passwordResetEmailSent,
        );
        expect(mockPush).toHaveBeenCalledWith("/login");
      });
    });

    test("shows toast error on error response, no redirect", async () => {
      mockForgotPassword.mockResolvedValue({
        success: false,
        error: "Errore durante l'autenticazione.",
      });

      const user = userEvent.setup();
      render(<ForgotPasswordForm />);

      await user.type(screen.getByLabelText("Email"), "test@itecosrl.com");
      await user.click(
        screen.getByRole("button", { name: "Resetta la password" }),
      );

      await waitFor(() => {
        expect(mockToastError).toHaveBeenCalledWith(
          "Errore durante l'autenticazione.",
        );
        expect(mockToastSuccess).not.toHaveBeenCalled();
        expect(mockPush).not.toHaveBeenCalled();
      });
    });

    test("does not call forgotPassword with invalid email", async () => {
      const user = userEvent.setup();
      render(<ForgotPasswordForm />);

      await user.type(screen.getByLabelText("Email"), "not-an-email");
      await user.click(
        screen.getByRole("button", { name: "Resetta la password" }),
      );

      await waitFor(() => {
        expect(mockForgotPassword).not.toHaveBeenCalled();
      });
    });

    test("does not call forgotPassword when form is empty", async () => {
      const user = userEvent.setup();
      render(<ForgotPasswordForm />);

      await user.click(
        screen.getByRole("button", { name: "Resetta la password" }),
      );

      await waitFor(() => {
        expect(mockForgotPassword).not.toHaveBeenCalled();
      });
    });
  });
});
