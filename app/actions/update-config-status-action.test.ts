import { beforeEach, describe, expect, test, vi } from "vitest";

// --- Mocks ---

const mockGetUserData = vi.fn();
const mockUpdateConfigStatus = vi.fn();
const mockInsertActivityLog = vi.fn();
const mockFreezeOfferSnapshot = vi.fn();
const mockThawOfferSnapshot = vi.fn();
const mockLoadValidatedConfiguration = vi.fn();

vi.mock("@/db/queries", () => ({
  getUserData: (...args: unknown[]) => mockGetUserData(...args),
  updateConfigStatus: (...args: unknown[]) => mockUpdateConfigStatus(...args),
  insertActivityLog: (...args: unknown[]) => mockInsertActivityLog(...args),
  freezeOfferSnapshot: (...args: unknown[]) => mockFreezeOfferSnapshot(...args),
  thawOfferSnapshot: (...args: unknown[]) => mockThawOfferSnapshot(...args),
  QueryError: class QueryError extends Error {
    errorCode: number;
    constructor(message: string, errorCode: number) {
      super(message);
      this.name = "QueryError";
      this.errorCode = errorCode;
    }
  },
}));

vi.mock("@/db/load-validated-configuration", () => ({
  loadValidatedConfiguration: (...args: unknown[]) =>
    mockLoadValidatedConfiguration(...args),
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
      freezeEvent: null,
    });
    mockInsertActivityLog.mockResolvedValue(undefined);
    mockFreezeOfferSnapshot.mockResolvedValue(undefined);
    mockThawOfferSnapshot.mockResolvedValue(undefined);
    mockLoadValidatedConfiguration.mockResolvedValue({
      configuration: { name: "Test" },
      status: "SALES_APPROVED",
      waterTanks: [],
      washBays: [],
    });
  });

  test("returns success with config id on valid status update", async () => {
    const result = await updateConfigStatusAction(CONF_ID, {
      status: "IN_SALES_REVIEW",
    });
    expect(result).toEqual({ success: true, id: CONF_ID });
    expect(mockUpdateConfigStatus).toHaveBeenCalledWith(
      CONF_ID,
      { id: "user-1", role: "ENGINEER", initials: "TU" },
      { status: "IN_SALES_REVIEW" },
      mockTx,
    );
    expect(mockInsertActivityLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "CONFIG_STATUS_CHANGE",
        targetEntity: "configuration",
        targetId: CONF_ID.toString(),
        metadata: { from: "DRAFT", to: "IN_SALES_REVIEW" },
      }),
      mockTx,
    );
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
      status: "IN_SALES_REVIEW",
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

  test("returns error when submitting for sales review without an offer", async () => {
    mockUpdateConfigStatus.mockRejectedValue(
      new QueryError(MSG.config.salesReviewRequiresOffer, 400),
    );
    const result = await updateConfigStatusAction(CONF_ID, {
      status: "IN_SALES_REVIEW",
    });
    expect(result).toEqual({
      success: false,
      error: MSG.config.salesReviewRequiresOffer,
    });
  });

  test("returns error when approving without an offer to freeze", async () => {
    mockUpdateConfigStatus.mockRejectedValue(
      new QueryError(MSG.config.salesApprovedRequiresOffer, 400),
    );
    const result = await updateConfigStatusAction(CONF_ID, {
      status: "SALES_APPROVED",
    });
    expect(result).toEqual({
      success: false,
      error: MSG.config.salesApprovedRequiresOffer,
    });
  });

  test("freezes the offer with the as-sold snapshot on approval", async () => {
    mockUpdateConfigStatus.mockResolvedValue({
      id: CONF_ID,
      fromStatus: "IN_SALES_REVIEW",
      freezeEvent: "freeze",
    });
    const result = await updateConfigStatusAction(CONF_ID, {
      status: "SALES_APPROVED",
    });
    expect(result.success).toBe(true);
    expect(mockLoadValidatedConfiguration).toHaveBeenCalledWith(CONF_ID, {
      id: "user-1",
      role: "ENGINEER",
      initials: "TU",
    });
    expect(mockFreezeOfferSnapshot).toHaveBeenCalledWith(
      CONF_ID,
      { configuration: { name: "Test" }, waterTanks: [], washBays: [] },
      "user-1",
      mockTx,
    );
    expect(mockThawOfferSnapshot).not.toHaveBeenCalled();
  });

  test("thaws the offer on un-approval", async () => {
    mockUpdateConfigStatus.mockResolvedValue({
      id: CONF_ID,
      fromStatus: "SALES_APPROVED",
      freezeEvent: "thaw",
    });
    const result = await updateConfigStatusAction(CONF_ID, {
      status: "IN_SALES_REVIEW",
    });
    expect(result.success).toBe(true);
    expect(mockThawOfferSnapshot).toHaveBeenCalledWith(
      CONF_ID,
      "user-1",
      mockTx,
    );
    expect(mockFreezeOfferSnapshot).not.toHaveBeenCalled();
  });

  test("returns error when energy chain constraint is not met", async () => {
    mockUpdateConfigStatus.mockRejectedValue(
      new QueryError(MSG.config.energyChainRequiresGantry, 400),
    );
    const result = await updateConfigStatusAction(CONF_ID, {
      status: "IN_SALES_REVIEW",
    });
    expect(result).toEqual({
      success: false,
      error: MSG.config.energyChainRequiresGantry,
    });
  });

  test("returns generic error on unknown exceptions", async () => {
    mockUpdateConfigStatus.mockRejectedValue(new TypeError("unexpected"));
    const result = await updateConfigStatusAction(CONF_ID, {
      status: "IN_SALES_REVIEW",
    });
    expect(result).toEqual({ success: false, error: MSG.db.unknown });
  });

  test("does not revalidate when audit log insert fails (CONFIG_STATUS_CHANGE rolls back)", async () => {
    mockInsertActivityLog.mockRejectedValue(
      new QueryError("audit failure", 500),
    );
    const result = await updateConfigStatusAction(CONF_ID, {
      status: "IN_SALES_REVIEW",
    });
    expect(result.success).toBe(false);
    const { revalidatePath } = await import("next/cache");
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
