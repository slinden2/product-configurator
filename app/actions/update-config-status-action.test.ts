import { beforeEach, describe, expect, test, vi } from "vitest";

// --- Mocks ---

const mockGetUserData = vi.fn();
const mockUpdateConfigStatus = vi.fn();
const mockInsertActivityLog = vi.fn();

vi.mock("@/db/queries", () => ({
  getUserData: (...args: unknown[]) => mockGetUserData(...args),
  updateConfigStatus: (...args: unknown[]) => mockUpdateConfigStatus(...args),
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

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("pg", () => ({
  DatabaseError: class DatabaseError extends Error {
    constructor(message: string) {
      super(message);
      this.name = "DatabaseError";
    }
  },
}));

// --- Imports ---

import { updateConfigStatusAction } from "@/app/actions/update-config-status-action";
import { QueryError } from "@/db/queries";
import { MSG } from "@/lib/messages";

// --- Tests ---

const CONF_ID = 1;

describe("updateConfigStatusAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUserData.mockResolvedValue({
      id: "user-1",
      role: "ENGINEER",
      initials: "TU",
    });
    mockUpdateConfigStatus.mockResolvedValue({
      id: CONF_ID,
      fromStatus: "DRAFT",
      origin: "STANDALONE",
    });
    mockInsertActivityLog.mockResolvedValue(undefined);
  });

  test("returns success with config id on valid status update", async () => {
    const result = await updateConfigStatusAction(CONF_ID, {
      status: "IN_TECH_REVIEW",
    });
    expect(result).toEqual({ success: true, id: CONF_ID });
    expect(mockUpdateConfigStatus).toHaveBeenCalledWith(
      CONF_ID,
      { id: "user-1", role: "ENGINEER", initials: "TU" },
      { status: "IN_TECH_REVIEW" },
      mockTx,
    );
    expect(mockInsertActivityLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "CONFIG_STATUS_CHANGE",
        targetEntity: "configuration",
        targetId: CONF_ID.toString(),
        metadata: { from: "DRAFT", to: "IN_TECH_REVIEW" },
      }),
      mockTx,
    );
    const { revalidatePath } = await import("next/cache");
    expect(revalidatePath).toHaveBeenCalledWith(
      `/configurazioni/bom/${CONF_ID}`,
    );
    // The migration to revalidateConfigurationRoutes now also invalidates the
    // list and margin pages (status-gated UI) for every origin.
    expect(revalidatePath).toHaveBeenCalledWith("/configurazioni");
    expect(revalidatePath).toHaveBeenCalledWith(
      `/configurazioni/marginalita/${CONF_ID}`,
    );
    // STANDALONE origin must NOT revalidate the offer detail route.
    expect(revalidatePath).not.toHaveBeenCalledWith("/offerte/[id]", "page");
  });

  test("revalidates the offer detail route for OFFER-origin configs", async () => {
    mockUpdateConfigStatus.mockResolvedValue({
      id: CONF_ID,
      fromStatus: "SALES_APPROVED",
      origin: "OFFER",
    });
    const result = await updateConfigStatusAction(CONF_ID, {
      status: "IN_TECH_REVIEW",
    });
    expect(result).toEqual({ success: true, id: CONF_ID });
    const { revalidatePath } = await import("next/cache");
    expect(revalidatePath).toHaveBeenCalledWith("/offerte/[id]", "page");
  });

  test("returns validation error for invalid status", async () => {
    const result = await updateConfigStatusAction(CONF_ID, {
      status: "INVALID",
    });
    expect(result.success).toBe(false);
    expect(result).toHaveProperty("error");
    expect(mockUpdateConfigStatus).not.toHaveBeenCalled();
  });

  test("returns validation error when status is missing", async () => {
    const result = await updateConfigStatusAction(CONF_ID, {});
    expect(result.success).toBe(false);
    expect(mockUpdateConfigStatus).not.toHaveBeenCalled();
  });

  test("returns error when user is not authenticated", async () => {
    mockGetUserData.mockResolvedValue(null);
    const result = await updateConfigStatusAction(CONF_ID, {
      status: "IN_TECH_REVIEW",
    });
    expect(result).toEqual({
      success: false,
      error: MSG.auth.userNotAuthenticated,
    });
  });

  test("returns error on QueryError (e.g. invalid transition)", async () => {
    mockUpdateConfigStatus.mockRejectedValue(
      new QueryError("Stato non autorizzato.", 403),
    );
    const result = await updateConfigStatusAction(CONF_ID, {
      status: "IN_TECH_REVIEW",
    });
    expect(result).toEqual({
      success: false,
      error: MSG.config.statusUnauthorized,
    });
  });

  test("returns error when approving without engineering BOM", async () => {
    mockUpdateConfigStatus.mockRejectedValue(
      new QueryError(MSG.config.approvedRequiresBom, 400),
    );
    const result = await updateConfigStatusAction(CONF_ID, {
      status: "TECH_APPROVED",
    });
    expect(result).toEqual({
      success: false,
      error: MSG.config.approvedRequiresBom,
    });
  });

  test("returns error when energy chain constraint is not met", async () => {
    mockUpdateConfigStatus.mockRejectedValue(
      new QueryError(MSG.config.energyChainRequiresGantry, 400),
    );
    const result = await updateConfigStatusAction(CONF_ID, {
      status: "IN_TECH_REVIEW",
    });
    expect(result).toEqual({
      success: false,
      error: MSG.config.energyChainRequiresGantry,
    });
  });

  test("returns generic error on unknown exceptions", async () => {
    mockUpdateConfigStatus.mockRejectedValue(new TypeError("unexpected"));
    const result = await updateConfigStatusAction(CONF_ID, {
      status: "IN_TECH_REVIEW",
    });
    expect(result).toEqual({ success: false, error: MSG.db.unknown });
  });

  test("does not revalidate when audit log insert fails (CONFIG_STATUS_CHANGE rolls back)", async () => {
    mockInsertActivityLog.mockRejectedValue(
      new QueryError("audit failure", 500),
    );
    const result = await updateConfigStatusAction(CONF_ID, {
      status: "IN_TECH_REVIEW",
    });
    expect(result.success).toBe(false);
    const { revalidatePath } = await import("next/cache");
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
