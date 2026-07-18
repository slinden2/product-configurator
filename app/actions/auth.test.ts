import { beforeEach, describe, expect, test, vi } from "vitest";

// --- Mock functions ---

const mockSignUp = vi.fn();
const mockSignInWithPassword = vi.fn();
const mockSignOut = vi.fn();
const mockGetUser = vi.fn();
const mockResetPasswordForEmail = vi.fn();
const mockExchangeCodeForSession = vi.fn();
const mockUpdateUser = vi.fn();

const mockProvisionUserProfileOnLogin = vi.fn();

// --- vi.mock() ---

vi.mock("@/utils/supabase/server", () => ({
  createClient: () =>
    Promise.resolve({
      auth: {
        signUp: (...args: unknown[]) => mockSignUp(...args),
        signInWithPassword: (...args: unknown[]) =>
          mockSignInWithPassword(...args),
        signOut: () => mockSignOut(),
        getUser: () => mockGetUser(),
        resetPasswordForEmail: (...args: unknown[]) =>
          mockResetPasswordForEmail(...args),
        exchangeCodeForSession: (...args: unknown[]) =>
          mockExchangeCodeForSession(...args),
        updateUser: (...args: unknown[]) => mockUpdateUser(...args),
      },
    }),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

vi.mock("next/headers", () => ({
  headers: () =>
    Promise.resolve({
      get: () => "http://localhost:3000",
    }),
}));

vi.mock("@/db/queries", () => ({
  provisionUserProfileOnLogin: (...args: unknown[]) =>
    mockProvisionUserProfileOnLogin(...args),
}));

// --- Imports (after mocks) ---

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  forgotPassword,
  getUserSession,
  resetPassword,
  signIn,
  signOut,
  signUp,
} from "@/app/actions/auth";
import { MSG } from "@/lib/messages";

// --- Helpers ---

const mockUser = { id: "user-1", email: "test@itecosrl.com" };

// --- Tests ---

describe("getUserSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("returns session with user on success", async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null });

    const result = await getUserSession();

    expect(result).toEqual({ success: true, data: { user: mockUser } });
  });

  test("returns the standard failure shape on error", async () => {
    mockGetUser.mockResolvedValue({
      data: null,
      error: { message: "Not authenticated" },
    });

    const result = await getUserSession();

    expect(result).toEqual({
      success: false,
      error: "Errore durante l'autenticazione.",
    });
  });
});

describe("signUp", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("returns success and user on valid signup", async () => {
    mockSignUp.mockResolvedValue({
      data: { user: { ...mockUser, identities: [{ id: "i1" }] } },
      error: null,
    });

    const result = await signUp({
      email: "test@itecosrl.com",
      password: "password12345",
      confirmPassword: "password12345",
    });

    expect(result.success).toBe(true);
    expect(result).toHaveProperty("data");
    expect(revalidatePath).toHaveBeenCalledWith("/", "layout");
  });

  test("returns error when Supabase signup fails", async () => {
    mockSignUp.mockResolvedValue({
      data: { user: null },
      error: { message: "Signup failed" },
    });

    const result = await signUp({
      email: "test@itecosrl.com",
      password: "password12345",
      confirmPassword: "password12345",
    });

    expect(result).toEqual({
      success: false,
      error: MSG.auth.genericError,
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  test("returns the same success shape when the email is already registered (anti-enumeration)", async () => {
    // Supabase signals an existing address with a fake user whose identities
    // array is empty; the response must be indistinguishable from a real signup.
    mockSignUp.mockResolvedValue({
      data: { user: { ...mockUser, identities: [] } },
      error: null,
    });

    const result = await signUp({
      email: "test@itecosrl.com",
      password: "password12345",
      confirmPassword: "password12345",
    });

    expect(result.success).toBe(true);
    expect(result).toHaveProperty("data");
    expect(revalidatePath).toHaveBeenCalledWith("/", "layout");
  });

  test("returns validation error for invalid input", async () => {
    const result = await signUp({
      email: "not-an-email",
      password: "password12345",
      confirmPassword: "password12345",
    });

    expect(result).toEqual({
      success: false,
      error: MSG.auth.invalidData,
    });
    expect(mockSignUp).not.toHaveBeenCalled();
  });
});

describe("signIn", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("denies the session with the pending-activation message when the profile is inactive", async () => {
    // Covers both first-login provisioning and an existing-but-never-activated
    // profile: provisionUserProfileOnLogin returns deactivated_at null in both.
    mockSignInWithPassword.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });
    mockProvisionUserProfileOnLogin.mockResolvedValue({
      is_active: false,
      deactivated_at: null,
    });
    mockSignOut.mockResolvedValue({ error: null });

    const result = await signIn({
      email: "test@itecosrl.com",
      password: "password123",
    });

    expect(result).toEqual({
      success: false,
      error: MSG.auth.accountPendingActivation,
    });
    expect(mockProvisionUserProfileOnLogin).toHaveBeenCalledWith(
      mockUser.id,
      "test@itecosrl.com",
    );
    expect(mockSignOut).toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  test("denies login with the deactivated message when deactivated_at is set", async () => {
    mockSignInWithPassword.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });
    mockProvisionUserProfileOnLogin.mockResolvedValue({
      is_active: false,
      deactivated_at: new Date(),
    });
    mockSignOut.mockResolvedValue({ error: null });

    const result = await signIn({
      email: "test@itecosrl.com",
      password: "password123",
    });

    expect(result).toEqual({
      success: false,
      error: MSG.auth.accountDeactivated,
    });
    expect(mockSignOut).toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  test("returns success and grants the session when the profile is active", async () => {
    mockSignInWithPassword.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });
    mockProvisionUserProfileOnLogin.mockResolvedValue({
      is_active: true,
      deactivated_at: null,
    });

    const result = await signIn({
      email: "test@itecosrl.com",
      password: "password123",
    });

    expect(result).toEqual({
      success: true,
      data: { user: mockUser },
    });
    expect(mockSignOut).not.toHaveBeenCalled();
    expect(revalidatePath).toHaveBeenCalledWith("/", "layout");
  });

  test("returns error when Supabase auth fails", async () => {
    mockSignInWithPassword.mockResolvedValue({
      data: {},
      error: { message: "Invalid credentials" },
    });

    const result = await signIn({
      email: "test@itecosrl.com",
      password: "wrong",
    });

    expect(result).toEqual({
      success: false,
      error: MSG.auth.genericError,
    });
    expect(mockProvisionUserProfileOnLogin).not.toHaveBeenCalled();
  });

  test("returns db error when provisioning throws", async () => {
    mockSignInWithPassword.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });
    mockProvisionUserProfileOnLogin.mockRejectedValue(
      new Error("DB connection failed"),
    );

    const result = await signIn({
      email: "test@itecosrl.com",
      password: "password123",
    });

    expect(result).toEqual({
      success: false,
      error: MSG.db.error,
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  test("returns validation error for invalid input", async () => {
    const result = await signIn({
      email: "not-an-email",
      password: "password123",
    });

    expect(result).toEqual({
      success: false,
      error: MSG.auth.invalidData,
    });
    expect(mockSignInWithPassword).not.toHaveBeenCalled();
  });
});

describe("signOut", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("calls revalidatePath and redirects to /login on success", async () => {
    mockSignOut.mockResolvedValue({ error: null });

    await signOut();

    expect(revalidatePath).toHaveBeenCalledWith("/", "layout");
    expect(redirect).toHaveBeenCalledWith("/login");
  });

  test("redirects to /error on failure", async () => {
    mockSignOut.mockResolvedValue({
      error: { message: "Session expired" },
    });

    await signOut();

    expect(redirect).toHaveBeenCalledWith("/errore");
  });
});

describe("forgotPassword", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("returns success and passes correct redirectTo URL", async () => {
    mockResetPasswordForEmail.mockResolvedValue({ error: null });

    const result = await forgotPassword({ email: "test@itecosrl.com" });

    expect(result).toEqual({ success: true });
    expect(mockResetPasswordForEmail).toHaveBeenCalledWith(
      "test@itecosrl.com",
      {
        redirectTo: "http://localhost:3000/reimposta-password",
      },
    );
  });

  test("returns generic error when Supabase fails", async () => {
    mockResetPasswordForEmail.mockResolvedValue({
      error: { message: "Something went wrong", status: 500 },
    });

    const result = await forgotPassword({ email: "test@itecosrl.com" });

    expect(result).toEqual({
      success: false,
      error: MSG.auth.genericError,
    });
  });

  test("returns rate limit error on 429", async () => {
    mockResetPasswordForEmail.mockResolvedValue({
      error: { message: "email rate limit exceeded", status: 429 },
    });

    const result = await forgotPassword({ email: "test@itecosrl.com" });

    expect(result).toEqual({
      success: false,
      error: MSG.auth.rateLimitExceeded,
    });
  });

  test("returns validation error for invalid input", async () => {
    const result = await forgotPassword({ email: "not-an-email" });

    expect(result).toEqual({
      success: false,
      error: MSG.auth.invalidData,
    });
    expect(mockResetPasswordForEmail).not.toHaveBeenCalled();
  });
});

describe("resetPassword", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("returns missing code error when code is null", async () => {
    const result = await resetPassword(
      { password: "newpassword123", confirmPassword: "newpassword123" },
      null,
    );

    expect(result).toEqual({
      success: false,
      error: MSG.auth.missingResetCode,
    });
    expect(mockExchangeCodeForSession).not.toHaveBeenCalled();
  });

  test("returns error when exchangeCodeForSession fails", async () => {
    mockExchangeCodeForSession.mockResolvedValue({
      error: { message: "Invalid code" },
    });

    const result = await resetPassword(
      { password: "newpassword123", confirmPassword: "newpassword123" },
      "bad-code",
    );

    expect(result).toEqual({
      success: false,
      error: MSG.auth.genericError,
    });
    expect(mockUpdateUser).not.toHaveBeenCalled();
  });

  test("returns error when updateUser fails", async () => {
    mockExchangeCodeForSession.mockResolvedValue({ error: null });
    mockUpdateUser.mockResolvedValue({
      error: { message: "Weak password" },
    });

    const result = await resetPassword(
      { password: "newpassword123", confirmPassword: "newpassword123" },
      "valid-code",
    );

    expect(result).toEqual({
      success: false,
      error: MSG.auth.genericError,
    });
    expect(mockSignOut).not.toHaveBeenCalled();
  });

  test("returns success and signs out so the /login redirect is honest", async () => {
    mockExchangeCodeForSession.mockResolvedValue({ error: null });
    mockUpdateUser.mockResolvedValue({ error: null });
    mockSignOut.mockResolvedValue({ error: null });

    const result = await resetPassword(
      { password: "newpassword123", confirmPassword: "newpassword123" },
      "valid-code",
    );

    expect(result).toEqual({ success: true });
    expect(mockUpdateUser).toHaveBeenCalledWith({
      password: "newpassword123",
    });
    expect(mockSignOut).toHaveBeenCalled();
  });

  test("returns validation error for invalid input", async () => {
    const result = await resetPassword(
      { password: "ab", confirmPassword: "ab" },
      "valid-code",
    );

    expect(result).toEqual({
      success: false,
      error: MSG.auth.invalidData,
    });
    expect(mockExchangeCodeForSession).not.toHaveBeenCalled();
  });
});
