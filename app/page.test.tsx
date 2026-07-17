// @vitest-environment jsdom
import { beforeEach, describe, expect, test, vi } from "vitest";
import type { Role } from "@/types";

// --- Mocks (references defined before vi.mock factories run) ---
const mockGetUserData = vi.fn();
const mockGetOfferRevisionQueueCounts = vi.fn();
const mockGetConfigIntakeCount = vi.fn();
const mockGetAcceptedOfferLinesForMarginSweep = vi.fn();
const mockGetConfigTechnicalQueueCounts = vi.fn();
const mockRedirect = vi.fn((path: string) => {
  throw new Error(`REDIRECT:${path}`);
});

vi.mock("next/navigation", () => ({
  redirect: (path: string) => mockRedirect(path),
}));

vi.mock("@/db/queries", () => ({
  getUserData: () => mockGetUserData(),
  getOfferRevisionQueueCounts: () => mockGetOfferRevisionQueueCounts(),
  getConfigIntakeCount: () => mockGetConfigIntakeCount(),
  getAcceptedOfferLinesForMarginSweep: () =>
    mockGetAcceptedOfferLinesForMarginSweep(),
  getConfigTechnicalQueueCounts: () => mockGetConfigTechnicalQueueCounts(),
}));

vi.mock("@/lib/margin-alerts", () => ({
  computeLineMarginAlertsBatch: () => new Map(),
  classifyMarginLineState: () => "ABOVE_THRESHOLD",
}));

import Dashboard from "./page";

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
  mockGetOfferRevisionQueueCounts.mockResolvedValue([]);
  mockGetConfigIntakeCount.mockResolvedValue({ count: 0, oldestDate: null });
  mockGetAcceptedOfferLinesForMarginSweep.mockResolvedValue([]);
  mockGetConfigTechnicalQueueCounts.mockResolvedValue([]);
});

describe("Dashboard landing redirect", () => {
  test("unauthenticated users go to /login", async () => {
    expect(await landingFor(null)).toBe("/login");
  });

  test.each([
    "SALES",
    "SALES_MANAGER",
  ] as const)("%s lands on /offerte", async (role) => {
    expect(await landingFor(role)).toBe("/offerte");
  });

  test("ENGINEER lands on /configurazioni", async () => {
    expect(await landingFor("ENGINEER")).toBe("/configurazioni");
  });

  test("ADMIN stays on the dashboard overview", async () => {
    expect(await landingFor("ADMIN")).toBeNull();
  });

  test("SALES_DIRECTOR stays on the dashboard overview", async () => {
    expect(await landingFor("SALES_DIRECTOR")).toBeNull();
  });
});
