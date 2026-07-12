// @vitest-environment node
import { beforeEach, describe, expect, test, vi } from "vitest";

// --- Mocks ---

const mockGetUser = vi.fn();
const mockFindFirst = vi.fn();

vi.mock("@/utils/supabase/server", () => ({
  createClient: () =>
    Promise.resolve({
      auth: {
        getUser: () => mockGetUser(),
      },
    }),
}));

vi.mock("@/db", () => ({
  db: {
    query: {
      userProfiles: {
        findFirst: (...args: unknown[]) => mockFindFirst(...args),
      },
    },
  },
}));

import { getUserData } from "@/db/queries";

const AUTH_USER = { id: "user-1", email: "test@itecosrl.com" };

beforeEach(() => {
  vi.clearAllMocks();
  mockGetUser.mockResolvedValue({ data: { user: AUTH_USER }, error: null });
});

describe("getUserData", () => {
  test("returns null when auth fails", async () => {
    mockGetUser.mockResolvedValue({
      data: null,
      error: { message: "Not authenticated" },
    });
    await expect(getUserData()).resolves.toBeNull();
    expect(mockFindFirst).not.toHaveBeenCalled();
  });

  test("returns null when no profile row exists", async () => {
    mockFindFirst.mockResolvedValue(undefined);
    await expect(getUserData()).resolves.toBeNull();
  });

  test("returns null for an inactive profile (pending ADMIN activation)", async () => {
    mockFindFirst.mockResolvedValue({
      role: "SALES",
      initials: null,
      manager_id: null,
      is_active: false,
    });
    await expect(getUserData()).resolves.toBeNull();
  });

  test("returns the user shape for an active profile", async () => {
    mockFindFirst.mockResolvedValue({
      role: "ENGINEER",
      initials: "EN",
      manager_id: null,
      is_active: true,
    });
    await expect(getUserData()).resolves.toEqual({
      id: AUTH_USER.id,
      role: "ENGINEER",
      initials: "EN",
      manager_id: null,
    });
  });
});
