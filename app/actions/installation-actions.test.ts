// @vitest-environment node
import { beforeEach, describe, expect, test, vi } from "vitest";

// --- Mocks ---

const mockGetUserData = vi.fn();
const mockUpdateInstallationItemSettingWithAudit = vi.fn();

vi.mock("@/db/queries", () => ({
  getUserData: (...args: unknown[]) => mockGetUserData(...args),
  updateInstallationItemSettingWithAudit: (...args: unknown[]) =>
    mockUpdateInstallationItemSettingWithAudit(...args),
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
import { updateInstallationItemSettingAction } from "@/app/actions/installation-actions";
import { QueryError } from "@/db/queries";
import { MSG } from "@/lib/messages";

const adminUser = { id: "admin-uuid", role: "ADMIN" as const, initials: "A" };
const salesUser = { id: "sales-uuid", role: "SALES" as const, initials: "S" };

const createDatabaseError = (message: string) =>
  new DatabaseError(message, 0, "error");

beforeEach(() => {
  vi.clearAllMocks();
  mockUpdateInstallationItemSettingWithAudit.mockResolvedValue(undefined);
});

// ── updateInstallationItemSettingAction ──────────────────────────────────────

describe("updateInstallationItemSettingAction", () => {
  test("rejects unauthenticated users", async () => {
    mockGetUserData.mockResolvedValue(null);
    const result = await updateInstallationItemSettingAction({
      kind: "BASE_SYSTEM",
      price: 1200,
    });
    expect(result.success).toBe(false);
  });

  test("rejects non-ADMIN users", async () => {
    mockGetUserData.mockResolvedValue(salesUser);
    const result = await updateInstallationItemSettingAction({
      kind: "BASE_SYSTEM",
      price: 1200,
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe(MSG.installation.adminOnly);
  });

  test("accepts zero price (item not yet priced)", async () => {
    mockGetUserData.mockResolvedValue(adminUser);
    const result = await updateInstallationItemSettingAction({
      kind: "BASE_SYSTEM",
      price: 0,
    });
    expect(result.success).toBe(true);
    expect(mockUpdateInstallationItemSettingWithAudit).toHaveBeenCalledWith({
      kind: "BASE_SYSTEM",
      price: "0.00",
      updated_by: adminUser.id,
    });
  });

  test("rejects negative price", async () => {
    mockGetUserData.mockResolvedValue(adminUser);
    const result = await updateInstallationItemSettingAction({
      kind: "BASE_SYSTEM",
      price: -100,
    });
    expect(result.success).toBe(false);
  });

  test("rejects non-numeric price string", async () => {
    mockGetUserData.mockResolvedValue(adminUser);
    const result = await updateInstallationItemSettingAction({
      kind: "BASE_SYSTEM",
      price: "abc",
    });
    expect(result.success).toBe(false);
  });

  test("rejects unknown kind", async () => {
    mockGetUserData.mockResolvedValue(adminUser);
    const result = await updateInstallationItemSettingAction({
      // @ts-expect-error intentionally invalid kind
      kind: "NOT_A_KIND",
      price: 100,
    });
    expect(result.success).toBe(false);
  });

  test("calls updateInstallationItemSettingWithAudit with correct args and revalidates", async () => {
    mockGetUserData.mockResolvedValue(adminUser);

    const result = await updateInstallationItemSettingAction({
      kind: "HP_ROOF_BAR",
      price: 1800,
    });

    expect(result.success).toBe(true);
    expect(mockUpdateInstallationItemSettingWithAudit).toHaveBeenCalledWith({
      kind: "HP_ROOF_BAR",
      price: "1800.00",
      updated_by: adminUser.id,
    });
    expect(revalidatePath).toHaveBeenCalledWith("/gestione/installazione");
  });

  test("returns QueryError message when transaction fails with QueryError", async () => {
    mockGetUserData.mockResolvedValue(adminUser);
    mockUpdateInstallationItemSettingWithAudit.mockRejectedValue(
      new QueryError("Voce di installazione non trovata."),
    );

    const result = await updateInstallationItemSettingAction({
      kind: "BASE_SYSTEM",
      price: 1800,
    });

    expect(result.success).toBe(false);
    if (!result.success)
      expect(result.error).toBe("Voce di installazione non trovata.");
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  test("returns db error message when transaction fails with DatabaseError", async () => {
    mockGetUserData.mockResolvedValue(adminUser);
    mockUpdateInstallationItemSettingWithAudit.mockRejectedValue(
      createDatabaseError("pg internal error"),
    );

    const result = await updateInstallationItemSettingAction({
      kind: "BASE_SYSTEM",
      price: 1800,
    });

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe(MSG.db.error);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  test("returns unknown error message on unexpected error", async () => {
    mockGetUserData.mockResolvedValue(adminUser);
    mockUpdateInstallationItemSettingWithAudit.mockRejectedValue(
      new Error("boom"),
    );

    const result = await updateInstallationItemSettingAction({
      kind: "BASE_SYSTEM",
      price: 1800,
    });

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe(MSG.db.unknown);
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
