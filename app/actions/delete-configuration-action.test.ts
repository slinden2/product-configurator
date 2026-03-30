import { describe, test, expect, vi, beforeEach } from "vitest";

// --- Mocks ---

const mockGetUserData = vi.fn();
const mockGetConfiguration = vi.fn();
const mockDeleteConfiguration = vi.fn();

vi.mock("@/db/queries", () => ({
  getUserData: (...args: unknown[]) => mockGetUserData(...args),
  getConfiguration: (...args: unknown[]) => mockGetConfiguration(...args),
  deleteConfiguration: (...args: unknown[]) => mockDeleteConfiguration(...args),
  QueryError: class QueryError extends Error {
    errorCode: number;
    constructor(message: string, errorCode: number) {
      super(message);
      this.name = "QueryError";
      this.errorCode = errorCode;
    }
  },
}));

vi.mock("pg", () => ({
  DatabaseError: class DatabaseError extends Error {
    constructor(message: string) {
      super(message);
      this.name = "DatabaseError";
    }
  },
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

// --- Imports ---

import { deleteConfigurationAction } from "@/app/actions/delete-configuration-action";
import { MSG } from "@/lib/messages";

// --- Helpers ---

const CONF_ID = 1;
const OWNER_ID = "owner-123";

function mockConfig(overrides: Record<string, unknown> = {}) {
  return {
    id: CONF_ID,
    user_id: OWNER_ID,
    status: "DRAFT",
    name: "Test",
    ...overrides,
  };
}

// --- Tests ---

describe("deleteConfigurationAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUserData.mockResolvedValue({
      id: OWNER_ID,
      role: "ENGINEER",
      initials: "TU",
    });
    mockGetConfiguration.mockResolvedValue(mockConfig());
    mockDeleteConfiguration.mockResolvedValue(undefined);
  });

  test("returns success when owner deletes DRAFT config", async () => {
    const result = await deleteConfigurationAction(CONF_ID, OWNER_ID);
    expect(result).toEqual({ success: true });
    expect(mockDeleteConfiguration).toHaveBeenCalledWith(CONF_ID);
  });

  test("returns error when user is not authenticated", async () => {
    mockGetUserData.mockResolvedValue(null);
    const result = await deleteConfigurationAction(CONF_ID, OWNER_ID);
    expect(result).toEqual({ success: false, error: MSG.auth.userNotAuthenticated });
  });

  test("SALES cannot delete another user's config", async () => {
    mockGetUserData.mockResolvedValue({
      id: "other-user",
      role: "SALES",
      initials: "OU",
    });
    const result = await deleteConfigurationAction(CONF_ID, OWNER_ID);
    expect(result).toEqual({ success: false, error: MSG.auth.unauthorized });
  });

  test("ADMIN can delete another user's config", async () => {
    mockGetUserData.mockResolvedValue({
      id: "admin-user",
      role: "ADMIN",
      initials: "AU",
    });
    const result = await deleteConfigurationAction(CONF_ID, OWNER_ID);
    expect(result).toEqual({ success: true });
  });

  test("returns error when configuration not found", async () => {
    mockGetConfiguration.mockResolvedValue(undefined);
    const result = await deleteConfigurationAction(CONF_ID, OWNER_ID);
    expect(result).toEqual({
      success: false,
      error: MSG.config.notFound,
    });
  });

  test("cannot delete APPROVED config", async () => {
    mockGetConfiguration.mockResolvedValue(mockConfig({ status: "APPROVED" }));
    const result = await deleteConfigurationAction(CONF_ID, OWNER_ID);
    expect(result.success).toBe(false);
    expect(result.error).toBe(MSG.config.cannotDelete);
  });

  test("cannot delete CLOSED config", async () => {
    mockGetConfiguration.mockResolvedValue(mockConfig({ status: "CLOSED" }));
    const result = await deleteConfigurationAction(CONF_ID, OWNER_ID);
    expect(result.success).toBe(false);
    expect(result.error).toBe(MSG.config.cannotDelete);
  });

  test("SALES cannot delete SUBMITTED config", async () => {
    mockGetUserData.mockResolvedValue({
      id: OWNER_ID,
      role: "SALES",
      initials: "EX",
    });
    mockGetConfiguration.mockResolvedValue(mockConfig({ status: "SUBMITTED" }));
    const result = await deleteConfigurationAction(CONF_ID, OWNER_ID);
    expect(result.success).toBe(false);
    expect(result.error).toBe(MSG.config.cannotDelete);
  });

  test("revalidates both /configurations and / after deletion", async () => {
    await deleteConfigurationAction(CONF_ID, OWNER_ID);
    const { revalidatePath } = await import("next/cache");
    expect(revalidatePath).toHaveBeenCalledWith("/configurations");
    expect(revalidatePath).toHaveBeenCalledWith("/");
  });

  test("returns error on db failure", async () => {
    mockDeleteConfiguration.mockRejectedValue(new Error("DB error"));
    const result = await deleteConfigurationAction(CONF_ID, OWNER_ID);
    expect(result.success).toBe(false);
    expect(result.error).toBe(MSG.db.unknown);
  });
});
