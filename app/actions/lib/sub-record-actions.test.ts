import { describe, test, expect, vi, beforeEach } from "vitest";
import { z } from "zod";

// --- Mocks ---

const mockGetUserData = vi.fn();
const mockGetConfiguration = vi.fn();
const mockHasEngineeringBom = vi.fn();
const mockDeleteAllEngineeringBomItems = vi.fn();

vi.mock("@/db/queries", () => ({
  getUserData: (...args: unknown[]) => mockGetUserData(...args),
  getConfiguration: (...args: unknown[]) => mockGetConfiguration(...args),
  hasEngineeringBom: (...args: unknown[]) => mockHasEngineeringBom(...args),
  deleteAllEngineeringBomItems: (...args: unknown[]) =>
    mockDeleteAllEngineeringBomItems(...args),
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

import { handleSubRecordAction } from "@/app/actions/lib/sub-record-actions";

// --- Helpers ---

const testSchema = z.object({ value: z.string().min(1) });
const PARENT_ID = 1;
const RECORD_ID = 10;
const OWNER_ID = "owner-123";

function mockConfig(overrides: Record<string, unknown> = {}) {
  return {
    id: PARENT_ID,
    user_id: OWNER_ID,
    status: "DRAFT",
    name: "Test",
    ...overrides,
  };
}

function baseOptions(overrides: Record<string, unknown> = {}) {
  return {
    actionType: "insert" as const,
    parentId: PARENT_ID,
    formData: { value: "test" },
    schema: testSchema,
    insertQueryFn: vi.fn().mockResolvedValue({ id: 99 }),
    revalidatePathStr: `/configurations/edit/${PARENT_ID}`,
    entityName: "TestEntity",
    ...overrides,
  };
}

// --- Tests ---

describe("handleSubRecordAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUserData.mockResolvedValue({
      id: OWNER_ID,
      role: "INTERNAL",
      initials: "TU",
    });
    mockGetConfiguration.mockResolvedValue(mockConfig());
    mockHasEngineeringBom.mockResolvedValue(false);
    mockDeleteAllEngineeringBomItems.mockResolvedValue(undefined);
  });

  // --- Insert ---

  test("insert: succeeds with valid data", async () => {
    const insertFn = vi.fn().mockResolvedValue({ id: 99 });
    const result = await handleSubRecordAction(
      baseOptions({ insertQueryFn: insertFn })
    );
    expect(result).toEqual({ success: true, data: { id: 99 } });
    expect(insertFn).toHaveBeenCalledWith(PARENT_ID, { value: "test" });
  });

  test("insert: throws on invalid form data", async () => {
    await expect(
      handleSubRecordAction(baseOptions({ formData: { value: "" } }))
    ).rejects.toThrow();
  });

  test("insert: throws when schema/formData missing", async () => {
    await expect(
      handleSubRecordAction(
        baseOptions({ schema: undefined, formData: undefined })
      )
    ).rejects.toThrow("Schema and formData are required");
  });

  // --- Edit ---

  test("edit: succeeds with valid data", async () => {
    const updateFn = vi.fn().mockResolvedValue({ id: RECORD_ID });
    const result = await handleSubRecordAction(
      baseOptions({
        actionType: "edit",
        recordId: RECORD_ID,
        updateQueryFn: updateFn,
      })
    );
    expect(result).toEqual({ success: true, data: { id: RECORD_ID } });
    expect(updateFn).toHaveBeenCalledWith(PARENT_ID, RECORD_ID, {
      value: "test",
    });
  });

  test("edit: throws when recordId missing", async () => {
    await expect(
      handleSubRecordAction(
        baseOptions({
          actionType: "edit",
          updateQueryFn: vi.fn(),
        })
      )
    ).rejects.toThrow("Record ID mancante");
  });

  // --- Delete ---

  test("delete: succeeds", async () => {
    const deleteFn = vi.fn().mockResolvedValue({ success: true });
    const result = await handleSubRecordAction({
      actionType: "delete",
      parentId: PARENT_ID,
      recordId: RECORD_ID,
      deleteQueryFn: deleteFn,
      revalidatePathStr: `/configurations/edit/${PARENT_ID}`,
      entityName: "TestEntity",
    });
    expect(result).toEqual({ success: true, data: { success: true } });
    expect(deleteFn).toHaveBeenCalledWith(PARENT_ID, RECORD_ID);
  });

  test("delete: throws when deleteFn returns failure", async () => {
    const deleteFn = vi
      .fn()
      .mockResolvedValue({ success: false, error: "Not found" });
    await expect(
      handleSubRecordAction({
        actionType: "delete",
        parentId: PARENT_ID,
        recordId: RECORD_ID,
        deleteQueryFn: deleteFn,
        revalidatePathStr: `/configurations/edit/${PARENT_ID}`,
        entityName: "TestEntity",
      })
    ).rejects.toThrow("Not found");
  });

  test("delete: throws when recordId missing", async () => {
    await expect(
      handleSubRecordAction({
        actionType: "delete",
        parentId: PARENT_ID,
        deleteQueryFn: vi.fn(),
        revalidatePathStr: `/configurations/edit/${PARENT_ID}`,
        entityName: "TestEntity",
      })
    ).rejects.toThrow("Record ID mancante");
  });

  // --- Auth ---

  test("throws when user is not authenticated", async () => {
    mockGetUserData.mockResolvedValue(null);
    await expect(handleSubRecordAction(baseOptions())).rejects.toThrow(
      "Utente non trovato"
    );
  });

  test("throws when configuration not found", async () => {
    mockGetConfiguration.mockResolvedValue(undefined);
    await expect(handleSubRecordAction(baseOptions())).rejects.toThrow(
      "Configurazione associata non trovata"
    );
  });

  test("throws when EXTERNAL user tries to modify another's config", async () => {
    mockGetUserData.mockResolvedValue({
      id: "other-user",
      role: "EXTERNAL",
      initials: "OU",
    });
    await expect(handleSubRecordAction(baseOptions())).rejects.toThrow(
      "Non autorizzato"
    );
  });

  test("INTERNAL user can modify another user's config", async () => {
    mockGetUserData.mockResolvedValue({
      id: "internal-user",
      role: "INTERNAL",
      initials: "IU",
    });
    const insertFn = vi.fn().mockResolvedValue({ id: 99 });
    const result = await handleSubRecordAction(
      baseOptions({ insertQueryFn: insertFn })
    );
    expect(result.success).toBe(true);
  });

  // --- Status protection ---

  test("throws when config is LOCKED", async () => {
    mockGetConfiguration.mockResolvedValue(mockConfig({ status: "LOCKED" }));
    await expect(handleSubRecordAction(baseOptions())).rejects.toThrow(
      "Non è possibile modificare"
    );
  });

  test("throws when config is CLOSED", async () => {
    mockGetConfiguration.mockResolvedValue(mockConfig({ status: "CLOSED" }));
    await expect(handleSubRecordAction(baseOptions())).rejects.toThrow(
      "Non è possibile modificare"
    );
  });

  test("EXTERNAL cannot modify sub-records of OPEN config", async () => {
    mockGetUserData.mockResolvedValue({
      id: OWNER_ID,
      role: "EXTERNAL",
      initials: "EX",
    });
    mockGetConfiguration.mockResolvedValue(mockConfig({ status: "OPEN" }));
    await expect(handleSubRecordAction(baseOptions())).rejects.toThrow(
      "Non è possibile modificare"
    );
  });

  // --- Engineering BOM auto-invalidation ---

  test("deletes engineering BOM when it exists after successful insert", async () => {
    mockHasEngineeringBom.mockResolvedValue(true);
    const insertFn = vi.fn().mockResolvedValue({ id: 99 });
    await handleSubRecordAction(baseOptions({ insertQueryFn: insertFn }));
    expect(mockDeleteAllEngineeringBomItems).toHaveBeenCalledWith(PARENT_ID);
  });

  test("does NOT delete engineering BOM when it does not exist", async () => {
    mockHasEngineeringBom.mockResolvedValue(false);
    const insertFn = vi.fn().mockResolvedValue({ id: 99 });
    await handleSubRecordAction(baseOptions({ insertQueryFn: insertFn }));
    expect(mockDeleteAllEngineeringBomItems).not.toHaveBeenCalled();
  });

  test("deletes engineering BOM after successful edit", async () => {
    mockHasEngineeringBom.mockResolvedValue(true);
    const updateFn = vi.fn().mockResolvedValue({ id: RECORD_ID });
    await handleSubRecordAction(
      baseOptions({
        actionType: "edit",
        recordId: RECORD_ID,
        updateQueryFn: updateFn,
      })
    );
    expect(mockDeleteAllEngineeringBomItems).toHaveBeenCalledWith(PARENT_ID);
  });

  test("deletes engineering BOM after successful delete", async () => {
    mockHasEngineeringBom.mockResolvedValue(true);
    const deleteFn = vi.fn().mockResolvedValue({ success: true });
    await handleSubRecordAction({
      actionType: "delete",
      parentId: PARENT_ID,
      recordId: RECORD_ID,
      deleteQueryFn: deleteFn,
      revalidatePathStr: `/configurations/edit/${PARENT_ID}`,
      entityName: "TestEntity",
    });
    expect(mockDeleteAllEngineeringBomItems).toHaveBeenCalledWith(PARENT_ID);
  });

  test("revalidates BOM path after sub-record mutation", async () => {
    mockHasEngineeringBom.mockResolvedValue(true);
    const insertFn = vi.fn().mockResolvedValue({ id: 99 });
    await handleSubRecordAction(baseOptions({ insertQueryFn: insertFn }));
    const { revalidatePath } = await import("next/cache");
    expect(revalidatePath).toHaveBeenCalledWith(
      `/configurations/bom/${PARENT_ID}`
    );
  });
});
