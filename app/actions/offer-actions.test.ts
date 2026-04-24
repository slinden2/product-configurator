// @vitest-environment node
import { beforeEach, describe, expect, test, vi } from "vitest";

// --- Mocks ---

const mockGetUserData = vi.fn();
const mockGetConfigurationWithTanksAndBays = vi.fn();
const mockGetOfferSnapshotByConfigurationId = vi.fn();
const mockGetEngineeringBomItems = vi.fn();
const mockUpsertOfferSnapshot = vi.fn();
const mockUpdateOfferDiscount = vi.fn();
const mockLogActivity = vi.fn();

vi.mock("@/db/queries", () => ({
  getUserData: (...args: unknown[]) => mockGetUserData(...args),
  getConfigurationWithTanksAndBays: (...args: unknown[]) =>
    mockGetConfigurationWithTanksAndBays(...args),
  getOfferSnapshotByConfigurationId: (...args: unknown[]) =>
    mockGetOfferSnapshotByConfigurationId(...args),
  getEngineeringBomItems: (...args: unknown[]) =>
    mockGetEngineeringBomItems(...args),
  getEbomMaxUpdatedAt: vi.fn().mockResolvedValue(null),
  upsertOfferSnapshot: (...args: unknown[]) => mockUpsertOfferSnapshot(...args),
  updateOfferDiscount: (...args: unknown[]) => mockUpdateOfferDiscount(...args),
  deleteOfferSnapshotByConfigurationId: vi.fn(),
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

vi.mock("@/lib/BOM/max-bom", () => ({
  BOM_RULES_VERSION: "260101",
}));

vi.mock("@/lib/offer", () => ({
  buildOfferItemsFromEbom: vi.fn().mockResolvedValue([]),
  buildOfferItemsFromLive: vi.fn().mockResolvedValue([]),
  computeOfferTotals: vi
    .fn()
    .mockReturnValue({ total_list_price: 1000, discounted_total: 1000 }),
}));

import {
  generateOfferAction,
  setOfferDiscountAction,
} from "@/app/actions/offer-actions";

// --- Helpers ---

function makeUser(role: "SALES" | "ENGINEER" | "ADMIN", id = "user-1") {
  return { id, role, email: "test@itecosrl.com" };
}

function makeConfig(status: string, userId = "user-1", id = 42) {
  return { id, status, user_id: userId, name: "Test" };
}

const CONF_ID = 42;

// --- generateOfferAction ---

describe("generateOfferAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetEngineeringBomItems.mockResolvedValue([]);
    mockGetOfferSnapshotByConfigurationId.mockResolvedValue(null);
    mockUpsertOfferSnapshot.mockResolvedValue({ id: 1 });
    mockLogActivity.mockResolvedValue(undefined);
  });

  test("returns error when user not authenticated", async () => {
    mockGetUserData.mockResolvedValue(null);
    const result = await generateOfferAction(CONF_ID);
    expect(result.success).toBe(false);
  });

  test("returns error for ENGINEER role", async () => {
    mockGetUserData.mockResolvedValue(makeUser("ENGINEER"));
    const result = await generateOfferAction(CONF_ID);
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/SALES|ADMIN/);
  });

  test("returns error when configuration not found", async () => {
    mockGetUserData.mockResolvedValue(makeUser("SALES"));
    mockGetConfigurationWithTanksAndBays.mockResolvedValue(null);
    const result = await generateOfferAction(CONF_ID);
    expect(result.success).toBe(false);
  });

  test("SALES cannot generate offer for another user's config", async () => {
    mockGetUserData.mockResolvedValue(makeUser("SALES", "user-1"));
    mockGetConfigurationWithTanksAndBays.mockResolvedValue(
      makeConfig("DRAFT", "user-other"),
    );
    const result = await generateOfferAction(CONF_ID);
    expect(result.success).toBe(false);
  });

  test("returns error when configuration is APPROVED", async () => {
    mockGetUserData.mockResolvedValue(makeUser("SALES", "user-1"));
    mockGetConfigurationWithTanksAndBays.mockResolvedValue(
      makeConfig("APPROVED", "user-1"),
    );
    const result = await generateOfferAction(CONF_ID);
    expect(result.success).toBe(false);
  });

  test("returns error when configuration is CLOSED", async () => {
    mockGetUserData.mockResolvedValue(makeUser("SALES", "user-1"));
    mockGetConfigurationWithTanksAndBays.mockResolvedValue(
      makeConfig("CLOSED", "user-1"),
    );
    const result = await generateOfferAction(CONF_ID);
    expect(result.success).toBe(false);
  });

  test("SALES can generate offer for own DRAFT config", async () => {
    mockGetUserData.mockResolvedValue(makeUser("SALES", "user-1"));
    mockGetConfigurationWithTanksAndBays.mockResolvedValue(
      makeConfig("DRAFT", "user-1"),
    );
    const result = await generateOfferAction(CONF_ID);
    expect(result.success).toBe(true);
    expect(mockUpsertOfferSnapshot).toHaveBeenCalled();
  });

  test("ADMIN can generate offer for any config in IN_REVIEW", async () => {
    mockGetUserData.mockResolvedValue(makeUser("ADMIN", "admin-1"));
    mockGetConfigurationWithTanksAndBays.mockResolvedValue(
      makeConfig("IN_REVIEW", "user-1"),
    );
    const result = await generateOfferAction(CONF_ID);
    expect(result.success).toBe(true);
  });

  test("logs OFFER_GENERATE for new snapshot", async () => {
    mockGetUserData.mockResolvedValue(makeUser("SALES", "user-1"));
    mockGetConfigurationWithTanksAndBays.mockResolvedValue(
      makeConfig("DRAFT", "user-1"),
    );
    mockGetOfferSnapshotByConfigurationId.mockResolvedValue(null);
    await generateOfferAction(CONF_ID);
    expect(mockLogActivity).toHaveBeenCalledWith(
      expect.objectContaining({ action: "OFFER_GENERATE" }),
    );
  });

  test("logs OFFER_REGENERATE when snapshot already exists", async () => {
    mockGetUserData.mockResolvedValue(makeUser("SALES", "user-1"));
    mockGetConfigurationWithTanksAndBays.mockResolvedValue(
      makeConfig("DRAFT", "user-1"),
    );
    mockGetOfferSnapshotByConfigurationId.mockResolvedValue({ id: 99 });
    await generateOfferAction(CONF_ID);
    expect(mockLogActivity).toHaveBeenCalledWith(
      expect.objectContaining({ action: "OFFER_REGENERATE" }),
    );
  });

  test("uses EBOM source when engineering BOM exists", async () => {
    mockGetUserData.mockResolvedValue(makeUser("SALES", "user-1"));
    mockGetConfigurationWithTanksAndBays.mockResolvedValue(
      makeConfig("DRAFT", "user-1"),
    );
    mockGetEngineeringBomItems.mockResolvedValue([
      { pn: "ITC-001", is_deleted: false },
    ]);
    await generateOfferAction(CONF_ID);
    expect(mockUpsertOfferSnapshot).toHaveBeenCalledWith(
      expect.objectContaining({ source: "EBOM" }),
    );
  });

  test("uses LIVE source when no engineering BOM exists", async () => {
    mockGetUserData.mockResolvedValue(makeUser("SALES", "user-1"));
    mockGetConfigurationWithTanksAndBays.mockResolvedValue(
      makeConfig("DRAFT", "user-1"),
    );
    mockGetEngineeringBomItems.mockResolvedValue([]);
    await generateOfferAction(CONF_ID);
    expect(mockUpsertOfferSnapshot).toHaveBeenCalledWith(
      expect.objectContaining({ source: "LIVE" }),
    );
  });
});

// --- setOfferDiscountAction ---

describe("setOfferDiscountAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdateOfferDiscount.mockResolvedValue({ id: 1 });
    mockLogActivity.mockResolvedValue(undefined);
  });

  test("returns error when user not authenticated", async () => {
    mockGetUserData.mockResolvedValue(null);
    const result = await setOfferDiscountAction(CONF_ID, 10);
    expect(result.success).toBe(false);
  });

  test("returns error for ENGINEER role", async () => {
    mockGetUserData.mockResolvedValue(makeUser("ENGINEER"));
    mockGetConfigurationWithTanksAndBays.mockResolvedValue(
      makeConfig("DRAFT", "user-1"),
    );
    const result = await setOfferDiscountAction(CONF_ID, 10);
    expect(result.success).toBe(false);
  });

  test("rejects discount above 40%", async () => {
    mockGetUserData.mockResolvedValue(makeUser("SALES", "user-1"));
    const result = await setOfferDiscountAction(CONF_ID, 45);
    expect(result.success).toBe(false);
    expect(result.error).toContain("40%");
  });

  test("rejects discount not on 0.5% step", async () => {
    mockGetUserData.mockResolvedValue(makeUser("SALES", "user-1"));
    const result = await setOfferDiscountAction(CONF_ID, 10.3);
    expect(result.success).toBe(false);
  });

  test("accepts discount at boundary 40%", async () => {
    mockGetUserData.mockResolvedValue(makeUser("SALES", "user-1"));
    mockGetConfigurationWithTanksAndBays.mockResolvedValue(
      makeConfig("DRAFT", "user-1"),
    );
    mockGetOfferSnapshotByConfigurationId.mockResolvedValue({
      id: 1,
      discount_pct: "0",
    });
    const result = await setOfferDiscountAction(CONF_ID, 40);
    expect(result.success).toBe(true);
  });

  test("accepts discount at 0%", async () => {
    mockGetUserData.mockResolvedValue(makeUser("SALES", "user-1"));
    mockGetConfigurationWithTanksAndBays.mockResolvedValue(
      makeConfig("DRAFT", "user-1"),
    );
    mockGetOfferSnapshotByConfigurationId.mockResolvedValue({
      id: 1,
      discount_pct: "10",
    });
    const result = await setOfferDiscountAction(CONF_ID, 0);
    expect(result.success).toBe(true);
  });

  test("returns error when offer snapshot not found", async () => {
    mockGetUserData.mockResolvedValue(makeUser("SALES", "user-1"));
    mockGetConfigurationWithTanksAndBays.mockResolvedValue(
      makeConfig("DRAFT", "user-1"),
    );
    mockGetOfferSnapshotByConfigurationId.mockResolvedValue(null);
    const result = await setOfferDiscountAction(CONF_ID, 12.5);
    expect(result.success).toBe(false);
    expect(result.error).toContain("non trovata");
  });

  test("returns error when configuration is APPROVED", async () => {
    mockGetUserData.mockResolvedValue(makeUser("ADMIN", "admin-1"));
    mockGetConfigurationWithTanksAndBays.mockResolvedValue(
      makeConfig("APPROVED", "user-1"),
    );
    const result = await setOfferDiscountAction(CONF_ID, 10);
    expect(result.success).toBe(false);
  });

  test("logs OFFER_DISCOUNT_SET with previous and new pct", async () => {
    mockGetUserData.mockResolvedValue(makeUser("SALES", "user-1"));
    mockGetConfigurationWithTanksAndBays.mockResolvedValue(
      makeConfig("DRAFT", "user-1"),
    );
    mockGetOfferSnapshotByConfigurationId.mockResolvedValue({
      id: 1,
      discount_pct: "10.00",
    });
    await setOfferDiscountAction(CONF_ID, 12.5);
    expect(mockLogActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "OFFER_DISCOUNT_SET",
        metadata: expect.objectContaining({ new_pct: 12.5 }),
      }),
    );
  });
});
