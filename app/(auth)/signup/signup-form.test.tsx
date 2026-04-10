// @vitest-environment jsdom

import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// --- Mock functions ---

const mockPush = vi.fn();
const mockSignUp = vi.fn();
const mockToastError = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("@/app/actions/auth", () => ({
  signUp: (...args: unknown[]) => mockSignUp(...args),
}));

vi.mock("sonner", () => ({
  toast: { error: (...args: unknown[]) => mockToastError(...args) },
}));

// --- Import SUT after mocks ---

import SignupForm from "@/app/(auth)/signup/signup-form";

// --- Tests ---

describe("SignupForm", () => {
  afterEach(cleanup);

  beforeEach(() => {
    vi.clearAllMocks();
    mockSignUp.mockResolvedValue({
      success: true,
      data: { user: { id: "u1" } },
    });
  });

  describe("Rendering", () => {
    test("renders email field, password field, confirm password field, and 'Registra' button", () => {
      render(<SignupForm />);

      expect(screen.getByLabelText("Email")).toBeInTheDocument();
      expect(screen.getByLabelText("Password")).toBeInTheDocument();
      expect(screen.getByLabelText("Conferma password")).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Registra" }),
      ).toBeInTheDocument();
    });
  });

  describe("Form submission", () => {
    test("calls signUp and redirects to /login on success", async () => {
      const user = userEvent.setup();
      render(<SignupForm />);

      await user.type(screen.getByLabelText("Email"), "test@itecosrl.com");
      await user.type(screen.getByLabelText("Password"), "password123");
      await user.type(
        screen.getByLabelText("Conferma password"),
        "password123",
      );
      await user.click(screen.getByRole("button", { name: "Registra" }));

      await waitFor(() => {
        expect(mockSignUp).toHaveBeenCalledWith({
          email: "test@itecosrl.com",
          password: "password123",
          confirmPassword: "password123",
        });
        expect(mockPush).toHaveBeenCalledWith("/login");
      });
    });

    test("shows toast error on error response and does not redirect", async () => {
      mockSignUp.mockResolvedValue({
        success: false,
        error: "Errore durante l'autenticazione.",
      });

      const user = userEvent.setup();
      render(<SignupForm />);

      await user.type(screen.getByLabelText("Email"), "test@itecosrl.com");
      await user.type(screen.getByLabelText("Password"), "password123");
      await user.type(
        screen.getByLabelText("Conferma password"),
        "password123",
      );
      await user.click(screen.getByRole("button", { name: "Registra" }));

      await waitFor(() => {
        expect(mockToastError).toHaveBeenCalledWith(
          "Errore durante l'autenticazione.",
        );
        expect(mockPush).not.toHaveBeenCalled();
      });
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

      await user.type(screen.getByLabelText("Email"), "test@itecosrl.com");
      await user.type(screen.getByLabelText("Password"), "password123");
      await user.type(
        screen.getByLabelText("Conferma password"),
        "different456",
      );
      await user.click(screen.getByRole("button", { name: "Registra" }));

      await waitFor(() => {
        expect(mockSignUp).not.toHaveBeenCalled();
      });
    });

    test("does not call signUp when password is too short", async () => {
      const user = userEvent.setup();
      render(<SignupForm />);

      await user.type(screen.getByLabelText("Email"), "test@itecosrl.com");
      await user.type(screen.getByLabelText("Password"), "ab");
      await user.type(screen.getByLabelText("Conferma password"), "ab");
      await user.click(screen.getByRole("button", { name: "Registra" }));

      await waitFor(() => {
        expect(mockSignUp).not.toHaveBeenCalled();
      });
    });
  });
});
