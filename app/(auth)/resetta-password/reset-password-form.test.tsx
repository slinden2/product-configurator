// @vitest-environment jsdom

import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// --- Mock functions ---

const mockPush = vi.fn();
const mockGet = vi.fn();
const mockResetPassword = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => ({ get: mockGet }),
}));

vi.mock("@/app/actions/auth", () => ({
  resetPassword: (...args: unknown[]) => mockResetPassword(...args),
}));

// --- Import SUT after mocks ---

import ResetPasswordForm from "@/app/(auth)/resetta-password/reset-password-form";

// --- Tests ---

describe("ResetPasswordForm", () => {
  afterEach(cleanup);

  beforeEach(() => {
    vi.clearAllMocks();
    mockGet.mockReturnValue("test-code-123");
    mockResetPassword.mockResolvedValue({ status: "success" });
  });

  describe("Rendering", () => {
    test("renders two password fields and 'Resetta la password' button", () => {
      render(<ResetPasswordForm />);

      expect(screen.getAllByLabelText("Password")).toHaveLength(2);
      expect(
        screen.getByRole("button", { name: "Resetta la password" })
      ).toBeInTheDocument();
    });
  });

  describe("Form submission", () => {
    test("calls resetPassword with form data and code, redirects on success", async () => {
      const user = userEvent.setup();
      render(<ResetPasswordForm />);

      const passwordFields = screen.getAllByLabelText("Password");
      await user.type(passwordFields[0], "newpass123");
      await user.type(passwordFields[1], "newpass123");
      await user.click(
        screen.getByRole("button", { name: "Resetta la password" })
      );

      await waitFor(() => {
        expect(mockResetPassword).toHaveBeenCalledWith(
          { password: "newpass123", confirmPassword: "newpass123" },
          "test-code-123"
        );
        expect(mockPush).toHaveBeenCalledWith("/login");
      });
    });

    test("calls console.error on error response and does not redirect", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      mockResetPassword.mockResolvedValue({ status: "Error" });

      const user = userEvent.setup();
      render(<ResetPasswordForm />);

      const passwordFields = screen.getAllByLabelText("Password");
      await user.type(passwordFields[0], "newpass123");
      await user.type(passwordFields[1], "newpass123");
      await user.click(
        screen.getByRole("button", { name: "Resetta la password" })
      );

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalled();
        expect(mockPush).not.toHaveBeenCalled();
      });

      consoleSpy.mockRestore();
    });

    test("does not call resetPassword when passwords do not match", async () => {
      const user = userEvent.setup();
      render(<ResetPasswordForm />);

      const passwordFields = screen.getAllByLabelText("Password");
      await user.type(passwordFields[0], "newpass123");
      await user.type(passwordFields[1], "different456");
      await user.click(
        screen.getByRole("button", { name: "Resetta la password" })
      );

      await waitFor(() => {
        expect(mockResetPassword).not.toHaveBeenCalled();
      });
    });

    test("does not call resetPassword when password is too short", async () => {
      const user = userEvent.setup();
      render(<ResetPasswordForm />);

      const passwordFields = screen.getAllByLabelText("Password");
      await user.type(passwordFields[0], "ab");
      await user.type(passwordFields[1], "ab");
      await user.click(
        screen.getByRole("button", { name: "Resetta la password" })
      );

      await waitFor(() => {
        expect(mockResetPassword).not.toHaveBeenCalled();
      });
    });

    test("passes null code when search param is missing", async () => {
      mockGet.mockReturnValue(null);

      const user = userEvent.setup();
      render(<ResetPasswordForm />);

      const passwordFields = screen.getAllByLabelText("Password");
      await user.type(passwordFields[0], "newpass123");
      await user.type(passwordFields[1], "newpass123");
      await user.click(
        screen.getByRole("button", { name: "Resetta la password" })
      );

      await waitFor(() => {
        expect(mockResetPassword).toHaveBeenCalledWith(
          { password: "newpass123", confirmPassword: "newpass123" },
          null
        );
      });
    });
  });
});
