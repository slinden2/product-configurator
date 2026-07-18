// @vitest-environment jsdom
import { beforeEach, describe, expect, test, vi } from "vitest";
import type { Role } from "@/types";

// --- Mocks (references defined before vi.mock factories run) ---
const mockGetUserData = vi.fn();
const mockRedirect = vi.fn((path: string) => {
  throw new Error(`REDIRECT:${path}`);
});

vi.mock("next/navigation", () => ({
  redirect: (path: string) => mockRedirect(path),
}));

// Only getUserData executes here: `await Dashboard()` returns the element tree
// WITHOUT rendering the async child sections, so their queries never run. The
// extra stubs exist solely to satisfy the sections' module-level imports —
// per-role section behavior is covered by the tests in components/dashboard/.
vi.mock("@/db/queries", () => ({
  getUserData: () => mockGetUserData(),
  getOfferRevisionQueueCounts: vi.fn(),
  getAcceptedOfferLinesForMarginSweep: vi.fn(),
  getConfigTechnicalQueueCounts: vi.fn(),
}));

vi.mock("@/lib/margin-alerts", () => ({
  computeLineMarginAlertsBatch: vi.fn(),
  classifyMarginLineState: vi.fn(),
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
});

describe("Dashboard landing", () => {
  test("unauthenticated users go to /login", async () => {
    expect(await landingFor(null)).toBe("/login");
  });

  test.each([
    "SALES",
    "SALES_MANAGER",
    "SALES_DIRECTOR",
    "ENGINEER",
    "ADMIN",
  ] as const)("%s stays on the dashboard", async (role) => {
    expect(await landingFor(role)).toBeNull();
  });
});
