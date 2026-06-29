import { beforeEach, describe, expect, test, vi } from "vitest";
import { mockCanAccessConfiguration } from "@/test/access-mocks";

// --- Mocks ---

const mockGetUserData = vi.fn();
const mockGetConfiguration = vi.fn();
const mockDeleteConfiguration = vi.fn();
const mockInsertActivityLog = vi.fn();
// STANDALONE configs ignore this; OFFER tests default the revision to DRAFT.
const mockOfferRevisionStatusFor = vi.fn(
  async (..._args: unknown[]) => "DRAFT",
);

vi.mock("@/db/queries", () => ({
  getUserData: (...args: unknown[]) => mockGetUserData(...args),
  canAccessConfiguration: mockCanAccessConfiguration,
  getConfiguration: (...args: unknown[]) => mockGetConfiguration(...args),
  deleteConfiguration: (...args: unknown[]) => mockDeleteConfiguration(...args),
  offerRevisionStatusFor: (...args: unknown[]) =>
    mockOfferRevisionStatusFor(...args),
  insertActivityLog: (...args: unknown[]) => mockInsertActivityLog(...args),
  QueryError: class QueryError extends Error {
    errorCode: number;
    constructor(message: string, errorCode: number) {
      super(message);
      this.name = "QueryError";
      this.errorCode = errorCode;
    }
  },
}));

const mockTx = {};
vi.mock("@/db", () => ({
  db: {
    transaction: vi.fn(async (cb: (tx: unknown) => Promise<unknown>) =>
      cb(mockTx),
    ),
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
    // Engineer/admin deletes run on standalone configs; sales-status tests
    // override origin to OFFER.
    origin: "STANDALONE",
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
    mockInsertActivityLog.mockResolvedValue(undefined);
  });

  test("returns success when owner deletes DRAFT config", async () => {
    const result = await deleteConfigurationAction(CONF_ID);
    expect(result).toEqual({ success: true });
    expect(mockDeleteConfiguration).toHaveBeenCalledWith(CONF_ID, mockTx);
    expect(mockInsertActivityLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "CONFIG_DELETE",
        targetEntity: "configuration",
        targetId: CONF_ID.toString(),
        metadata: { name: "Test", status: "DRAFT" },
      }),
      mockTx,
    );
  });

  test("returns error when user is not authenticated", async () => {
    mockGetUserData.mockResolvedValue(null);
    const result = await deleteConfigurationAction(CONF_ID);
    expect(result).toEqual({
      success: false,
      error: MSG.auth.userNotAuthenticated,
    });
  });

  test("SALES cannot delete another user's config", async () => {
    mockGetUserData.mockResolvedValue({
      id: "other-user",
      role: "SALES",
      initials: "OU",
    });
    const result = await deleteConfigurationAction(CONF_ID);
    expect(result).toEqual({ success: false, error: MSG.auth.unauthorized });
  });

  test("ADMIN can delete another user's config", async () => {
    mockGetUserData.mockResolvedValue({
      id: "admin-user",
      role: "ADMIN",
      initials: "AU",
    });
    const result = await deleteConfigurationAction(CONF_ID);
    expect(result).toEqual({ success: true });
  });

  test("ENGINEER can delete another user's config", async () => {
    mockGetUserData.mockResolvedValue({
      id: "engineer-user",
      role: "ENGINEER",
      initials: "EN",
    });
    const result = await deleteConfigurationAction(CONF_ID);
    expect(result).toEqual({ success: true });
  });

  test("returns error when configuration not found", async () => {
    mockGetConfiguration.mockResolvedValue(undefined);
    const result = await deleteConfigurationAction(CONF_ID);
    expect(result).toEqual({
      success: false,
      error: MSG.config.notFound,
    });
  });

  test("cannot delete TECH_APPROVED config", async () => {
    mockGetConfiguration.mockResolvedValue(
      mockConfig({ status: "TECH_APPROVED" }),
    );
    const result = await deleteConfigurationAction(CONF_ID);
    expect(result.success).toBe(false);
    expect(result.error).toBe(MSG.config.cannotDelete);
  });

  test("cannot delete CLOSED config", async () => {
    mockGetConfiguration.mockResolvedValue(mockConfig({ status: "CLOSED" }));
    const result = await deleteConfigurationAction(CONF_ID);
    expect(result.success).toBe(false);
    expect(result.error).toBe(MSG.config.cannotDelete);
  });

  test("SALES cannot delete IN_SALES_REVIEW config", async () => {
    mockGetUserData.mockResolvedValue({
      id: OWNER_ID,
      role: "SALES",
      initials: "EX",
    });
    mockGetConfiguration.mockResolvedValue(
      mockConfig({ status: "IN_SALES_REVIEW", origin: "OFFER" }),
    );
    const result = await deleteConfigurationAction(CONF_ID);
    expect(result.success).toBe(false);
    expect(result.error).toBe(MSG.config.cannotDelete);
  });

  test("revalidates both /configurazioni and / after deletion", async () => {
    await deleteConfigurationAction(CONF_ID);
    const { revalidatePath } = await import("next/cache");
    expect(revalidatePath).toHaveBeenCalledWith("/configurazioni");
    expect(revalidatePath).toHaveBeenCalledWith("/");
  });

  test("returns error on db failure", async () => {
    mockDeleteConfiguration.mockRejectedValue(new Error("DB error"));
    const result = await deleteConfigurationAction(CONF_ID);
    expect(result.success).toBe(false);
    expect(result.error).toBe(MSG.db.unknown);
  });

  test("does not revalidate when audit log insert fails (CONFIG_DELETE rolls back)", async () => {
    const { QueryError } = await import("@/db/queries");
    mockInsertActivityLog.mockRejectedValue(
      new QueryError("audit failure", 500),
    );
    const result = await deleteConfigurationAction(CONF_ID);
    expect(result.success).toBe(false);
    const { revalidatePath } = await import("next/cache");
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
