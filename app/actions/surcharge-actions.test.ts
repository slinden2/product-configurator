// @vitest-environment node
import { beforeEach, describe, expect, test, vi } from "vitest";

// --- Mocks ---

const mockGetUserData = vi.fn();
const mockUpdateSurchargeSettingWithAudit = vi.fn();

vi.mock("@/db/queries", () => ({
  getUserData: (...args: unknown[]) => mockGetUserData(...args),
  updateSurchargeSettingWithAudit: (...args: unknown[]) =>
    mockUpdateSurchargeSettingWithAudit(...args),
  QueryError: class QueryError extends Error {
    constructor(message: string) {
      super(message);
      this.name = "QueryError";
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

import { revalidatePath } from "next/cache";
import { DatabaseError } from "pg";
import { updateSurchargeSettingAction } from "@/app/actions/surcharge-actions";
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
  mockUpdateSurchargeSettingWithAudit.mockResolvedValue(undefined);
});

// ── updateSurchargeSettingAction ─────────────────────────────────────────────

describe("updateSurchargeSettingAction", () => {
  test("rejects unauthenticated users", async () => {
    mockGetUserData.mockResolvedValue(null);
    const result = await updateSurchargeSettingAction({
      kind: "HEIGHT",
      price: 1200,
    });
    expect(result.success).toBe(false);
  });

  test("rejects non-ADMIN users", async () => {
    mockGetUserData.mockResolvedValue(engineerUser);
    const result = await updateSurchargeSettingAction({
      kind: "HEIGHT",
      price: 1200,
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe(MSG.surcharge.adminOnly);
  });

  test("rejects zero price", async () => {
    mockGetUserData.mockResolvedValue(adminUser);
    const result = await updateSurchargeSettingAction({
      kind: "HEIGHT",
      price: 0,
    });
    expect(result.success).toBe(false);
  });

  test("rejects negative price", async () => {
    mockGetUserData.mockResolvedValue(adminUser);
    const result = await updateSurchargeSettingAction({
      kind: "HEIGHT",
      price: -100,
    });
    expect(result.success).toBe(false);
  });

  test("rejects non-numeric price string", async () => {
    mockGetUserData.mockResolvedValue(adminUser);
    const result = await updateSurchargeSettingAction({
      kind: "HEIGHT",
      price: "abc",
    });
    expect(result.success).toBe(false);
  });

  test("calls updateSurchargeSettingWithAudit with correct args and revalidates", async () => {
    mockGetUserData.mockResolvedValue(adminUser);

    const result = await updateSurchargeSettingAction({
      kind: "HEIGHT",
      price: 1800,
    });

    expect(result.success).toBe(true);
    expect(mockUpdateSurchargeSettingWithAudit).toHaveBeenCalledWith({
      kind: "HEIGHT",
      price: "1800.00",
      updated_by: adminUser.id,
    });
    expect(revalidatePath).toHaveBeenCalledWith("/gestione/maggiorazioni");
  });

  test("returns QueryError message when transaction fails with QueryError", async () => {
    mockGetUserData.mockResolvedValue(adminUser);
    mockUpdateSurchargeSettingWithAudit.mockRejectedValue(
      new QueryError("Maggiorazione non trovata."),
    );

    const result = await updateSurchargeSettingAction({
      kind: "HEIGHT",
      price: 1800,
    });

    expect(result.success).toBe(false);
    if (!result.success)
      expect(result.error).toBe("Maggiorazione non trovata.");
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  test("returns db error message when transaction fails with DatabaseError", async () => {
    mockGetUserData.mockResolvedValue(adminUser);
    mockUpdateSurchargeSettingWithAudit.mockRejectedValue(
      createDatabaseError("pg internal error"),
    );

    const result = await updateSurchargeSettingAction({
      kind: "HEIGHT",
      price: 1800,
    });

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe(MSG.db.error);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  test("returns unknown error message on unexpected error", async () => {
    mockGetUserData.mockResolvedValue(adminUser);
    mockUpdateSurchargeSettingWithAudit.mockRejectedValue(new Error("boom"));

    const result = await updateSurchargeSettingAction({
      kind: "HEIGHT",
      price: 1800,
    });

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe(MSG.db.unknown);
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
