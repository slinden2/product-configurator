// @vitest-environment jsdom

import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// --- Mock functions ---

const mockPush = vi.fn();
const mockSignUp = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("@/app/actions/auth", () => ({
  signUp: (...args: unknown[]) => mockSignUp(...args),
}));

// --- Import SUT after mocks ---

import SignupForm from "@/app/(auth)/signup/signup-form";

// --- Tests ---

describe("SignupForm", () => {
  afterEach(cleanup);

  beforeEach(() => {
    vi.clearAllMocks();
    mockSignUp.mockResolvedValue({ status: "success", user: { id: "u1" } });
  });

  describe("Rendering", () => {
    test("renders email field, two password fields, and 'Registra' button", () => {
      render(<SignupForm />);

      expect(screen.getByLabelText("Email")).toBeInTheDocument();
      expect(screen.getAllByLabelText("Password")).toHaveLength(2);
      expect(
        screen.getByRole("button", { name: "Registra" })
      ).toBeInTheDocument();
    });
  });

  describe("Form submission", () => {
    test("calls signUp and redirects to /login on success", async () => {
      const user = userEvent.setup();
      render(<SignupForm />);

      await user.type(screen.getByLabelText("Email"), "test@example.com");
      const passwordFields = screen.getAllByLabelText("Password");
      await user.type(passwordFields[0], "password123");
      await user.type(passwordFields[1], "password123");
      await user.click(screen.getByRole("button", { name: "Registra" }));

      await waitFor(() => {
        expect(mockSignUp).toHaveBeenCalledWith({
          email: "test@example.com",
          password: "password123",
          confirmPassword: "password123",
        });
        expect(mockPush).toHaveBeenCalledWith("/login");
      });
    });

    test("calls console.error on error response and does not redirect", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      mockSignUp.mockResolvedValue({ status: "Error", user: null });

      const user = userEvent.setup();
      render(<SignupForm />);

      await user.type(screen.getByLabelText("Email"), "test@example.com");
      const passwordFields = screen.getAllByLabelText("Password");
      await user.type(passwordFields[0], "password123");
      await user.type(passwordFields[1], "password123");
      await user.click(screen.getByRole("button", { name: "Registra" }));

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalled();
        expect(mockPush).not.toHaveBeenCalled();
      });

      consoleSpy.mockRestore();
    });

    test("does not call signUp when form is empty", async () => {
      const user = userEvent.setup();
      render(<SignupForm />);

      await user.click(screen.getByRole("button", { name: "Registra" }));

      await waitFor(() => {
        expect(mockSignUp).not.toHaveBeenCalled();
      });
    });

    test("does not call signUp when passwords do not match", async () => {
      const user = userEvent.setup();
      render(<SignupForm />);

      await user.type(screen.getByLabelText("Email"), "test@example.com");
      const passwordFields = screen.getAllByLabelText("Password");
      await user.type(passwordFields[0], "password123");
      await user.type(passwordFields[1], "different456");
      await user.click(screen.getByRole("button", { name: "Registra" }));

      await waitFor(() => {
        expect(mockSignUp).not.toHaveBeenCalled();
      });
    });

    test("does not call signUp when password is too short", async () => {
      const user = userEvent.setup();
      render(<SignupForm />);

      await user.type(screen.getByLabelText("Email"), "test@example.com");
      const passwordFields = screen.getAllByLabelText("Password");
      await user.type(passwordFields[0], "ab");
      await user.type(passwordFields[1], "ab");
      await user.click(screen.getByRole("button", { name: "Registra" }));

      await waitFor(() => {
        expect(mockSignUp).not.toHaveBeenCalled();
      });
    });
  });
});
