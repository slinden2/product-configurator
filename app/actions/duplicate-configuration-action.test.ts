// @vitest-environment jsdom

import { beforeEach, describe, expect, test, vi } from "vitest";

// --- Mocks ---

const mockGetUserData = vi.fn();
const mockGetConfigurationWithTanksAndBays = vi.fn();
const mockDuplicateConfigurationRecord = vi.fn();

vi.mock("@/db/queries", () => ({
  getUserData: (...args: unknown[]) => mockGetUserData(...args),
  getConfigurationWithTanksAndBays: (...args: unknown[]) =>
    mockGetConfigurationWithTanksAndBays(...args),
  duplicateConfigurationRecord: (...args: unknown[]) =>
    mockDuplicateConfigurationRecord(...args),
  logActivity: vi.fn(),
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

// --- Imports (after mocks) ---

import { duplicateConfigurationAction } from "@/app/actions/duplicate-configuration-action";
import { QueryError } from "@/db/queries";
import { MSG } from "@/lib/messages";

// --- Helpers ---

function makeEngineerUser() {
  return { id: "engineer-1", role: "ENGINEER" as const, initials: "EN" };
}

function makeSalesUser(id = "sales-1") {
  return { id, role: "SALES" as const, initials: "SA" };
}

function makeSourceConfig(overrides: Record<string, unknown> = {}) {
  return {
    id: 10,
    name: "Offerta ABC",
    user_id: "sales-1",
    status: "SUBMITTED",
    water_tanks: [
      {
        id: 1,
        configuration_id: 10,
        type: "L1500",
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: 2,
        configuration_id: 10,
        type: "L3000",
        created_at: new Date(),
        updated_at: new Date(),
      },
    ],
    wash_bays: [
      {
        id: 1,
        configuration_id: 10,
        is_first_bay: true,
        has_gantry: false,
        created_at: new Date(),
        updated_at: new Date(),
      },
    ],
    ...overrides,
  };
}

// --- Tests ---

describe("duplicateConfigurationAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUserData.mockResolvedValue(makeEngineerUser());
    mockGetConfigurationWithTanksAndBays.mockResolvedValue(makeSourceConfig());
    mockDuplicateConfigurationRecord.mockResolvedValue({ id: 99 });
  });

  test("returns success with new id; passes source and user id to duplicateConfigurationRecord", async () => {
    const result = await duplicateConfigurationAction(10);

    expect(result).toEqual({ success: true, id: 99 });
    expect(mockDuplicateConfigurationRecord).toHaveBeenCalledTimes(1);
    const [sourceArg, userIdArg] =
      mockDuplicateConfigurationRecord.mock.calls[0];
    expect(sourceArg.id).toBe(10);
    expect(userIdArg).toBe("engineer-1");
  });

  test("calls logActivity with CONFIG_DUPLICATE and source metadata", async () => {
    const { logActivity } = await import("@/db/queries");
    await duplicateConfigurationAction(10);

    expect(logActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "CONFIG_DUPLICATE",
        targetId: "99",
        metadata: { source_id: 10, source_name: "Offerta ABC" },
      }),
    );
  });

  test("returns error when user is not authenticated", async () => {
    mockGetUserData.mockResolvedValue(null);

    const result = await duplicateConfigurationAction(10);

    expect(result).toEqual({
      success: false,
      error: MSG.auth.userNotAuthenticated,
    });
    expect(mockDuplicateConfigurationRecord).not.toHaveBeenCalled();
  });

  test("returns error when source config is not found", async () => {
    mockGetConfigurationWithTanksAndBays.mockResolvedValue(null);

    const result = await duplicateConfigurationAction(10);

    expect(result).toEqual({ success: false, error: MSG.config.notFound });
    expect(mockDuplicateConfigurationRecord).not.toHaveBeenCalled();
  });

  test("SALES cannot duplicate another user's config (query returns null)", async () => {
    mockGetUserData.mockResolvedValue(makeSalesUser("sales-2"));
    // getConfigurationWithTanksAndBays returns null for non-owner SALES (enforced in db/queries)
    mockGetConfigurationWithTanksAndBays.mockResolvedValue(null);

    const result = await duplicateConfigurationAction(10);

    expect(result).toEqual({ success: false, error: MSG.config.notFound });
    expect(mockDuplicateConfigurationRecord).not.toHaveBeenCalled();
  });

  test("SALES can duplicate own SUBMITTED config", async () => {
    mockGetUserData.mockResolvedValue(makeSalesUser("sales-1"));
    mockGetConfigurationWithTanksAndBays.mockResolvedValue(
      makeSourceConfig({ status: "SUBMITTED", user_id: "sales-1" }),
    );

    const result = await duplicateConfigurationAction(10);

    expect(result).toEqual({ success: true, id: 99 });
  });

  test("SALES can duplicate own APPROVED config", async () => {
    mockGetUserData.mockResolvedValue(makeSalesUser("sales-1"));
    mockGetConfigurationWithTanksAndBays.mockResolvedValue(
      makeSourceConfig({ status: "APPROVED", user_id: "sales-1" }),
    );

    const result = await duplicateConfigurationAction(10);

    expect(result).toEqual({ success: true, id: 99 });
  });

  test("returns notFound error for invalid (non-integer) sourceId", async () => {
    const result = await duplicateConfigurationAction("not-a-number");

    expect(result).toEqual({ success: false, error: MSG.config.notFound });
    expect(mockGetUserData).not.toHaveBeenCalled();
    expect(mockDuplicateConfigurationRecord).not.toHaveBeenCalled();
  });

  test("returns notFound error for negative sourceId", async () => {
    const result = await duplicateConfigurationAction(-5);

    expect(result).toEqual({ success: false, error: MSG.config.notFound });
    expect(mockDuplicateConfigurationRecord).not.toHaveBeenCalled();
  });

  test("returns QueryError message on QueryError", async () => {
    mockDuplicateConfigurationRecord.mockRejectedValue(
      new QueryError(MSG.config.duplicateFailed, 500),
    );

    const result = await duplicateConfigurationAction(10);

    expect(result).toEqual({
      success: false,
      error: MSG.config.duplicateFailed,
    });
  });

  test("returns generic db error on DatabaseError", async () => {
    const { DatabaseError } = await import("pg");
    // Cast needed: TypeScript sees real pg.DatabaseError (3-arg), mock provides 1-arg
    const DBError = DatabaseError as unknown as new (msg: string) => Error;
    mockDuplicateConfigurationRecord.mockRejectedValue(
      new DBError("connection refused"),
    );

    const result = await duplicateConfigurationAction(10);

    expect(result).toEqual({ success: false, error: MSG.db.error });
  });

  test("returns unknown error on unexpected exception", async () => {
    mockDuplicateConfigurationRecord.mockRejectedValue(
      new TypeError("unexpected"),
    );

    const result = await duplicateConfigurationAction(10);

    expect(result).toEqual({ success: false, error: MSG.db.unknown });
  });
});
