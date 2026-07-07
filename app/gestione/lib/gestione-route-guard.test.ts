import { beforeEach, describe, expect, test, vi } from "vitest";
import type { Role } from "@/types";

// --- Mocks (references defined before vi.mock factories run) ---
const mockGetUserData = vi.fn();
const mockRedirect = vi.fn((path: string) => {
  // Mirror Next's redirect, which throws to halt rendering.
  throw new Error(`REDIRECT:${path}`);
});

vi.mock("next/navigation", () => ({
  redirect: (path: string) => mockRedirect(path),
}));

vi.mock("@/db/queries", () => ({
  getUserData: () => mockGetUserData(),
}));

import { gestioneRouteGuard } from "./gestione-route-guard";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("gestioneRouteGuard", () => {
  test("redirects unauthenticated users to /login", async () => {
    mockGetUserData.mockResolvedValue(null);
    await expect(gestioneRouteGuard()).rejects.toThrow("REDIRECT:/login");
  });

  test.each([
    "ENGINEER",
    "SALES",
    "SALES_MANAGER",
    "SALES_DIRECTOR",
  ] as const)("redirects %s to /configurazioni", async (role: Role) => {
    mockGetUserData.mockResolvedValue({
      id: "u1",
      role,
      initials: null,
      manager_id: null,
    });
    await expect(gestioneRouteGuard()).rejects.toThrow(
      "REDIRECT:/configurazioni",
    );
  });

  test("returns the user for ADMIN without redirecting", async () => {
    const user = {
      id: "admin1",
      role: "ADMIN" as const,
      initials: "AD",
      manager_id: null,
    };
    mockGetUserData.mockResolvedValue(user);

    await expect(gestioneRouteGuard()).resolves.toEqual(user);
    expect(mockRedirect).not.toHaveBeenCalled();
  });
});
