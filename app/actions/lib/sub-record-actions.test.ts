import { beforeEach, describe, expect, test, vi } from "vitest";
import { z } from "zod";
import { mockCanAccessConfiguration } from "@/test/access-mocks";

// --- Mocks ---

const mockGetUserData = vi.fn();
const mockGetConfiguration = vi.fn();
const mockHasEngineeringBom = vi.fn();
const mockDeleteAllEngineeringBomItems = vi.fn();
const mockTouchConfigurationUpdatedAt = vi.fn();
const mockRepriceOfferLine = vi.fn();
const mockGetOfferRefForConfig = vi.fn();
const mockLockOfferRow = vi.fn();
// STANDALONE configs ignore this; OFFER tests default the revision to DRAFT.
// Called twice on OFFER mutations: pre-tx gate + in-tx re-assertion under the lock.
const mockOfferRevisionStatusFor = vi.fn(
  async (..._args: unknown[]) => "DRAFT",
);

vi.mock("@/db/queries", () => ({
  getUserData: (...args: unknown[]) => mockGetUserData(...args),
  canAccessConfiguration: mockCanAccessConfiguration,
  getConfiguration: (...args: unknown[]) => mockGetConfiguration(...args),
  offerRevisionStatusFor: (...args: unknown[]) =>
    mockOfferRevisionStatusFor(...args),
  getOfferRefForConfig: (...args: unknown[]) =>
    mockGetOfferRefForConfig(...args),
  lockOfferRow: (...args: unknown[]) => mockLockOfferRow(...args),
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

vi.mock("@/lib/offer-revision-pricing", () => ({
  repriceOfferLine: (...args: unknown[]) => mockRepriceOfferLine(...args),
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

import { handleSubRecordAction } from "@/app/actions/lib/sub-record-actions";
import { QueryError } from "@/db/queries";
import { MSG } from "@/lib/messages";

// --- Helpers ---

const testSchema = z.object({ value: z.string().min(1) });
const PARENT_ID = 1;
const RECORD_ID = 10;
const OFFER_ID = 77;
const OWNER_ID = "owner-123";

function mockConfig(overrides: Record<string, unknown> = {}) {
  return {
    id: PARENT_ID,
    user_id: OWNER_ID,
    // Engineer/admin sub-record edits run on standalone configs; sales-status
    // tests override origin to OFFER.
    origin: "STANDALONE",
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
    queryFn: vi.fn().mockResolvedValue({ id: 99 }),
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
    mockRepriceOfferLine.mockResolvedValue(undefined);
    mockGetOfferRefForConfig.mockResolvedValue({
      offerId: OFFER_ID,
      offerNumber: "OFF-2026-0001",
    });
    mockLockOfferRow.mockResolvedValue(undefined);
  });

  // --- Insert ---

  test("insert: succeeds with valid data", async () => {
    const queryFn = vi.fn().mockResolvedValue({ id: 99 });
    const result = await handleSubRecordAction(insertOptions({ queryFn }));
    expect(result).toEqual({
      success: true,
      data: { id: 99 },
    });
    expect(queryFn).toHaveBeenCalledWith(PARENT_ID, { value: "test" }, mockTx);
  });

  test("insert: returns error on invalid form data", async () => {
    const result = await handleSubRecordAction(
      insertOptions({ formData: { value: "" } }),
    );
    expect(result.success).toBe(false);
  });

  // --- Edit ---

  test("edit: succeeds with valid data", async () => {
    const queryFn = vi.fn().mockResolvedValue({ id: RECORD_ID });
    const result = await handleSubRecordAction({
      actionType: "edit",
      parentId: PARENT_ID,
      recordId: RECORD_ID,
      formData: { value: "test" },
      schema: testSchema,
      queryFn,
      entityName: "TestEntity",
    });
    expect(result).toEqual({
      success: true,
      data: { id: RECORD_ID },
    });
    expect(queryFn).toHaveBeenCalledWith(
      PARENT_ID,
      RECORD_ID,
      {
        value: "test",
      },
      mockTx,
    );
  });

  // --- Delete ---

  test("delete: succeeds", async () => {
    const queryFn = vi.fn().mockResolvedValue({ id: RECORD_ID });
    const result = await handleSubRecordAction({
      actionType: "delete",
      parentId: PARENT_ID,
      recordId: RECORD_ID,
      queryFn,
      entityName: "TestEntity",
    });
    expect(result).toEqual({
      success: true,
      data: { id: RECORD_ID },
    });
    expect(queryFn).toHaveBeenCalledWith(PARENT_ID, RECORD_ID, mockTx);
  });

  test("edit: zero-row match reports failure and skips side effects", async () => {
    const queryFn = vi
      .fn()
      .mockRejectedValue(new QueryError(MSG.config.subRecordNotFound, 404));
    const result = await handleSubRecordAction({
      actionType: "edit",
      parentId: PARENT_ID,
      recordId: RECORD_ID,
      formData: { value: "test" },
      schema: testSchema,
      queryFn,
      entityName: "TestEntity",
    });
    expect(result).toEqual({
      success: false,
      error: MSG.config.subRecordNotFound,
    });
    expect(mockTouchConfigurationUpdatedAt).not.toHaveBeenCalled();
    expect(mockDeleteAllEngineeringBomItems).not.toHaveBeenCalled();
    expect(mockRepriceOfferLine).not.toHaveBeenCalled();
  });

  test("delete: zero-row match reports failure and skips side effects", async () => {
    const queryFn = vi
      .fn()
      .mockRejectedValue(new QueryError(MSG.config.subRecordNotFound, 404));
    const result = await handleSubRecordAction({
      actionType: "delete",
      parentId: PARENT_ID,
      recordId: RECORD_ID,
      queryFn,
      entityName: "TestEntity",
    });
    expect(result).toEqual({
      success: false,
      error: MSG.config.subRecordNotFound,
    });
    expect(mockTouchConfigurationUpdatedAt).not.toHaveBeenCalled();
    expect(mockDeleteAllEngineeringBomItems).not.toHaveBeenCalled();
    expect(mockRepriceOfferLine).not.toHaveBeenCalled();
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
    const queryFn = vi.fn().mockResolvedValue({ id: 99 });
    const result = await handleSubRecordAction(insertOptions({ queryFn }));
    expect(result.success).toBe(true);
  });

  // --- Status protection ---

  test("returns error when config is TECH_APPROVED", async () => {
    mockGetConfiguration.mockResolvedValue(
      mockConfig({ status: "TECH_APPROVED" }),
    );
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

  test("SALES cannot modify sub-records of a handed-off SALES_APPROVED config", async () => {
    mockGetUserData.mockResolvedValue({
      id: OWNER_ID,
      role: "SALES",
      initials: "EX",
    });
    mockGetConfiguration.mockResolvedValue(
      mockConfig({ status: "SALES_APPROVED", origin: "OFFER" }),
    );
    const result = await handleSubRecordAction(insertOptions());
    expect(result).toEqual({
      success: false,
      error: MSG.config.cannotEditSubRecord,
    });
  });

  // --- Cross-entity guard hook ---

  test("edit: guard rejection returns its error without mutating", async () => {
    const queryFn = vi.fn().mockResolvedValue({ id: RECORD_ID });
    const guard = vi.fn().mockResolvedValue("Operazione non consentita.");
    const result = await handleSubRecordAction({
      actionType: "edit",
      parentId: PARENT_ID,
      recordId: RECORD_ID,
      formData: { value: "test" },
      schema: testSchema,
      queryFn,
      entityName: "TestEntity",
      guard,
    });
    expect(result).toEqual({
      success: false,
      error: "Operazione non consentita.",
    });
    expect(guard).toHaveBeenCalledWith(mockConfig(), { value: "test" });
    expect(queryFn).not.toHaveBeenCalled();
    expect(mockTouchConfigurationUpdatedAt).not.toHaveBeenCalled();
    expect(mockDeleteAllEngineeringBomItems).not.toHaveBeenCalled();
  });

  test("delete: guard rejection returns its error without mutating", async () => {
    const queryFn = vi.fn().mockResolvedValue({ id: RECORD_ID });
    const guard = vi.fn().mockResolvedValue("Operazione non consentita.");
    const result = await handleSubRecordAction({
      actionType: "delete",
      parentId: PARENT_ID,
      recordId: RECORD_ID,
      queryFn,
      entityName: "TestEntity",
      guard,
    });
    expect(result).toEqual({
      success: false,
      error: "Operazione non consentita.",
    });
    expect(guard).toHaveBeenCalledWith(mockConfig());
    expect(queryFn).not.toHaveBeenCalled();
    expect(mockTouchConfigurationUpdatedAt).not.toHaveBeenCalled();
  });

  test("edit: guard returning null lets the mutation proceed", async () => {
    const queryFn = vi.fn().mockResolvedValue({ id: RECORD_ID });
    const guard = vi.fn().mockResolvedValue(null);
    const result = await handleSubRecordAction({
      actionType: "edit",
      parentId: PARENT_ID,
      recordId: RECORD_ID,
      formData: { value: "test" },
      schema: testSchema,
      queryFn,
      entityName: "TestEntity",
      guard,
    });
    expect(result.success).toBe(true);
    expect(queryFn).toHaveBeenCalled();
  });

  test("guard runs only after auth and status checks", async () => {
    const guard = vi.fn().mockResolvedValue("blocked");
    mockGetConfiguration.mockResolvedValue(
      mockConfig({ status: "TECH_APPROVED" }),
    );
    const result = await handleSubRecordAction({
      actionType: "delete",
      parentId: PARENT_ID,
      recordId: RECORD_ID,
      queryFn: vi.fn(),
      entityName: "TestEntity",
      guard,
    });
    expect(result).toEqual({
      success: false,
      error: MSG.config.cannotEditSubRecord,
    });
    expect(guard).not.toHaveBeenCalled();
  });

  // --- Engineering BOM auto-invalidation ---

  test("deletes engineering BOM when it exists after successful insert", async () => {
    mockHasEngineeringBom.mockResolvedValue(true);
    await handleSubRecordAction(insertOptions());
    expect(mockDeleteAllEngineeringBomItems).toHaveBeenCalledWith(
      PARENT_ID,
      mockTx,
    );
  });

  test("does NOT delete engineering BOM when it does not exist", async () => {
    mockHasEngineeringBom.mockResolvedValue(false);
    await handleSubRecordAction(insertOptions());
    expect(mockDeleteAllEngineeringBomItems).not.toHaveBeenCalled();
  });

  test("deletes engineering BOM after successful edit", async () => {
    mockHasEngineeringBom.mockResolvedValue(true);
    const queryFn = vi.fn().mockResolvedValue({ id: RECORD_ID });
    await handleSubRecordAction({
      actionType: "edit",
      parentId: PARENT_ID,
      recordId: RECORD_ID,
      formData: { value: "test" },
      schema: testSchema,
      queryFn,
      entityName: "TestEntity",
    });
    expect(mockDeleteAllEngineeringBomItems).toHaveBeenCalledWith(
      PARENT_ID,
      mockTx,
    );
  });

  test("deletes engineering BOM after successful delete", async () => {
    mockHasEngineeringBom.mockResolvedValue(true);
    const queryFn = vi.fn().mockResolvedValue({ id: RECORD_ID });
    await handleSubRecordAction({
      actionType: "delete",
      parentId: PARENT_ID,
      recordId: RECORD_ID,
      queryFn,
      entityName: "TestEntity",
    });
    expect(mockDeleteAllEngineeringBomItems).toHaveBeenCalledWith(
      PARENT_ID,
      mockTx,
    );
  });

  // --- Parent updated_at propagation ---

  test("touches parent configuration updated_at after successful insert", async () => {
    await handleSubRecordAction(insertOptions());
    // The pre-read status is threaded through as the CAS guard (issue #240).
    expect(mockTouchConfigurationUpdatedAt).toHaveBeenCalledWith(
      PARENT_ID,
      "DRAFT",
      mockTx,
    );
  });

  test("touches parent configuration updated_at after successful edit", async () => {
    const queryFn = vi.fn().mockResolvedValue({ id: RECORD_ID });
    await handleSubRecordAction({
      actionType: "edit",
      parentId: PARENT_ID,
      recordId: RECORD_ID,
      formData: { value: "test" },
      schema: testSchema,
      queryFn,
      entityName: "TestEntity",
    });
    expect(mockTouchConfigurationUpdatedAt).toHaveBeenCalledWith(
      PARENT_ID,
      "DRAFT",
      mockTx,
    );
  });

  test("touches parent configuration updated_at after successful delete", async () => {
    const queryFn = vi.fn().mockResolvedValue({ id: RECORD_ID });
    await handleSubRecordAction({
      actionType: "delete",
      parentId: PARENT_ID,
      recordId: RECORD_ID,
      queryFn,
      entityName: "TestEntity",
    });
    expect(mockTouchConfigurationUpdatedAt).toHaveBeenCalledWith(
      PARENT_ID,
      "DRAFT",
      mockTx,
    );
  });

  test("surfaces the 409 conflict and skips side effects when the status moved between gate and write (lost race, issue #240)", async () => {
    mockTouchConfigurationUpdatedAt.mockRejectedValue(
      new QueryError(MSG.config.statusConflict, 409),
    );
    const result = await handleSubRecordAction(insertOptions());
    expect(result).toEqual({
      success: false,
      error: MSG.config.statusConflict,
    });
    expect(mockDeleteAllEngineeringBomItems).not.toHaveBeenCalled();
    expect(mockRepriceOfferLine).not.toHaveBeenCalled();
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
    mockGetConfiguration.mockResolvedValue(
      mockConfig({ status: "TECH_APPROVED" }),
    );
    await handleSubRecordAction(insertOptions());
    expect(mockTouchConfigurationUpdatedAt).not.toHaveBeenCalled();
  });

  test("revalidates the detail, view, BOM and margin paths after sub-record mutation", async () => {
    mockHasEngineeringBom.mockResolvedValue(true);
    await handleSubRecordAction(insertOptions());
    const { revalidatePath } = await import("next/cache");
    expect(revalidatePath).toHaveBeenCalledWith(
      `/configurazioni/modifica/${PARENT_ID}`,
    );
    expect(revalidatePath).toHaveBeenCalledWith(
      `/configurazioni/visualizza/${PARENT_ID}`,
    );
    expect(revalidatePath).toHaveBeenCalledWith(
      `/configurazioni/bom/${PARENT_ID}`,
    );
    expect(revalidatePath).toHaveBeenCalledWith(
      `/configurazioni/marginalita/${PARENT_ID}`,
    );
  });

  // --- Offer line re-pricing (tanks/bays feed the BOM) ---

  test("reprices the owning line and revalidates the offer route for an OFFER config", async () => {
    mockGetUserData.mockResolvedValue({
      id: "admin-user",
      role: "ADMIN",
      initials: "AU",
    });
    mockGetConfiguration.mockResolvedValue(mockConfig({ origin: "OFFER" }));
    await handleSubRecordAction(insertOptions());
    expect(mockRepriceOfferLine).toHaveBeenCalledWith(
      PARENT_ID,
      "admin-user",
      mockTx,
      { requireDraft: true },
    );
    const { revalidatePath } = await import("next/cache");
    expect(revalidatePath).toHaveBeenCalledWith("/offerte/[id]", "page");
  });

  test("does not reprice a STANDALONE config", async () => {
    await handleSubRecordAction(insertOptions());
    expect(mockRepriceOfferLine).not.toHaveBeenCalled();
  });

  // --- In-tx gate re-assertion under the offer lock (issue #255) ---

  test("locks the offer row before mutating on an OFFER config", async () => {
    mockGetConfiguration.mockResolvedValue(mockConfig({ origin: "OFFER" }));
    mockGetUserData.mockResolvedValue({
      id: OWNER_ID,
      role: "SALES",
      initials: "SA",
    });
    const queryFn = vi.fn().mockResolvedValue({ id: 99 });
    const result = await handleSubRecordAction(insertOptions({ queryFn }));
    expect(result.success).toBe(true);
    expect(mockLockOfferRow).toHaveBeenCalledWith(OFFER_ID, mockTx);
    const lockOrder = mockLockOfferRow.mock.invocationCallOrder[0];
    const mutationOrder = queryFn.mock.invocationCallOrder[0];
    expect(lockOrder).toBeLessThan(mutationOrder);
  });

  test("re-reads the revision status in-tx after taking the lock", async () => {
    mockGetConfiguration.mockResolvedValue(mockConfig({ origin: "OFFER" }));
    mockGetUserData.mockResolvedValue({
      id: OWNER_ID,
      role: "SALES",
      initials: "SA",
    });
    const result = await handleSubRecordAction(insertOptions());
    expect(result.success).toBe(true);
    expect(mockOfferRevisionStatusFor).toHaveBeenCalledTimes(2);
    // Second (in-tx) read runs on the transaction, post-lock.
    expect(mockOfferRevisionStatusFor.mock.calls[1][1]).toBe(mockTx);
    const lockOrder = mockLockOfferRow.mock.invocationCallOrder[0];
    const rereadOrder = mockOfferRevisionStatusFor.mock.invocationCallOrder[1];
    expect(lockOrder).toBeLessThan(rereadOrder);
  });

  test("rejects the mutation when the revision leaves DRAFT between gate and tx (lost race)", async () => {
    mockGetConfiguration.mockResolvedValue(mockConfig({ origin: "OFFER" }));
    mockGetUserData.mockResolvedValue({
      id: OWNER_ID,
      role: "SALES",
      initials: "SA",
    });
    // Pre-tx gate sees DRAFT; a concurrent submit commits before the tx's
    // post-lock re-read, which sees PENDING_APPROVAL.
    mockOfferRevisionStatusFor
      .mockResolvedValueOnce("DRAFT")
      .mockResolvedValueOnce("PENDING_APPROVAL");
    const queryFn = vi.fn().mockResolvedValue({ id: 99 });
    const result = await handleSubRecordAction(insertOptions({ queryFn }));
    expect(result).toEqual({
      success: false,
      error: MSG.config.cannotEditSubRecord,
    });
    expect(queryFn).not.toHaveBeenCalled();
    expect(mockTouchConfigurationUpdatedAt).not.toHaveBeenCalled();
    expect(mockDeleteAllEngineeringBomItems).not.toHaveBeenCalled();
    expect(mockRepriceOfferLine).not.toHaveBeenCalled();
  });

  test("fails when an OFFER config has no owning offer (data drift)", async () => {
    mockGetConfiguration.mockResolvedValue(mockConfig({ origin: "OFFER" }));
    mockGetUserData.mockResolvedValue({
      id: OWNER_ID,
      role: "SALES",
      initials: "SA",
    });
    mockGetOfferRefForConfig.mockResolvedValue(null);
    const queryFn = vi.fn().mockResolvedValue({ id: 99 });
    const result = await handleSubRecordAction(insertOptions({ queryFn }));
    expect(result).toEqual({ success: false, error: MSG.offer.notFound });
    expect(queryFn).not.toHaveBeenCalled();
  });

  test("does not lock the offer row on a STANDALONE config", async () => {
    const result = await handleSubRecordAction(insertOptions());
    expect(result.success).toBe(true);
    expect(mockGetOfferRefForConfig).not.toHaveBeenCalled();
    expect(mockLockOfferRow).not.toHaveBeenCalled();
  });

  test("does not require a DRAFT revision on a post-handoff engineering edit", async () => {
    // Engineer editing an IN_TECH_REVIEW config while the latest revision is
    // frozen (ACCEPTED): the reprice must keep its by-design silent no-op.
    mockGetConfiguration.mockResolvedValue(
      mockConfig({ origin: "OFFER", status: "IN_TECH_REVIEW" }),
    );
    mockOfferRevisionStatusFor.mockResolvedValue("ACCEPTED");
    const result = await handleSubRecordAction(insertOptions());
    expect(result.success).toBe(true);
    expect(mockRepriceOfferLine).toHaveBeenCalledWith(
      PARENT_ID,
      OWNER_ID,
      mockTx,
      { requireDraft: false },
    );
  });
});
