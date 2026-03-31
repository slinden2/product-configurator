import { describe, test, expect, vi, beforeEach } from "vitest";

// --- Mocks ---

const mockGetUserData = vi.fn();
const mockUpdateConfigStatus = vi.fn();

vi.mock("@/db/queries", () => ({
  getUserData: (...args: unknown[]) => mockGetUserData(...args),
  updateConfigStatus: (...args: unknown[]) => mockUpdateConfigStatus(...args),
  QueryError: class QueryError extends Error {
    errorCode: number;
    constructor(message: string, errorCode: number) {
      super(message);
      this.name = "QueryError";
      this.errorCode = errorCode;
    }
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
    mockUpdateConfigStatus.mockResolvedValue({ id: CONF_ID });
  });

  test("returns success with config id on valid status update", async () => {
    const result = await updateConfigStatusAction(CONF_ID, {
      status: "SUBMITTED",
    });
    expect(result).toEqual({ success: true, id: CONF_ID });
    expect(mockUpdateConfigStatus).toHaveBeenCalledWith(
      CONF_ID,
      { id: "user-1", role: "ENGINEER", initials: "TU" },
      { status: "SUBMITTED" },
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
      status: "SUBMITTED",
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
      status: "IN_REVIEW",
    });
    expect(result).toEqual({
      success: false,
      error: MSG.config.statusUnauthorized,
    });
  });

  test("returns error when energy chain constraint is not met", async () => {
    mockUpdateConfigStatus.mockRejectedValue(
      new QueryError(MSG.config.energyChainRequiresGantry, 400),
    );
    const result = await updateConfigStatusAction(CONF_ID, {
      status: "SUBMITTED",
    });
    expect(result).toEqual({
      success: false,
      error: MSG.config.energyChainRequiresGantry,
    });
  });

  test("returns generic error on unknown exceptions", async () => {
    mockUpdateConfigStatus.mockRejectedValue(new TypeError("unexpected"));
    const result = await updateConfigStatusAction(CONF_ID, {
      status: "SUBMITTED",
    });
    expect(result).toEqual({ success: false, error: MSG.db.unknown });
  });
});
