// @vitest-environment node
import { beforeEach, describe, expect, test, vi } from "vitest";

// --- Mocks ---

const mockGetUserData = vi.fn();
const mockGetFullPriceCoefficientByPn = vi.fn();
const mockGetPriceCoefficientsByArray = vi.fn();
const mockCreatePriceCoefficientWithAudit = vi.fn();
const mockUpdatePriceCoefficientByPnWithAudit = vi.fn();
const mockDeletePriceCoefficientByPnWithAudit = vi.fn();
const mockResetPriceCoefficientWithAudit = vi.fn();
const mockInsertMissingMaxBomCoefficients = vi.fn();
const mockInsertActivityLog = vi.fn();

vi.mock("@/db/queries", () => ({
  getUserData: (...args: unknown[]) => mockGetUserData(...args),
  getFullPriceCoefficientByPn: (...args: unknown[]) =>
    mockGetFullPriceCoefficientByPn(...args),
  getPriceCoefficientsByArray: (...args: unknown[]) =>
    mockGetPriceCoefficientsByArray(...args),
  createPriceCoefficientWithAudit: (...args: unknown[]) =>
    mockCreatePriceCoefficientWithAudit(...args),
  updatePriceCoefficientByPnWithAudit: (...args: unknown[]) =>
    mockUpdatePriceCoefficientByPnWithAudit(...args),
  deletePriceCoefficientByPnWithAudit: (...args: unknown[]) =>
    mockDeletePriceCoefficientByPnWithAudit(...args),
  resetPriceCoefficientWithAudit: (...args: unknown[]) =>
    mockResetPriceCoefficientWithAudit(...args),
  insertMissingMaxBomCoefficients: (...args: unknown[]) =>
    mockInsertMissingMaxBomCoefficients(...args),
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

vi.mock("@/db", () => ({
  db: {
    transaction: vi.fn((cb: (tx: object) => unknown) =>
      cb({ __isFakeTx: true }),
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

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

vi.mock("@/lib/pricing", () => ({
  collectMaxBomPns: () => ["ITC-A", "ITC-B", "ITC-C"],
  DEFAULT_COEFFICIENT: 3.0,
}));

import { revalidatePath } from "next/cache";
import { DatabaseError } from "pg";
import {
  createCoefficientAction,
  deleteCoefficientAction,
  resetCoefficientAction,
  syncMaxBomCoefficientsAction,
  updateCoefficientAction,
} from "@/app/actions/coefficient-actions";
import { QueryError } from "@/db/queries";
import { MSG } from "@/lib/messages";

const adminUser = { id: "admin-uuid", role: "ADMIN" as const, initials: "A" };
const engineerUser = {
  id: "eng-uuid",
  role: "ENGINEER" as const,
  initials: "E",
};

const createDatabaseError = (message: string) =>
  new DatabaseError(message, 0, "error");

beforeEach(() => {
  vi.clearAllMocks();
  mockCreatePriceCoefficientWithAudit.mockResolvedValue({
    id: 1,
    pn: "ITC-001",
  });
  mockUpdatePriceCoefficientByPnWithAudit.mockResolvedValue(undefined);
  mockDeletePriceCoefficientByPnWithAudit.mockResolvedValue(undefined);
  mockResetPriceCoefficientWithAudit.mockResolvedValue(undefined);
  mockInsertMissingMaxBomCoefficients.mockResolvedValue(2);
  mockInsertActivityLog.mockResolvedValue(undefined);
});

// ── createCoefficientAction ──────────────────────────────────────────────────

describe("createCoefficientAction", () => {
  test("rejects non-ADMIN users", async () => {
    mockGetUserData.mockResolvedValue(engineerUser);
    const result = await createCoefficientAction({
      pn: "ITC-001",
      coefficient: 2.5,
      source: "MANUAL",
    });
    expect(result.success).toBe(false);
  });

  test("rejects zero coefficient", async () => {
    mockGetUserData.mockResolvedValue(adminUser);
    const result = await createCoefficientAction({
      pn: "ITC-001",
      coefficient: 0,
      source: "MANUAL",
    });
    expect(result.success).toBe(false);
  });

  test("rejects negative coefficient", async () => {
    mockGetUserData.mockResolvedValue(adminUser);
    const result = await createCoefficientAction({
      pn: "ITC-001",
      coefficient: -1,
      source: "MANUAL",
    });
    expect(result.success).toBe(false);
  });

  test("rejects coefficient above 5", async () => {
    mockGetUserData.mockResolvedValue(adminUser);
    const result = await createCoefficientAction({
      pn: "ITC-001",
      coefficient: 5.01,
      source: "MANUAL",
    });
    expect(result.success).toBe(false);
  });

  test("calls createPriceCoefficientWithAudit with correct args", async () => {
    mockGetUserData.mockResolvedValue(adminUser);
    mockGetFullPriceCoefficientByPn.mockResolvedValue(undefined);

    const result = await createCoefficientAction({
      pn: "ITC-001",
      coefficient: 2.5,
      source: "MANUAL",
    });

    expect(result.success).toBe(true);
    expect(mockCreatePriceCoefficientWithAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        pn: "ITC-001",
        coefficient: "2.50",
        source: "MANUAL",
        is_custom: true,
        updated_by: adminUser.id,
      }),
    );
    expect(mockUpdatePriceCoefficientByPnWithAudit).not.toHaveBeenCalled();
  });

  test("rejects when PN already exists as MAXBOM", async () => {
    mockGetUserData.mockResolvedValue(adminUser);
    mockGetFullPriceCoefficientByPn.mockResolvedValue({
      pn: "ITC-001",
      coefficient: "3.00",
      source: "MAXBOM",
      is_custom: false,
    });

    const result = await createCoefficientAction({
      pn: "ITC-001",
      coefficient: 2.5,
      source: "MANUAL",
    });

    expect(result.success).toBe(false);
    expect(mockCreatePriceCoefficientWithAudit).not.toHaveBeenCalled();
  });

  test("rejects when PN already exists as MANUAL", async () => {
    mockGetUserData.mockResolvedValue(adminUser);
    mockGetFullPriceCoefficientByPn.mockResolvedValue({
      pn: "ITC-001",
      coefficient: "2.00",
      source: "MANUAL",
      is_custom: true,
    });

    const result = await createCoefficientAction({
      pn: "ITC-001",
      coefficient: 2.5,
      source: "MANUAL",
    });

    expect(result.success).toBe(false);
    expect(mockCreatePriceCoefficientWithAudit).not.toHaveBeenCalled();
  });

  test("does not revalidate when helper rejects", async () => {
    mockGetUserData.mockResolvedValue(adminUser);
    mockGetFullPriceCoefficientByPn.mockResolvedValue(undefined);
    mockCreatePriceCoefficientWithAudit.mockRejectedValue(
      new QueryError("Coefficiente non trovato.", 404),
    );
    const result = await createCoefficientAction({
      pn: "ITC-001",
      coefficient: 2.5,
      source: "MANUAL",
    });
    expect(result.success).toBe(false);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  test("returns QueryError message on QueryError", async () => {
    mockGetUserData.mockResolvedValue(adminUser);
    mockGetFullPriceCoefficientByPn.mockRejectedValue(
      new QueryError("Coefficiente non trovato.", 404),
    );
    const result = await createCoefficientAction({
      pn: "ITC-001",
      coefficient: 2.5,
      source: "MANUAL",
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe("Coefficiente non trovato.");
  });

  test("returns db error message on DatabaseError", async () => {
    mockGetUserData.mockResolvedValue(adminUser);
    mockGetFullPriceCoefficientByPn.mockRejectedValue(
      createDatabaseError("pg internal error"),
    );
    const result = await createCoefficientAction({
      pn: "ITC-001",
      coefficient: 2.5,
      source: "MANUAL",
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe(MSG.db.error);
  });

  test("returns unknown error message on unexpected error", async () => {
    mockGetUserData.mockResolvedValue(adminUser);
    mockGetFullPriceCoefficientByPn.mockRejectedValue(new Error("boom"));
    const result = await createCoefficientAction({
      pn: "ITC-001",
      coefficient: 2.5,
      source: "MANUAL",
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe(MSG.db.unknown);
  });
});

// ── updateCoefficientAction ──────────────────────────────────────────────────

describe("updateCoefficientAction", () => {
  test("rejects non-ADMIN users", async () => {
    mockGetUserData.mockResolvedValue(engineerUser);
    const result = await updateCoefficientAction({
      pn: "ITC-001",
      coefficient: 2.5,
    });
    expect(result.success).toBe(false);
  });

  test("rejects zero coefficient", async () => {
    mockGetUserData.mockResolvedValue(adminUser);
    const result = await updateCoefficientAction({
      pn: "ITC-001",
      coefficient: 0,
    });
    expect(result.success).toBe(false);
  });

  test("rejects coefficient above 5", async () => {
    mockGetUserData.mockResolvedValue(adminUser);
    const result = await updateCoefficientAction({
      pn: "ITC-001",
      coefficient: 6,
    });
    expect(result.success).toBe(false);
  });

  test("rejects when PN does not exist", async () => {
    mockGetUserData.mockResolvedValue(adminUser);
    mockGetFullPriceCoefficientByPn.mockResolvedValue(undefined);

    const result = await updateCoefficientAction({
      pn: "ITC-GHOST",
      coefficient: 2.5,
    });
    expect(result.success).toBe(false);
    expect(mockUpdatePriceCoefficientByPnWithAudit).not.toHaveBeenCalled();
  });

  test("calls updatePriceCoefficientByPnWithAudit with correct args", async () => {
    mockGetUserData.mockResolvedValue(adminUser);
    mockGetFullPriceCoefficientByPn.mockResolvedValue({
      pn: "ITC-001",
      coefficient: "3.00",
      source: "MAXBOM",
      is_custom: false,
    });

    const result = await updateCoefficientAction({
      pn: "ITC-001",
      coefficient: 2.0,
    });

    expect(result.success).toBe(true);
    expect(mockUpdatePriceCoefficientByPnWithAudit).toHaveBeenCalledWith({
      pn: "ITC-001",
      coefficient: "2.00",
      updated_by: adminUser.id,
    });
    expect(mockCreatePriceCoefficientWithAudit).not.toHaveBeenCalled();
  });

  test("does not revalidate when helper rejects (audit failure rolls back)", async () => {
    mockGetUserData.mockResolvedValue(adminUser);
    mockGetFullPriceCoefficientByPn.mockResolvedValue({
      pn: "ITC-001",
      coefficient: "3.00",
      source: "MAXBOM",
      is_custom: false,
    });
    mockUpdatePriceCoefficientByPnWithAudit.mockRejectedValue(
      new QueryError("audit failure", 500),
    );

    const result = await updateCoefficientAction({
      pn: "ITC-001",
      coefficient: 2.0,
    });

    expect(result.success).toBe(false);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  test("returns QueryError message on QueryError", async () => {
    mockGetUserData.mockResolvedValue(adminUser);
    mockGetFullPriceCoefficientByPn.mockRejectedValue(
      new QueryError("Coefficiente non trovato.", 404),
    );
    const result = await updateCoefficientAction({
      pn: "ITC-001",
      coefficient: 2.5,
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe("Coefficiente non trovato.");
  });

  test("returns db error message on DatabaseError", async () => {
    mockGetUserData.mockResolvedValue(adminUser);
    mockGetFullPriceCoefficientByPn.mockRejectedValue(
      createDatabaseError("pg internal error"),
    );
    const result = await updateCoefficientAction({
      pn: "ITC-001",
      coefficient: 2.5,
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe(MSG.db.error);
  });

  test("returns unknown error message on unexpected error", async () => {
    mockGetUserData.mockResolvedValue(adminUser);
    mockGetFullPriceCoefficientByPn.mockRejectedValue(new Error("boom"));
    const result = await updateCoefficientAction({
      pn: "ITC-001",
      coefficient: 2.5,
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe(MSG.db.unknown);
  });
});

// ── deleteCoefficientAction ──────────────────────────────────────────────────

describe("deleteCoefficientAction", () => {
  test("rejects non-ADMIN users", async () => {
    mockGetUserData.mockResolvedValue(engineerUser);
    const result = await deleteCoefficientAction("ITC-001");
    expect(result.success).toBe(false);
  });

  test("rejects empty pn before touching the DB", async () => {
    mockGetUserData.mockResolvedValue(adminUser);
    const result = await deleteCoefficientAction("");
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe(MSG.coefficient.invalidPn);
    expect(mockGetFullPriceCoefficientByPn).not.toHaveBeenCalled();
    expect(mockDeletePriceCoefficientByPnWithAudit).not.toHaveBeenCalled();
  });

  test("rejects pn longer than 25 chars before touching the DB", async () => {
    mockGetUserData.mockResolvedValue(adminUser);
    const result = await deleteCoefficientAction("X".repeat(26));
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe(MSG.coefficient.invalidPn);
    expect(mockGetFullPriceCoefficientByPn).not.toHaveBeenCalled();
    expect(mockDeletePriceCoefficientByPnWithAudit).not.toHaveBeenCalled();
  });

  test("rejects deletion of active MAXBOM rows", async () => {
    mockGetUserData.mockResolvedValue(adminUser);
    mockGetFullPriceCoefficientByPn.mockResolvedValue({
      pn: "ITC-A",
      coefficient: "3.00",
      source: "MAXBOM",
      is_custom: false,
    });

    const result = await deleteCoefficientAction("ITC-A");
    expect(result.success).toBe(false);
    expect(mockDeletePriceCoefficientByPnWithAudit).not.toHaveBeenCalled();
  });

  test("allows deletion of orphan MAXBOM rows", async () => {
    mockGetUserData.mockResolvedValue(adminUser);
    mockGetFullPriceCoefficientByPn.mockResolvedValue({
      pn: "ITC-001",
      coefficient: "3.00",
      source: "MAXBOM",
      is_custom: false,
    });

    const result = await deleteCoefficientAction("ITC-001");
    expect(result.success).toBe(true);
    expect(mockDeletePriceCoefficientByPnWithAudit).toHaveBeenCalledWith({
      pn: "ITC-001",
      updated_by: adminUser.id,
    });
  });

  test("allows deletion of MANUAL rows", async () => {
    mockGetUserData.mockResolvedValue(adminUser);
    mockGetFullPriceCoefficientByPn.mockResolvedValue({
      pn: "ITC-CUSTOM",
      coefficient: "1.50",
      source: "MANUAL",
      is_custom: true,
    });

    const result = await deleteCoefficientAction("ITC-CUSTOM");
    expect(result.success).toBe(true);
    expect(mockDeletePriceCoefficientByPnWithAudit).toHaveBeenCalledWith({
      pn: "ITC-CUSTOM",
      updated_by: adminUser.id,
    });
  });

  test("returns notFound when row missing", async () => {
    mockGetUserData.mockResolvedValue(adminUser);
    mockGetFullPriceCoefficientByPn.mockResolvedValue(undefined);
    const result = await deleteCoefficientAction("ITC-GHOST");
    expect(result.success).toBe(false);
  });

  test("returns QueryError message on QueryError", async () => {
    mockGetUserData.mockResolvedValue(adminUser);
    mockGetFullPriceCoefficientByPn.mockRejectedValue(
      new QueryError("Coefficiente non trovato.", 404),
    );
    const result = await deleteCoefficientAction("ITC-001");
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe("Coefficiente non trovato.");
  });

  test("returns db error message on DatabaseError", async () => {
    mockGetUserData.mockResolvedValue(adminUser);
    mockGetFullPriceCoefficientByPn.mockRejectedValue(
      createDatabaseError("pg internal error"),
    );
    const result = await deleteCoefficientAction("ITC-001");
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe(MSG.db.error);
  });

  test("returns unknown error message on unexpected error", async () => {
    mockGetUserData.mockResolvedValue(adminUser);
    mockGetFullPriceCoefficientByPn.mockRejectedValue(new Error("boom"));
    const result = await deleteCoefficientAction("ITC-001");
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe(MSG.db.unknown);
  });
});

// ── resetCoefficientAction ──────────────────────────────────────────────────

describe("resetCoefficientAction", () => {
  test("rejects non-ADMIN users", async () => {
    mockGetUserData.mockResolvedValue(engineerUser);
    const result = await resetCoefficientAction("ITC-001");
    expect(result.success).toBe(false);
  });

  test("rejects empty pn before touching the DB", async () => {
    mockGetUserData.mockResolvedValue(adminUser);
    const result = await resetCoefficientAction("");
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe(MSG.coefficient.invalidPn);
    expect(mockGetFullPriceCoefficientByPn).not.toHaveBeenCalled();
    expect(mockResetPriceCoefficientWithAudit).not.toHaveBeenCalled();
  });

  test("rejects pn longer than 25 chars before touching the DB", async () => {
    mockGetUserData.mockResolvedValue(adminUser);
    const result = await resetCoefficientAction("X".repeat(26));
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe(MSG.coefficient.invalidPn);
    expect(mockGetFullPriceCoefficientByPn).not.toHaveBeenCalled();
    expect(mockResetPriceCoefficientWithAudit).not.toHaveBeenCalled();
  });

  test("rejects reset of MANUAL rows", async () => {
    mockGetUserData.mockResolvedValue(adminUser);
    mockGetFullPriceCoefficientByPn.mockResolvedValue({
      pn: "ITC-CUSTOM",
      coefficient: "1.50",
      source: "MANUAL",
      is_custom: true,
    });

    const result = await resetCoefficientAction("ITC-CUSTOM");
    expect(result.success).toBe(false);
    expect(mockResetPriceCoefficientWithAudit).not.toHaveBeenCalled();
  });

  test("calls resetPriceCoefficientWithAudit with correct args", async () => {
    mockGetUserData.mockResolvedValue(adminUser);
    mockGetFullPriceCoefficientByPn.mockResolvedValue({
      pn: "ITC-001",
      coefficient: "2.00",
      source: "MAXBOM",
      is_custom: true,
    });

    const result = await resetCoefficientAction("ITC-001");
    expect(result.success).toBe(true);
    expect(mockResetPriceCoefficientWithAudit).toHaveBeenCalledWith({
      pn: "ITC-001",
      defaultCoefficient: "3.00",
      updated_by: adminUser.id,
    });
  });

  test("returns QueryError message on QueryError", async () => {
    mockGetUserData.mockResolvedValue(adminUser);
    mockGetFullPriceCoefficientByPn.mockRejectedValue(
      new QueryError("Coefficiente non trovato.", 404),
    );
    const result = await resetCoefficientAction("ITC-001");
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe("Coefficiente non trovato.");
  });

  test("returns db error message on DatabaseError", async () => {
    mockGetUserData.mockResolvedValue(adminUser);
    mockGetFullPriceCoefficientByPn.mockRejectedValue(
      createDatabaseError("pg internal error"),
    );
    const result = await resetCoefficientAction("ITC-001");
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe(MSG.db.error);
  });

  test("returns unknown error message on unexpected error", async () => {
    mockGetUserData.mockResolvedValue(adminUser);
    mockGetFullPriceCoefficientByPn.mockRejectedValue(new Error("boom"));
    const result = await resetCoefficientAction("ITC-001");
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe(MSG.db.unknown);
  });
});

// ── syncMaxBomCoefficientsAction ────────────────────────────────────────────

describe("syncMaxBomCoefficientsAction", () => {
  test("rejects non-ADMIN users", async () => {
    mockGetUserData.mockResolvedValue(engineerUser);
    const result = await syncMaxBomCoefficientsAction();
    expect(result.success).toBe(false);
  });

  test("inserts only missing MaxBOM PNs and logs activity inside transaction", async () => {
    mockGetUserData.mockResolvedValue(adminUser);
    // ITC-A and ITC-B already exist; ITC-C is missing
    mockGetPriceCoefficientsByArray.mockResolvedValue([
      { pn: "ITC-A", coefficient: "3.00" },
      { pn: "ITC-B", coefficient: "2.50" },
    ]);
    mockInsertMissingMaxBomCoefficients.mockResolvedValue(1);

    const result = await syncMaxBomCoefficientsAction();
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.inserted).toBe(1);
    expect(mockInsertMissingMaxBomCoefficients).toHaveBeenCalledWith(
      ["ITC-C"],
      "3.00",
      expect.anything(),
    );
    expect(mockInsertActivityLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "COEFFICIENT_SYNC",
        metadata: expect.objectContaining({ inserted: 1, pns: ["ITC-C"] }),
      }),
      expect.anything(),
    );
  });

  test("does not log when nothing is inserted", async () => {
    mockGetUserData.mockResolvedValue(adminUser);
    mockGetPriceCoefficientsByArray.mockResolvedValue([
      { pn: "ITC-A", coefficient: "3.00" },
      { pn: "ITC-B", coefficient: "3.00" },
      { pn: "ITC-C", coefficient: "3.00" },
    ]);
    mockInsertMissingMaxBomCoefficients.mockResolvedValue(0);

    const result = await syncMaxBomCoefficientsAction();
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.inserted).toBe(0);
    expect(mockInsertActivityLog).not.toHaveBeenCalled();
  });

  test("returns QueryError message on QueryError", async () => {
    mockGetUserData.mockResolvedValue(adminUser);
    mockGetPriceCoefficientsByArray.mockRejectedValue(
      new QueryError("Coefficiente non trovato.", 404),
    );
    const result = await syncMaxBomCoefficientsAction();
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe("Coefficiente non trovato.");
  });

  test("returns db error message on DatabaseError", async () => {
    mockGetUserData.mockResolvedValue(adminUser);
    mockGetPriceCoefficientsByArray.mockRejectedValue(
      createDatabaseError("pg internal error"),
    );
    const result = await syncMaxBomCoefficientsAction();
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe(MSG.db.error);
  });

  test("returns unknown error message on unexpected error", async () => {
    mockGetUserData.mockResolvedValue(adminUser);
    mockGetPriceCoefficientsByArray.mockRejectedValue(new Error("boom"));
    const result = await syncMaxBomCoefficientsAction();
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe(MSG.db.unknown);
  });
});
