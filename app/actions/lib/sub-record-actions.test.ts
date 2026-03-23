import { describe, test, expect, vi, beforeEach } from "vitest";
import { z } from "zod";

// --- Mocks ---

const mockGetUserData = vi.fn();
const mockGetConfiguration = vi.fn();
const mockHasEngineeringBom = vi.fn();
const mockDeleteAllEngineeringBomItems = vi.fn();
const mockTouchConfigurationUpdatedAt = vi.fn();

vi.mock("@/db/queries", () => ({
  getUserData: (...args: unknown[]) => mockGetUserData(...args),
  getConfiguration: (...args: unknown[]) => mockGetConfiguration(...args),
  hasEngineeringBom: (...args: unknown[]) => mockHasEngineeringBom(...args),
  deleteAllEngineeringBomItems: (...args: unknown[]) =>
    mockDeleteAllEngineeringBomItems(...args),
  touchConfigurationUpdatedAt: (...args: unknown[]) =>
    mockTouchConfigurationUpdatedAt(...args),
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
import { MSG } from "@/lib/messages";

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

function insertOptions(overrides: Record<string, unknown> = {}) {
  return {
    actionType: "insert" as const,
    parentId: PARENT_ID,
    formData: { value: "test" },
    schema: testSchema,
    queryFn: vi.fn().mockResolvedValue({ success: true, id: { id: 99 } }),
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
      role: "ENGINEER",
      initials: "TU",
    });
    mockGetConfiguration.mockResolvedValue(mockConfig());
    mockHasEngineeringBom.mockResolvedValue(false);
    mockDeleteAllEngineeringBomItems.mockResolvedValue(undefined);
    mockTouchConfigurationUpdatedAt.mockResolvedValue(undefined);
  });

  // --- Insert ---

  test("insert: succeeds with valid data", async () => {
    const queryFn = vi
      .fn()
      .mockResolvedValue({ success: true, id: { id: 99 } });
    const result = await handleSubRecordAction(insertOptions({ queryFn }));
    expect(result).toEqual({
      success: true,
      data: { success: true, id: { id: 99 } },
    });
    expect(queryFn).toHaveBeenCalledWith(PARENT_ID, { value: "test" });
  });

  test("insert: returns error on invalid form data", async () => {
    const result = await handleSubRecordAction(
      insertOptions({ formData: { value: "" } })
    );
    expect(result.success).toBe(false);
  });

  // --- Edit ---

  test("edit: succeeds with valid data", async () => {
    const queryFn = vi
      .fn()
      .mockResolvedValue({ success: true, id: { id: RECORD_ID } });
    const result = await handleSubRecordAction({
      actionType: "edit",
      parentId: PARENT_ID,
      recordId: RECORD_ID,
      formData: { value: "test" },
      schema: testSchema,
      queryFn,
      revalidatePathStr: `/configurations/edit/${PARENT_ID}`,
      entityName: "TestEntity",
    });
    expect(result).toEqual({
      success: true,
      data: { success: true, id: { id: RECORD_ID } },
    });
    expect(queryFn).toHaveBeenCalledWith(PARENT_ID, RECORD_ID, {
      value: "test",
    });
  });

  // --- Delete ---

  test("delete: succeeds", async () => {
    const queryFn = vi
      .fn()
      .mockResolvedValue({ success: true, id: { id: RECORD_ID } });
    const result = await handleSubRecordAction({
      actionType: "delete",
      parentId: PARENT_ID,
      recordId: RECORD_ID,
      queryFn,
      revalidatePathStr: `/configurations/edit/${PARENT_ID}`,
      entityName: "TestEntity",
    });
    expect(result).toEqual({
      success: true,
      data: { success: true, id: { id: RECORD_ID } },
    });
    expect(queryFn).toHaveBeenCalledWith(PARENT_ID, RECORD_ID);
  });

  // --- Auth ---

  test("returns error when user is not authenticated", async () => {
    mockGetUserData.mockResolvedValue(null);
    const result = await handleSubRecordAction(insertOptions());
    expect(result).toEqual({
      success: false,
      error: MSG.auth.userNotAuthenticated,
    });
  });

  test("returns error when configuration not found", async () => {
    mockGetConfiguration.mockResolvedValue(undefined);
    const result = await handleSubRecordAction(insertOptions());
    expect(result).toEqual({
      success: false,
      error: MSG.config.associatedNotFound,
    });
  });

  test("returns error when SALES user tries to modify another's config", async () => {
    mockGetUserData.mockResolvedValue({
      id: "other-user",
      role: "SALES",
      initials: "OU",
    });
    const result = await handleSubRecordAction(insertOptions());
    expect(result).toEqual({
      success: false,
      error: MSG.auth.unauthorizedSubRecord,
    });
  });

  test("ENGINEER user can modify another user's config", async () => {
    mockGetUserData.mockResolvedValue({
      id: "engineer-user",
      role: "ENGINEER",
      initials: "IU",
    });
    const queryFn = vi
      .fn()
      .mockResolvedValue({ success: true, id: { id: 99 } });
    const result = await handleSubRecordAction(insertOptions({ queryFn }));
    expect(result.success).toBe(true);
  });

  // --- Status protection ---

  test("returns error when config is APPROVED", async () => {
    mockGetConfiguration.mockResolvedValue(mockConfig({ status: "APPROVED" }));
    const result = await handleSubRecordAction(insertOptions());
    expect(result).toEqual({
      success: false,
      error: MSG.config.cannotEditSubRecord,
    });
  });

  test("returns error when config is CLOSED", async () => {
    mockGetConfiguration.mockResolvedValue(mockConfig({ status: "CLOSED" }));
    const result = await handleSubRecordAction(insertOptions());
    expect(result).toEqual({
      success: false,
      error: MSG.config.cannotEditSubRecord,
    });
  });

  test("SALES cannot modify sub-records of SUBMITTED config", async () => {
    mockGetUserData.mockResolvedValue({
      id: OWNER_ID,
      role: "SALES",
      initials: "EX",
    });
    mockGetConfiguration.mockResolvedValue(mockConfig({ status: "SUBMITTED" }));
    const result = await handleSubRecordAction(insertOptions());
    expect(result).toEqual({
      success: false,
      error: MSG.config.cannotEditSubRecord,
    });
  });

  // --- Engineering BOM auto-invalidation ---

  test("deletes engineering BOM when it exists after successful insert", async () => {
    mockHasEngineeringBom.mockResolvedValue(true);
    await handleSubRecordAction(insertOptions());
    expect(mockDeleteAllEngineeringBomItems).toHaveBeenCalledWith(PARENT_ID);
  });

  test("does NOT delete engineering BOM when it does not exist", async () => {
    mockHasEngineeringBom.mockResolvedValue(false);
    await handleSubRecordAction(insertOptions());
    expect(mockDeleteAllEngineeringBomItems).not.toHaveBeenCalled();
  });

  test("deletes engineering BOM after successful edit", async () => {
    mockHasEngineeringBom.mockResolvedValue(true);
    const queryFn = vi
      .fn()
      .mockResolvedValue({ success: true, id: { id: RECORD_ID } });
    await handleSubRecordAction({
      actionType: "edit",
      parentId: PARENT_ID,
      recordId: RECORD_ID,
      formData: { value: "test" },
      schema: testSchema,
      queryFn,
      revalidatePathStr: `/configurations/edit/${PARENT_ID}`,
      entityName: "TestEntity",
    });
    expect(mockDeleteAllEngineeringBomItems).toHaveBeenCalledWith(PARENT_ID);
  });

  test("deletes engineering BOM after successful delete", async () => {
    mockHasEngineeringBom.mockResolvedValue(true);
    const queryFn = vi
      .fn()
      .mockResolvedValue({ success: true, id: { id: RECORD_ID } });
    await handleSubRecordAction({
      actionType: "delete",
      parentId: PARENT_ID,
      recordId: RECORD_ID,
      queryFn,
      revalidatePathStr: `/configurations/edit/${PARENT_ID}`,
      entityName: "TestEntity",
    });
    expect(mockDeleteAllEngineeringBomItems).toHaveBeenCalledWith(PARENT_ID);
  });

  // --- Parent updated_at propagation ---

  test("touches parent configuration updated_at after successful insert", async () => {
    await handleSubRecordAction(insertOptions());
    expect(mockTouchConfigurationUpdatedAt).toHaveBeenCalledWith(PARENT_ID);
  });

  test("touches parent configuration updated_at after successful edit", async () => {
    const queryFn = vi
      .fn()
      .mockResolvedValue({ success: true, id: { id: RECORD_ID } });
    await handleSubRecordAction({
      actionType: "edit",
      parentId: PARENT_ID,
      recordId: RECORD_ID,
      formData: { value: "test" },
      schema: testSchema,
      queryFn,
      revalidatePathStr: `/configurations/edit/${PARENT_ID}`,
      entityName: "TestEntity",
    });
    expect(mockTouchConfigurationUpdatedAt).toHaveBeenCalledWith(PARENT_ID);
  });

  test("touches parent configuration updated_at after successful delete", async () => {
    const queryFn = vi
      .fn()
      .mockResolvedValue({ success: true, id: { id: RECORD_ID } });
    await handleSubRecordAction({
      actionType: "delete",
      parentId: PARENT_ID,
      recordId: RECORD_ID,
      queryFn,
      revalidatePathStr: `/configurations/edit/${PARENT_ID}`,
      entityName: "TestEntity",
    });
    expect(mockTouchConfigurationUpdatedAt).toHaveBeenCalledWith(PARENT_ID);
  });

  test("does NOT touch parent updated_at when validation fails", async () => {
    await handleSubRecordAction(insertOptions({ formData: { value: "" } }));
    expect(mockTouchConfigurationUpdatedAt).not.toHaveBeenCalled();
  });

  test("does NOT touch parent updated_at when auth fails", async () => {
    mockGetUserData.mockResolvedValue(null);
    await handleSubRecordAction(insertOptions());
    expect(mockTouchConfigurationUpdatedAt).not.toHaveBeenCalled();
  });

  test("does NOT touch parent updated_at when config is not editable", async () => {
    mockGetConfiguration.mockResolvedValue(mockConfig({ status: "APPROVED" }));
    await handleSubRecordAction(insertOptions());
    expect(mockTouchConfigurationUpdatedAt).not.toHaveBeenCalled();
  });

  test("revalidates BOM path after sub-record mutation", async () => {
    mockHasEngineeringBom.mockResolvedValue(true);
    await handleSubRecordAction(insertOptions());
    const { revalidatePath } = await import("next/cache");
    expect(revalidatePath).toHaveBeenCalledWith(
      `/configurations/bom/${PARENT_ID}`
    );
  });
});
