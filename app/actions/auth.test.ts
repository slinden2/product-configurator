import { describe, test, expect, vi, beforeEach } from "vitest";

// --- Mock functions ---

const mockSignUp = vi.fn();
const mockSignInWithPassword = vi.fn();
const mockSignOut = vi.fn();
const mockGetUser = vi.fn();
const mockResetPasswordForEmail = vi.fn();
const mockExchangeCodeForSession = vi.fn();
const mockUpdateUser = vi.fn();

const mockFindFirst = vi.fn();
const mockValues = vi.fn();
const mockInsert = vi.fn(() => ({ values: mockValues }));

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

vi.mock("@/db", () => ({
  db: {
    query: {
      userProfiles: {
        findFirst: (...args: unknown[]) => mockFindFirst(...args),
      },
    },
    insert: () => mockInsert(),
  },
}));

vi.mock("@/db/schemas", () => ({
  userProfiles: Symbol("userProfiles"),
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn(),
}));

// --- Imports (after mocks) ---

import {
  getUserSession,
  signUp,
  signIn,
  signOut,
  forgotPassword,
  resetPassword,
} from "@/app/actions/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { MSG } from "@/lib/messages";

// --- Helpers ---

const mockUser = { id: "user-1", email: "test@example.com" };

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

  test("returns null on error", async () => {
    mockGetUser.mockResolvedValue({
      data: null,
      error: { message: "Not authenticated" },
    });

    const result = await getUserSession();

    expect(result).toBeNull();
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
      email: "test@example.com",
      password: "password123",
      confirmPassword: "password123",
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
      email: "test@example.com",
      password: "password123",
      confirmPassword: "password123",
    });

    expect(result).toEqual({
      success: false,
      error: MSG.auth.genericError,
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  test("returns Italian duplicate-email error when identities array is empty", async () => {
    mockSignUp.mockResolvedValue({
      data: { user: { ...mockUser, identities: [] } },
      error: null,
    });

    const result = await signUp({
      email: "test@example.com",
      password: "password123",
      confirmPassword: "password123",
    });

    expect(result).toEqual({
      success: false,
      error: MSG.auth.emailAlreadyRegistered,
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  test("returns validation error for invalid input", async () => {
    const result = await signUp({
      email: "not-an-email",
      password: "password123",
      confirmPassword: "password123",
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

  test("returns success and creates user profile when not existing", async () => {
    mockSignInWithPassword.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });
    mockFindFirst.mockResolvedValue(undefined);
    mockValues.mockResolvedValue(undefined);

    const result = await signIn({
      email: "test@example.com",
      password: "password123",
    });

    expect(result).toEqual({
      success: true,
      data: { user: mockUser },
    });
    expect(mockInsert).toHaveBeenCalled();
    expect(mockValues).toHaveBeenCalledWith({
      id: mockUser.id,
      email: "test@example.com",
      role: "SALES",
    });
    expect(revalidatePath).toHaveBeenCalledWith("/", "layout");
  });

  test("returns success and skips profile creation when user already exists", async () => {
    mockSignInWithPassword.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });
    mockFindFirst.mockResolvedValue({ id: mockUser.id, email: mockUser.email });

    const result = await signIn({
      email: "test@example.com",
      password: "password123",
    });

    expect(result).toEqual({
      success: true,
      data: { user: mockUser },
    });
    expect(mockInsert).not.toHaveBeenCalled();
    expect(revalidatePath).toHaveBeenCalledWith("/", "layout");
  });

  test("returns error when Supabase auth fails", async () => {
    mockSignInWithPassword.mockResolvedValue({
      data: {},
      error: { message: "Invalid credentials" },
    });

    const result = await signIn({
      email: "test@example.com",
      password: "wrong",
    });

    expect(result).toEqual({
      success: false,
      error: MSG.auth.genericError,
    });
    expect(mockFindFirst).not.toHaveBeenCalled();
    expect(mockInsert).not.toHaveBeenCalled();
  });

  test("returns error when DB query throws", async () => {
    mockSignInWithPassword.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });
    mockFindFirst.mockRejectedValue(new Error("DB connection failed"));

    const result = await signIn({
      email: "test@example.com",
      password: "password123",
    });

    expect(result).toEqual({
      success: false,
      error: MSG.db.error,
    });
  });

  test("returns error when DB insert throws", async () => {
    mockSignInWithPassword.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });
    mockFindFirst.mockResolvedValue(undefined);
    mockValues.mockRejectedValue(new Error("Insert failed"));

    const result = await signIn({
      email: "test@example.com",
      password: "password123",
    });

    expect(result).toEqual({
      success: false,
      error: MSG.db.error,
    });
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

    expect(redirect).toHaveBeenCalledWith("/error");
  });
});

describe("forgotPassword", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("returns success and passes correct redirectTo URL", async () => {
    mockResetPasswordForEmail.mockResolvedValue({ error: null });

    const result = await forgotPassword({ email: "test@example.com" });

    expect(result).toEqual({ success: true });
    expect(mockResetPasswordForEmail).toHaveBeenCalledWith(
      "test@example.com",
      { redirectTo: "http://localhost:3000/resetta-password" }
    );
  });

  test("returns error when Supabase fails", async () => {
    mockResetPasswordForEmail.mockResolvedValue({
      error: { message: "Rate limited" },
    });

    const result = await forgotPassword({ email: "test@example.com" });

    expect(result).toEqual({
      success: false,
      error: MSG.auth.genericError,
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
      { password: "newpass123", confirmPassword: "newpass123" },
      null
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
      { password: "newpass123", confirmPassword: "newpass123" },
      "bad-code"
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
      { password: "newpass123", confirmPassword: "newpass123" },
      "valid-code"
    );

    expect(result).toEqual({
      success: false,
      error: MSG.auth.genericError,
    });
  });

  test("returns success when both steps succeed", async () => {
    mockExchangeCodeForSession.mockResolvedValue({ error: null });
    mockUpdateUser.mockResolvedValue({ error: null });

    const result = await resetPassword(
      { password: "newpass123", confirmPassword: "newpass123" },
      "valid-code"
    );

    expect(result).toEqual({ success: true });
    expect(mockUpdateUser).toHaveBeenCalledWith({ password: "newpass123" });
  });

  test("returns validation error for invalid input", async () => {
    const result = await resetPassword(
      { password: "ab", confirmPassword: "ab" },
      "valid-code"
    );

    expect(result).toEqual({
      success: false,
      error: MSG.auth.invalidData,
    });
    expect(mockExchangeCodeForSession).not.toHaveBeenCalled();
  });
});
