// @vitest-environment jsdom

import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// --- Mock functions ---

const mockPush = vi.fn();
const mockSignIn = vi.fn();
const mockToastError = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("@/app/actions/auth", () => ({
  signIn: (...args: unknown[]) => mockSignIn(...args),
}));

vi.mock("sonner", () => ({
  toast: { error: (...args: unknown[]) => mockToastError(...args) },
}));

// --- Import SUT after mocks ---

import LoginForm from "@/app/(auth)/login/login-form";

// --- Tests ---

describe("LoginForm", () => {
  afterEach(cleanup);

  beforeEach(() => {
    vi.clearAllMocks();
    mockSignIn.mockResolvedValue({
      success: true,
      data: { user: { id: "u1" } },
    });
  });

  describe("Rendering", () => {
    test("renders email and password fields with labels", () => {
      render(<LoginForm />);

      expect(screen.getByLabelText("Email")).toBeInTheDocument();
      expect(screen.getByLabelText("Password")).toBeInTheDocument();
    });

    test("renders 'Accedi' button", () => {
      render(<LoginForm />);

      expect(
        screen.getByRole("button", { name: "Accedi" }),
      ).toBeInTheDocument();
    });

    test("renders placeholders", () => {
      render(<LoginForm />);

      expect(
        screen.getByPlaceholderText("Inserire la email"),
      ).toBeInTheDocument();
      expect(
        screen.getByPlaceholderText("Inserire la password"),
      ).toBeInTheDocument();
    });
  });

  describe("Form submission", () => {
    test("calls signIn and redirects to /configurations on success", async () => {
      const user = userEvent.setup();
      render(<LoginForm />);

      await user.type(screen.getByLabelText("Email"), "test@example.com");
      await user.type(screen.getByLabelText("Password"), "password123");
      await user.click(screen.getByRole("button", { name: "Accedi" }));

      await waitFor(() => {
        expect(mockSignIn).toHaveBeenCalledWith({
          email: "test@example.com",
          password: "password123",
        });
        expect(mockPush).toHaveBeenCalledWith("/configurations");
      });
    });

    test("shows toast error on error response and does not redirect", async () => {
      mockSignIn.mockResolvedValue({
        success: false,
        error: "Errore durante l'autenticazione.",
      });

      const user = userEvent.setup();
      render(<LoginForm />);

      await user.type(screen.getByLabelText("Email"), "test@example.com");
      await user.type(screen.getByLabelText("Password"), "wrong");
      await user.click(screen.getByRole("button", { name: "Accedi" }));

      await waitFor(() => {
        expect(mockToastError).toHaveBeenCalledWith(
          "Errore durante l'autenticazione.",
        );
        expect(mockPush).not.toHaveBeenCalled();
      });
    });

    test("does not call signIn when form is empty", async () => {
      const user = userEvent.setup();
      render(<LoginForm />);

      await user.click(screen.getByRole("button", { name: "Accedi" }));

      await waitFor(() => {
        expect(mockSignIn).not.toHaveBeenCalled();
      });
    });

    test("does not call signIn with invalid email", async () => {
      const user = userEvent.setup();
      render(<LoginForm />);

      await user.type(screen.getByLabelText("Email"), "not-an-email");
      await user.type(screen.getByLabelText("Password"), "password123");
      await user.click(screen.getByRole("button", { name: "Accedi" }));

      await waitFor(() => {
        expect(mockSignIn).not.toHaveBeenCalled();
      });
    });
  });
});
