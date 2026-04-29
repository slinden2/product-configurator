// @vitest-environment node
import { beforeEach, describe, expect, test, vi } from "vitest";

// --- Mocks ---

const mockGetUserData = vi.fn();
const mockGetFullPriceCoefficientByPn = vi.fn();
const mockGetPriceCoefficientsByArray = vi.fn();
const mockCreatePriceCoefficient = vi.fn();
const mockUpdatePriceCoefficientByPn = vi.fn();
const mockDeletePriceCoefficientByPn = vi.fn();
const mockInsertMissingMaxBomCoefficients = vi.fn();
const mockLogActivity = vi.fn();

vi.mock("@/db/queries", () => ({
  getUserData: (...args: unknown[]) => mockGetUserData(...args),
  getFullPriceCoefficientByPn: (...args: unknown[]) =>
    mockGetFullPriceCoefficientByPn(...args),
  getPriceCoefficientsByArray: (...args: unknown[]) =>
    mockGetPriceCoefficientsByArray(...args),
  createPriceCoefficient: (...args: unknown[]) =>
    mockCreatePriceCoefficient(...args),
  updatePriceCoefficientByPn: (...args: unknown[]) =>
    mockUpdatePriceCoefficientByPn(...args),
  deletePriceCoefficientByPn: (...args: unknown[]) =>
    mockDeletePriceCoefficientByPn(...args),
  insertMissingMaxBomCoefficients: (...args: unknown[]) =>
    mockInsertMissingMaxBomCoefficients(...args),
  logActivity: (...args: unknown[]) => mockLogActivity(...args),
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

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

vi.mock("@/lib/pricing", () => ({
  collectMaxBomPns: () => ["ITC-A", "ITC-B", "ITC-C"],
  DEFAULT_COEFFICIENT: 3.0,
}));

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

beforeEach(() => {
  vi.clearAllMocks();
  mockCreatePriceCoefficient.mockResolvedValue({ id: 1, pn: "ITC-001" });
  mockUpdatePriceCoefficientByPn.mockResolvedValue({ pn: "ITC-001" });
  mockDeletePriceCoefficientByPn.mockResolvedValue({ pn: "ITC-001" });
  mockInsertMissingMaxBomCoefficients.mockResolvedValue(2);
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

  test("creates new coefficient and logs COEFFICIENT_CREATE", async () => {
    mockGetUserData.mockResolvedValue(adminUser);
    mockGetFullPriceCoefficientByPn.mockResolvedValue(undefined);

    const result = await createCoefficientAction({
      pn: "ITC-001",
      coefficient: 2.5,
      source: "MANUAL",
    });

    expect(result.success).toBe(true);
    expect(mockCreatePriceCoefficient).toHaveBeenCalledWith(
      expect.objectContaining({
        pn: "ITC-001",
        coefficient: "2.50",
        source: "MANUAL",
        is_custom: true,
      }),
    );
    expect(mockUpdatePriceCoefficientByPn).not.toHaveBeenCalled();
    expect(mockLogActivity).toHaveBeenCalledWith(
      expect.objectContaining({ action: "COEFFICIENT_CREATE" }),
    );
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
    expect(mockCreatePriceCoefficient).not.toHaveBeenCalled();
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
    expect(mockCreatePriceCoefficient).not.toHaveBeenCalled();
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
      new (DatabaseError as unknown as typeof Error)("pg internal error"),
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
    expect(mockUpdatePriceCoefficientByPn).not.toHaveBeenCalled();
  });

  test("updates existing coefficient and logs COEFFICIENT_UPDATE", async () => {
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
    expect(mockUpdatePriceCoefficientByPn).toHaveBeenCalledWith(
      expect.objectContaining({
        pn: "ITC-001",
        coefficient: "2.00",
        is_custom: true,
      }),
    );
    expect(mockCreatePriceCoefficient).not.toHaveBeenCalled();
    expect(mockLogActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "COEFFICIENT_UPDATE",
        metadata: expect.objectContaining({ old_value: "3.00" }),
      }),
    );
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
      new (DatabaseError as unknown as typeof Error)("pg internal error"),
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
    expect(mockDeletePriceCoefficientByPn).not.toHaveBeenCalled();
  });

  test("allows deletion of orphan MAXBOM rows", async () => {
    mockGetUserData.mockResolvedValue(adminUser);
    mockGetFullPriceCoefficientByPn.mockResolvedValue({
      pn: "ITC-001",
      coefficient: "3.00",
      source: "MAXBOM",
      is_custom: false,
    });
    mockDeletePriceCoefficientByPn.mockResolvedValue({ pn: "ITC-001" });

    const result = await deleteCoefficientAction("ITC-001");
    expect(result.success).toBe(true);
    expect(mockDeletePriceCoefficientByPn).toHaveBeenCalledWith("ITC-001");
    expect(mockLogActivity).toHaveBeenCalledWith(
      expect.objectContaining({ action: "COEFFICIENT_DELETE" }),
    );
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
    expect(mockDeletePriceCoefficientByPn).toHaveBeenCalledWith("ITC-CUSTOM");
    expect(mockLogActivity).toHaveBeenCalledWith(
      expect.objectContaining({ action: "COEFFICIENT_DELETE" }),
    );
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
      new (DatabaseError as unknown as typeof Error)("pg internal error"),
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
    expect(mockUpdatePriceCoefficientByPn).not.toHaveBeenCalled();
  });

  test("resets MAXBOM row to default and flips is_custom to false", async () => {
    mockGetUserData.mockResolvedValue(adminUser);
    mockGetFullPriceCoefficientByPn.mockResolvedValue({
      pn: "ITC-001",
      coefficient: "2.00",
      source: "MAXBOM",
      is_custom: true,
    });

    const result = await resetCoefficientAction("ITC-001");
    expect(result.success).toBe(true);
    expect(mockUpdatePriceCoefficientByPn).toHaveBeenCalledWith(
      expect.objectContaining({
        pn: "ITC-001",
        coefficient: "3.00",
        is_custom: false,
      }),
    );
    expect(mockLogActivity).toHaveBeenCalledWith(
      expect.objectContaining({ action: "COEFFICIENT_RESET" }),
    );
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
      new (DatabaseError as unknown as typeof Error)("pg internal error"),
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

  test("inserts only missing MaxBOM PNs", async () => {
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
    );
    expect(mockLogActivity).toHaveBeenCalledWith(
      expect.objectContaining({ action: "COEFFICIENT_SYNC" }),
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
    expect(mockLogActivity).not.toHaveBeenCalled();
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
      new (DatabaseError as unknown as typeof Error)("pg internal error"),
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
