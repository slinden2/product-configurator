// @vitest-environment node
import { beforeEach, describe, expect, test, vi } from "vitest";
import { mockCanAccessConfiguration } from "@/test/access-mocks";

// --- Mocks ---

const mockGetUserData = vi.fn();
const mockGetConfigurationWithTanksAndBays = vi.fn();
const mockGetOfferSnapshotByConfigurationId = vi.fn();
const mockGetEngineeringBomItems = vi.fn();
const mockGetSurchargeSettings = vi.fn();
const mockGetInstallationItemSettings = vi.fn();
const mockUpsertOfferSnapshot = vi.fn();
const mockUpdateOfferDiscountWithAudit = vi.fn();
const mockUpdateOfferSettingsWithAudit = vi.fn();
const mockInsertActivityLog = vi.fn();
const mockIsOfferFrozen = vi.fn();
// Configs here are pre-handoff OFFER lines; default the owning revision to DRAFT
// so the two-phase editability gate stays open (impl survives clearAllMocks).
const mockOfferRevisionStatusFor = vi.fn(
  async (..._args: unknown[]) => "DRAFT",
);

vi.mock("@/db/queries", () => ({
  getUserData: (...args: unknown[]) => mockGetUserData(...args),
  canAccessConfiguration: mockCanAccessConfiguration,
  getConfigurationWithTanksAndBays: (...args: unknown[]) =>
    mockGetConfigurationWithTanksAndBays(...args),
  getOfferSnapshotByConfigurationId: (...args: unknown[]) =>
    mockGetOfferSnapshotByConfigurationId(...args),
  getEngineeringBomItems: (...args: unknown[]) =>
    mockGetEngineeringBomItems(...args),
  getSurchargeSettings: (...args: unknown[]) =>
    mockGetSurchargeSettings(...args),
  getInstallationItemSettings: (...args: unknown[]) =>
    mockGetInstallationItemSettings(...args),
  upsertOfferSnapshot: (...args: unknown[]) => mockUpsertOfferSnapshot(...args),
  updateOfferDiscountWithAudit: (...args: unknown[]) =>
    mockUpdateOfferDiscountWithAudit(...args),
  updateOfferSettingsWithAudit: (...args: unknown[]) =>
    mockUpdateOfferSettingsWithAudit(...args),
  deleteOfferSnapshotByConfigurationId: vi.fn(),
  offerRevisionStatusFor: (...args: unknown[]) =>
    mockOfferRevisionStatusFor(...args),
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

vi.mock("@/lib/BOM/max-bom", () => ({
  BOM_RULES_VERSION: "260101",
}));

vi.mock("@/lib/offer", () => ({
  buildOfferItemsFromLive: vi.fn().mockResolvedValue([]),
  computeOfferTotals: vi
    .fn()
    .mockReturnValue({ total_list_price: 1000, discounted_total: 1000 }),
  appendSurchargesToOfferItems: vi.fn().mockReturnValue([]),
  sumSurchargeTotal: vi.fn().mockReturnValue(0),
  isOfferFrozen: (...args: unknown[]) => mockIsOfferFrozen(...args),
}));

vi.mock("@/lib/offer-surcharges", () => ({
  resolveOfferSurcharges: vi.fn().mockReturnValue({ ok: true, surcharges: [] }),
}));

import { revalidatePath } from "next/cache";
import {
  generateOfferAction,
  setOfferDiscountAction,
  setOfferSettingsAction,
} from "@/app/actions/offer-actions";
import type { OfferSettings } from "@/validation/offer-schema";

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
    mockGetSurchargeSettings.mockResolvedValue([]);
    mockGetInstallationItemSettings.mockResolvedValue([]);
    mockUpsertOfferSnapshot.mockResolvedValue({ id: 1 });
    mockInsertActivityLog.mockResolvedValue(undefined);
    mockIsOfferFrozen.mockReturnValue(false);
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

  test("returns error when configuration is TECH_APPROVED", async () => {
    mockGetUserData.mockResolvedValue(makeUser("SALES", "user-1"));
    mockGetConfigurationWithTanksAndBays.mockResolvedValue(
      makeConfig("TECH_APPROVED", "user-1"),
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

  test("ADMIN can generate offer for any config in IN_TECH_REVIEW", async () => {
    mockGetUserData.mockResolvedValue(makeUser("ADMIN", "admin-1"));
    mockGetConfigurationWithTanksAndBays.mockResolvedValue(
      makeConfig("IN_TECH_REVIEW", "user-1"),
    );
    const result = await generateOfferAction(CONF_ID);
    expect(result.success).toBe(true);
  });

  test("logs OFFER_GENERATE for new snapshot inside transaction", async () => {
    mockGetUserData.mockResolvedValue(makeUser("SALES", "user-1"));
    mockGetConfigurationWithTanksAndBays.mockResolvedValue(
      makeConfig("DRAFT", "user-1"),
    );
    mockGetOfferSnapshotByConfigurationId.mockResolvedValue(null);
    await generateOfferAction(CONF_ID);
    expect(mockInsertActivityLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "OFFER_GENERATE" }),
      expect.anything(),
    );
  });

  test("logs OFFER_REGENERATE when snapshot already exists", async () => {
    mockGetUserData.mockResolvedValue(makeUser("SALES", "user-1"));
    mockGetConfigurationWithTanksAndBays.mockResolvedValue(
      makeConfig("DRAFT", "user-1"),
    );
    mockGetOfferSnapshotByConfigurationId.mockResolvedValue({ id: 99 });
    await generateOfferAction(CONF_ID);
    expect(mockInsertActivityLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "OFFER_REGENERATE" }),
      expect.anything(),
    );
  });

  test("always uses LIVE source, even when an engineering BOM exists", async () => {
    mockGetUserData.mockResolvedValue(makeUser("SALES", "user-1"));
    mockGetConfigurationWithTanksAndBays.mockResolvedValue(
      makeConfig("DRAFT", "user-1"),
    );
    mockGetEngineeringBomItems.mockResolvedValue([
      { pn: "ITC-001", is_deleted: false },
    ]);
    await generateOfferAction(CONF_ID);
    expect(mockUpsertOfferSnapshot).toHaveBeenCalledWith(
      expect.objectContaining({ source: "LIVE" }),
      expect.anything(),
    );
  });

  test("blocks regeneration when the offer is frozen", async () => {
    mockGetUserData.mockResolvedValue(makeUser("ADMIN", "admin-1"));
    mockGetConfigurationWithTanksAndBays.mockResolvedValue(
      makeConfig("IN_TECH_REVIEW", "user-1"),
    );
    mockGetOfferSnapshotByConfigurationId.mockResolvedValue({
      id: 99,
      frozen_at: new Date(),
    });
    mockIsOfferFrozen.mockReturnValue(true);

    const result = await generateOfferAction(CONF_ID);
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/congelata/);
    expect(mockUpsertOfferSnapshot).not.toHaveBeenCalled();
  });

  test("does not revalidate when transaction fails", async () => {
    mockGetUserData.mockResolvedValue(makeUser("SALES", "user-1"));
    mockGetConfigurationWithTanksAndBays.mockResolvedValue(
      makeConfig("DRAFT", "user-1"),
    );
    mockUpsertOfferSnapshot.mockRejectedValue(new Error("audit failure"));

    const result = await generateOfferAction(CONF_ID);
    expect(result.success).toBe(false);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  test("passes installation defaults from settings to the snapshot", async () => {
    mockGetUserData.mockResolvedValue(makeUser("SALES", "user-1"));
    mockGetConfigurationWithTanksAndBays.mockResolvedValue(
      makeConfig("DRAFT", "user-1"),
    );
    mockGetInstallationItemSettings.mockResolvedValue([
      { kind: "BASE_SYSTEM", price: "2500.00" },
    ]);
    await generateOfferAction(CONF_ID);
    expect(mockUpsertOfferSnapshot).toHaveBeenCalledWith(
      expect.objectContaining({
        installation_items: [
          { kind: "BASE_SYSTEM", amount: 2500, included: false },
          { kind: "HP_ROOF_BAR", amount: 0, included: false },
        ],
      }),
      expect.anything(),
    );
  });
});

// --- setOfferDiscountAction ---

describe("setOfferDiscountAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdateOfferDiscountWithAudit.mockResolvedValue(undefined);
    mockIsOfferFrozen.mockReturnValue(false);
  });

  test("rejects when the offer is frozen", async () => {
    mockGetUserData.mockResolvedValue(makeUser("ADMIN", "admin-1"));
    mockGetConfigurationWithTanksAndBays.mockResolvedValue(
      makeConfig("IN_TECH_REVIEW", "user-1"),
    );
    mockGetOfferSnapshotByConfigurationId.mockResolvedValue({
      id: 1,
      discount_pct: "10",
      frozen_at: new Date(),
    });
    mockIsOfferFrozen.mockReturnValue(true);
    const result = await setOfferDiscountAction(CONF_ID, 12.5);
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/congelata/);
    expect(mockUpdateOfferDiscountWithAudit).not.toHaveBeenCalled();
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

  test("returns error when configuration is TECH_APPROVED", async () => {
    mockGetUserData.mockResolvedValue(makeUser("ADMIN", "admin-1"));
    mockGetConfigurationWithTanksAndBays.mockResolvedValue(
      makeConfig("TECH_APPROVED", "user-1"),
    );
    const result = await setOfferDiscountAction(CONF_ID, 10);
    expect(result.success).toBe(false);
  });

  test("calls updateOfferDiscountWithAudit with correct args", async () => {
    mockGetUserData.mockResolvedValue(makeUser("SALES", "user-1"));
    mockGetConfigurationWithTanksAndBays.mockResolvedValue(
      makeConfig("DRAFT", "user-1"),
    );
    mockGetOfferSnapshotByConfigurationId.mockResolvedValue({
      id: 1,
      discount_pct: "10.00",
    });
    await setOfferDiscountAction(CONF_ID, 12.5);
    expect(mockUpdateOfferDiscountWithAudit).toHaveBeenCalledWith({
      confId: CONF_ID,
      discount_pct: "12.50",
      updated_by: "user-1",
    });
  });

  test("does not revalidate when helper rejects (audit failure rolls back)", async () => {
    mockGetUserData.mockResolvedValue(makeUser("SALES", "user-1"));
    mockGetConfigurationWithTanksAndBays.mockResolvedValue(
      makeConfig("DRAFT", "user-1"),
    );
    mockGetOfferSnapshotByConfigurationId.mockResolvedValue({
      id: 1,
      discount_pct: "10.00",
    });
    mockUpdateOfferDiscountWithAudit.mockRejectedValue(
      new Error("audit failure"),
    );

    const result = await setOfferDiscountAction(CONF_ID, 12.5);
    expect(result.success).toBe(false);
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

// --- setOfferSettingsAction ---

function makeOfferSettings(
  overrides: Partial<OfferSettings> = {},
): OfferSettings {
  return {
    show_net_total_only: false,
    transport_amount: 0,
    transport_mode: "TBD",
    installation_mode: "TBD",
    installation_items: [
      { kind: "BASE_SYSTEM", amount: 0, included: false },
      { kind: "HP_ROOF_BAR", amount: 0, included: false },
    ],
    ...overrides,
  };
}

describe("setOfferSettingsAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdateOfferSettingsWithAudit.mockResolvedValue(undefined);
    mockIsOfferFrozen.mockReturnValue(false);
  });

  test("rejects when the offer is frozen", async () => {
    mockGetUserData.mockResolvedValue(makeUser("ADMIN", "admin-1"));
    mockGetConfigurationWithTanksAndBays.mockResolvedValue(
      makeConfig("IN_TECH_REVIEW", "user-1"),
    );
    mockGetOfferSnapshotByConfigurationId.mockResolvedValue({
      id: 1,
      frozen_at: new Date(),
    });
    mockIsOfferFrozen.mockReturnValue(true);
    const result = await setOfferSettingsAction(CONF_ID, makeOfferSettings());
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/congelata/);
    expect(mockUpdateOfferSettingsWithAudit).not.toHaveBeenCalled();
  });

  test("returns error when user not authenticated", async () => {
    mockGetUserData.mockResolvedValue(null);
    const result = await setOfferSettingsAction(CONF_ID, makeOfferSettings());
    expect(result.success).toBe(false);
  });

  test("returns error for ENGINEER role", async () => {
    mockGetUserData.mockResolvedValue(makeUser("ENGINEER"));
    mockGetConfigurationWithTanksAndBays.mockResolvedValue(
      makeConfig("DRAFT", "user-1"),
    );
    const result = await setOfferSettingsAction(CONF_ID, makeOfferSettings());
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/SALES|ADMIN/);
  });

  test("SALES cannot set settings on another user's config", async () => {
    mockGetUserData.mockResolvedValue(makeUser("SALES", "user-1"));
    mockGetConfigurationWithTanksAndBays.mockResolvedValue(
      makeConfig("DRAFT", "user-other"),
    );
    const result = await setOfferSettingsAction(CONF_ID, makeOfferSettings());
    expect(result.success).toBe(false);
  });

  test("returns error when configuration is TECH_APPROVED", async () => {
    mockGetUserData.mockResolvedValue(makeUser("ADMIN", "admin-1"));
    mockGetConfigurationWithTanksAndBays.mockResolvedValue(
      makeConfig("TECH_APPROVED", "user-1"),
    );
    const result = await setOfferSettingsAction(CONF_ID, makeOfferSettings());
    expect(result.success).toBe(false);
  });

  test("rejects negative transport amount", async () => {
    mockGetUserData.mockResolvedValue(makeUser("SALES", "user-1"));
    const result = await setOfferSettingsAction(
      CONF_ID,
      makeOfferSettings({ transport_amount: -10 }),
    );
    expect(result.success).toBe(false);
  });

  test("rejects duplicate installation item kinds", async () => {
    mockGetUserData.mockResolvedValue(makeUser("SALES", "user-1"));
    const result = await setOfferSettingsAction(
      CONF_ID,
      makeOfferSettings({
        installation_items: [
          { kind: "BASE_SYSTEM", amount: 100, included: true },
          { kind: "BASE_SYSTEM", amount: 200, included: false },
        ],
      }),
    );
    expect(result.success).toBe(false);
  });

  test("returns error when offer snapshot not found", async () => {
    mockGetUserData.mockResolvedValue(makeUser("SALES", "user-1"));
    mockGetConfigurationWithTanksAndBays.mockResolvedValue(
      makeConfig("DRAFT", "user-1"),
    );
    mockGetOfferSnapshotByConfigurationId.mockResolvedValue(null);
    const result = await setOfferSettingsAction(CONF_ID, makeOfferSettings());
    expect(result.success).toBe(false);
    expect(result.error).toContain("non trovata");
  });

  test("calls updateOfferSettingsWithAudit with stringified transport amount", async () => {
    mockGetUserData.mockResolvedValue(makeUser("SALES", "user-1"));
    mockGetConfigurationWithTanksAndBays.mockResolvedValue(
      makeConfig("DRAFT", "user-1"),
    );
    mockGetOfferSnapshotByConfigurationId.mockResolvedValue({ id: 1 });
    const settings = makeOfferSettings({
      transport_amount: 350.5,
      transport_mode: "INCLUDED",
      installation_mode: "INCLUDED",
    });
    const result = await setOfferSettingsAction(CONF_ID, settings);
    expect(result.success).toBe(true);
    expect(mockUpdateOfferSettingsWithAudit).toHaveBeenCalledWith({
      confId: CONF_ID,
      settings: {
        show_net_total_only: false,
        transport_amount: "350.50",
        transport_mode: "INCLUDED",
        installation_mode: "INCLUDED",
        installation_items: settings.installation_items,
      },
      updated_by: "user-1",
    });
  });

  test("does not revalidate when helper rejects (audit failure rolls back)", async () => {
    mockGetUserData.mockResolvedValue(makeUser("SALES", "user-1"));
    mockGetConfigurationWithTanksAndBays.mockResolvedValue(
      makeConfig("DRAFT", "user-1"),
    );
    mockGetOfferSnapshotByConfigurationId.mockResolvedValue({ id: 1 });
    mockUpdateOfferSettingsWithAudit.mockRejectedValue(
      new Error("audit failure"),
    );

    const result = await setOfferSettingsAction(CONF_ID, makeOfferSettings());
    expect(result.success).toBe(false);
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
