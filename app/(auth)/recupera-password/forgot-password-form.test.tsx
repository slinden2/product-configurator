// @vitest-environment jsdom

import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// --- Mock functions ---

const mockPush = vi.fn();
const mockForgotPassword = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("@/app/actions/auth", () => ({
  forgotPassword: (...args: unknown[]) => mockForgotPassword(...args),
}));

// --- Import SUT after mocks ---

import ForgotPasswordForm from "@/app/(auth)/recupera-password/forgot-password-form";

// --- Tests ---

describe("ForgotPasswordForm", () => {
  afterEach(cleanup);

  beforeEach(() => {
    vi.clearAllMocks();
    mockForgotPassword.mockResolvedValue({ status: "success" });
    vi.spyOn(window, "alert").mockImplementation(() => {});
  });

  describe("Rendering", () => {
    test("renders email field and 'Resetta la password' button", () => {
      render(<ForgotPasswordForm />);

      expect(screen.getByLabelText("Email")).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Resetta la password" })
      ).toBeInTheDocument();
    });
  });

  describe("Form submission", () => {
    test("calls forgotPassword, shows alert, and redirects on success", async () => {
      const user = userEvent.setup();
      render(<ForgotPasswordForm />);

      await user.type(screen.getByLabelText("Email"), "test@example.com");
      await user.click(
        screen.getByRole("button", { name: "Resetta la password" })
      );

      await waitFor(() => {
        expect(mockForgotPassword).toHaveBeenCalledWith({
          email: "test@example.com",
        });
        expect(window.alert).toHaveBeenCalledWith(
          "Email per resettare la password inviata."
        );
        expect(mockPush).toHaveBeenCalledWith("/login");
      });
    });

    test("calls console.error on error response, no alert, no redirect", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      mockForgotPassword.mockResolvedValue({
        status: "Rate limited",
        user: null,
      });

      const user = userEvent.setup();
      render(<ForgotPasswordForm />);

      await user.type(screen.getByLabelText("Email"), "test@example.com");
      await user.click(
        screen.getByRole("button", { name: "Resetta la password" })
      );

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalled();
        expect(window.alert).not.toHaveBeenCalled();
        expect(mockPush).not.toHaveBeenCalled();
      });

      consoleSpy.mockRestore();
    });

    test("does not call forgotPassword with invalid email", async () => {
      const user = userEvent.setup();
      render(<ForgotPasswordForm />);

      await user.type(screen.getByLabelText("Email"), "not-an-email");
      await user.click(
        screen.getByRole("button", { name: "Resetta la password" })
      );

      await waitFor(() => {
        expect(mockForgotPassword).not.toHaveBeenCalled();
      });
    });

    test("does not call forgotPassword when form is empty", async () => {
      const user = userEvent.setup();
      render(<ForgotPasswordForm />);

      await user.click(
        screen.getByRole("button", { name: "Resetta la password" })
      );

      await waitFor(() => {
        expect(mockForgotPassword).not.toHaveBeenCalled();
      });
    });
  });
});
