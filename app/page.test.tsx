// @vitest-environment jsdom
import { beforeEach, describe, expect, test, vi } from "vitest";
import type { Role } from "@/types";

// --- Mocks (references defined before vi.mock factories run) ---
const mockGetUserData = vi.fn();
const mockGetConfigurationStatusCounts = vi.fn();
const mockRedirect = vi.fn((path: string) => {
  // Mirror Next's redirect, which throws to halt rendering.
  throw new Error(`REDIRECT:${path}`);
});

vi.mock("next/navigation", () => ({
  redirect: (path: string) => mockRedirect(path),
}));

vi.mock("@/db/queries", () => ({
  getUserData: () => mockGetUserData(),
  getConfigurationStatusCounts: () => mockGetConfigurationStatusCounts(),
}));

import Dashboard from "./page";

/** Runs the page for a role and returns the redirect target, or null if it rendered. */
async function landingFor(role: Role | null): Promise<string | null> {
  mockGetUserData.mockResolvedValue(
    role ? { id: "u1", role, initials: null, manager_id: null } : null,
  );
  try {
    await Dashboard();
    return null;
  } catch (e) {
    return String((e as Error).message).replace("REDIRECT:", "");
  }
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetConfigurationStatusCounts.mockResolvedValue([
    { status: "DRAFT", count: 1 },
  ]);
});

describe("Dashboard landing redirect", () => {
  test("unauthenticated users go to /login", async () => {
    expect(await landingFor(null)).toBe("/login");
  });

  test.each([
    "SALES",
    "SALES_MANAGER",
    "SALES_DIRECTOR",
  ] as const)("%s lands on /offerte", async (role) => {
    expect(await landingFor(role)).toBe("/offerte");
    expect(mockGetConfigurationStatusCounts).not.toHaveBeenCalled();
  });

  test("ENGINEER lands on /configurazioni", async () => {
    expect(await landingFor("ENGINEER")).toBe("/configurazioni");
    expect(mockGetConfigurationStatusCounts).not.toHaveBeenCalled();
  });

  test("ADMIN stays on the dashboard overview", async () => {
    expect(await landingFor("ADMIN")).toBeNull();
    // The overview pulls the cross-status counts.
    expect(mockGetConfigurationStatusCounts).toHaveBeenCalledTimes(1);
  });
});
