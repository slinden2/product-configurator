import { beforeEach, describe, expect, test, vi } from "vitest";

// --- Mocks ---

const mockGetUserData = vi.fn();
const mockGetConfigurationWithTanksAndBays = vi.fn();
const mockUpdateConfiguration = vi.fn();
const mockHasEngineeringBom = vi.fn();
const mockDeleteAllEngineeringBomItems = vi.fn();
const mockResetWashBayEnergyChainFields = vi.fn();
const mockResetWashBayNonEnergyChainFields = vi.fn();
const mockInsertActivityLog = vi.fn();
const mockRepriceOfferLine = vi.fn();
const mockGetOfferRefForConfig = vi.fn();
const mockLockOfferRow = vi.fn();
// STANDALONE configs ignore this; OFFER tests default the revision to DRAFT so
// the pre-handoff editability gate stays open (impl survives clearAllMocks).
// Called twice on OFFER edits: pre-tx gate + in-tx re-assertion under the lock.
const mockOfferRevisionStatusFor = vi.fn(
  async (..._args: unknown[]) => "DRAFT",
);

vi.mock("@/db/queries", () => ({
  getUserData: (...args: unknown[]) => mockGetUserData(...args),
  getConfigurationWithTanksAndBays: (...args: unknown[]) =>
    mockGetConfigurationWithTanksAndBays(...args),
  updateConfiguration: (...args: unknown[]) => mockUpdateConfiguration(...args),
  hasEngineeringBom: (...args: unknown[]) => mockHasEngineeringBom(...args),
  deleteAllEngineeringBomItems: (...args: unknown[]) =>
    mockDeleteAllEngineeringBomItems(...args),
  offerRevisionStatusFor: (...args: unknown[]) =>
    mockOfferRevisionStatusFor(...args),
  getOfferRefForConfig: (...args: unknown[]) =>
    mockGetOfferRefForConfig(...args),
  lockOfferRow: (...args: unknown[]) => mockLockOfferRow(...args),
  resetWashBayEnergyChainFields: (...args: unknown[]) =>
    mockResetWashBayEnergyChainFields(...args),
  resetWashBayNonEnergyChainFields: (...args: unknown[]) =>
    mockResetWashBayNonEnergyChainFields(...args),
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

import { editConfigurationAction } from "@/app/actions/edit-configuration-action";
import { QueryError } from "@/db/queries";
import { MSG } from "@/lib/messages";
import { configSchema } from "@/validation/config-schema";

// --- Helpers ---

function makeValidFormData(overrides: Record<string, unknown> = {}) {
  return {
    name: "Test Config",
    machine_type: "STD",
    description: "",
    brush_qty: 0,
    brush_type: undefined,
    brush_color: undefined,
    has_chemical_pump: false,
    chemical_qty: undefined,
    chemical_pump_pos: undefined,
    has_foam: false,
    has_acid_pump: false,
    acid_pump_pos: undefined,
    has_shampoo_pump: false,
    has_wax_pump: false,
    water_1_type: "NETWORK",
    water_1_pump: undefined,
    water_2_type: undefined,
    water_2_pump: undefined,
    has_antifreeze: false,
    inv_pump_outlet_dosatron_qty: 0,
    inv_pump_outlet_pw_qty: 0,
    supply_type: "STRAIGHT_SHELF",
    supply_side: "LEFT",
    supply_fixing_type: undefined,
    has_post_frame: false,
    rail_type: "ANCHORED",
    rail_length: 21,
    rail_guide_qty: 0,
    anchor_type: "ZINC",
    has_15kw_pump: false,
    pump_outlet_1_15kw: undefined,
    pump_outlet_2_15kw: undefined,
    has_30kw_pump: false,
    pump_outlet_1_30kw: undefined,
    pump_outlet_2_30kw: undefined,
    has_omz_pump: false,
    pump_outlet_omz: undefined,
    has_chemical_roof_bar: false,
    touch_qty: 1,
    touch_pos: "EXTERNAL",
    touch_fixing_type: "WALL",
    has_itecoweb: false,
    has_card_reader: false,
    card_qty: 0,
    is_fast: false,
    ...overrides,
  };
}

const CONF_ID = 1;
const OFFER_ID = 77;
const OWNER_ID = "owner-123";

function mockConfig(overrides: Record<string, unknown> = {}) {
  return {
    id: CONF_ID,
    user_id: OWNER_ID,
    // Engineer/admin technical edits run on standalone configs (Phase 1); the
    // sales-status tests below override origin to OFFER.
    origin: "STANDALONE",
    status: "DRAFT",
    name: "Test",
    supply_type: "STRAIGHT_SHELF",
    ...overrides,
  };
}

// --- Tests ---

describe("editConfigurationAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUserData.mockResolvedValue({
      id: OWNER_ID,
      role: "ENGINEER",
      initials: "TU",
    });
    mockGetConfigurationWithTanksAndBays.mockResolvedValue(mockConfig());
    mockUpdateConfiguration.mockResolvedValue({ id: CONF_ID });
    mockHasEngineeringBom.mockResolvedValue(false);
    mockDeleteAllEngineeringBomItems.mockResolvedValue(undefined);
    mockResetWashBayEnergyChainFields.mockResolvedValue(undefined);
    mockResetWashBayNonEnergyChainFields.mockResolvedValue(undefined);
    mockInsertActivityLog.mockResolvedValue(undefined);
    mockRepriceOfferLine.mockResolvedValue(undefined);
    mockGetOfferRefForConfig.mockResolvedValue({
      offerId: OFFER_ID,
      offerNumber: "OFF-2026-0001",
    });
    mockLockOfferRow.mockResolvedValue(undefined);
  });

  test("returns success when owner edits DRAFT config", async () => {
    const result = await editConfigurationAction(CONF_ID, makeValidFormData());
    expect(result).toEqual({ success: true });
    expect(mockUpdateConfiguration).toHaveBeenCalledTimes(1);
    expect(mockInsertActivityLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "CONFIG_EDIT",
        targetEntity: "configuration",
        targetId: CONF_ID.toString(),
      }),
      mockTx,
    );
  });

  test("returns validation error for invalid form data", async () => {
    const result = await editConfigurationAction(CONF_ID, {
      name: "",
    });
    expect(result.success).toBe(false);
    expect(result).toHaveProperty("error");
    expect(mockUpdateConfiguration).not.toHaveBeenCalled();
  });

  test("returns error when user is not authenticated", async () => {
    mockGetUserData.mockResolvedValue(null);
    const result = await editConfigurationAction(CONF_ID, makeValidFormData());
    expect(result).toEqual({
      success: false,
      error: MSG.auth.userNotAuthenticated,
    });
  });

  test("returns error when configuration not found", async () => {
    mockGetConfigurationWithTanksAndBays.mockResolvedValue(null);
    const result = await editConfigurationAction(CONF_ID, makeValidFormData());
    expect(result).toEqual({
      success: false,
      error: MSG.config.notFound,
    });
  });

  test("loader denies out-of-scope SALES user (scope enforced in loader)", async () => {
    // The action no longer re-checks scope; getConfigurationWithTanksAndBays
    // returns null for an out-of-scope user, surfacing as notFound.
    mockGetUserData.mockResolvedValue({
      id: "other-user",
      role: "SALES",
      initials: "OU",
    });
    mockGetConfigurationWithTanksAndBays.mockResolvedValue(null);
    const result = await editConfigurationAction(CONF_ID, makeValidFormData());
    expect(result).toEqual({ success: false, error: MSG.config.notFound });
  });

  test("ENGINEER user can edit another user's DRAFT config", async () => {
    mockGetUserData.mockResolvedValue({
      id: "engineer-user",
      role: "ENGINEER",
      initials: "IU",
    });
    const result = await editConfigurationAction(CONF_ID, makeValidFormData());
    expect(result).toEqual({ success: true });
  });

  test("ADMIN user can edit another user's pre-handoff OFFER config", async () => {
    mockGetUserData.mockResolvedValue({
      id: "admin-user",
      role: "ADMIN",
      initials: "AU",
    });
    mockGetConfigurationWithTanksAndBays.mockResolvedValue(
      mockConfig({ status: "DRAFT", origin: "OFFER" }),
    );
    const result = await editConfigurationAction(CONF_ID, makeValidFormData());
    expect(result).toEqual({ success: true });
  });

  test("does not reprice a STANDALONE config", async () => {
    const result = await editConfigurationAction(CONF_ID, makeValidFormData());
    expect(result).toEqual({ success: true });
    expect(mockRepriceOfferLine).not.toHaveBeenCalled();
  });

  test("reprices the owning line on an OFFER config edit", async () => {
    mockGetUserData.mockResolvedValue({
      id: "admin-user",
      role: "ADMIN",
      initials: "AU",
    });
    mockGetConfigurationWithTanksAndBays.mockResolvedValue(
      mockConfig({ origin: "OFFER" }),
    );
    const result = await editConfigurationAction(CONF_ID, makeValidFormData());
    expect(result).toEqual({ success: true });
    expect(mockRepriceOfferLine).toHaveBeenCalledWith(
      CONF_ID,
      "admin-user",
      mockTx,
      { requireDraft: true },
    );
  });

  test("reprices on a surcharge-only (BOM-exempt) edit, without BOM invalidation", async () => {
    mockGetUserData.mockResolvedValue({
      id: "admin-user",
      role: "ADMIN",
      initials: "AU",
    });
    // Old config mirrors the *parsed* new form data on every non-exempt field, so
    // the only change is total_height — a BOM-exempt surcharge driver. The
    // snapshot/EBOM invalidation must NOT fire, yet the line must still be re-priced.
    mockHasEngineeringBom.mockResolvedValue(true);
    mockGetConfigurationWithTanksAndBays.mockResolvedValue({
      ...configSchema.parse(makeValidFormData()),
      id: CONF_ID,
      user_id: OWNER_ID,
      origin: "OFFER",
      status: "DRAFT",
      total_height: 2500,
    });
    const result = await editConfigurationAction(
      CONF_ID,
      makeValidFormData({ total_height: 3000 }),
    );
    expect(result).toEqual({ success: true });
    expect(mockDeleteAllEngineeringBomItems).not.toHaveBeenCalled();
    expect(mockRepriceOfferLine).toHaveBeenCalledWith(
      CONF_ID,
      "admin-user",
      mockTx,
      { requireDraft: true },
    );
  });

  test("rolls back the edit when repricing fails", async () => {
    mockGetUserData.mockResolvedValue({
      id: "admin-user",
      role: "ADMIN",
      initials: "AU",
    });
    mockGetConfigurationWithTanksAndBays.mockResolvedValue(
      mockConfig({ origin: "OFFER" }),
    );
    mockRepriceOfferLine.mockRejectedValue(
      new QueryError(MSG.surcharge.priceNotConfigured, 400),
    );
    const result = await editConfigurationAction(CONF_ID, makeValidFormData());
    expect(result).toEqual({
      success: false,
      error: MSG.surcharge.priceNotConfigured,
    });
  });

  test("SALES cannot edit a handed-off SALES_APPROVED config", async () => {
    mockGetUserData.mockResolvedValue({
      id: OWNER_ID,
      role: "SALES",
      initials: "EX",
    });
    mockGetConfigurationWithTanksAndBays.mockResolvedValue(
      mockConfig({ status: "SALES_APPROVED", origin: "OFFER" }),
    );
    const result = await editConfigurationAction(CONF_ID, makeValidFormData());
    expect(result).toEqual({ success: false, error: MSG.config.cannotEdit });
  });

  test("nobody can edit TECH_APPROVED config", async () => {
    mockGetConfigurationWithTanksAndBays.mockResolvedValue(
      mockConfig({ status: "TECH_APPROVED" }),
    );
    const result = await editConfigurationAction(CONF_ID, makeValidFormData());
    expect(result).toEqual({ success: false, error: MSG.config.cannotEdit });
  });

  test("nobody can edit CLOSED config", async () => {
    mockGetConfigurationWithTanksAndBays.mockResolvedValue(
      mockConfig({ status: "CLOSED" }),
    );
    const result = await editConfigurationAction(CONF_ID, makeValidFormData());
    expect(result).toEqual({ success: false, error: MSG.config.cannotEdit });
  });

  test("returns error message on QueryError", async () => {
    mockUpdateConfiguration.mockRejectedValue(
      new QueryError("Non trovata.", 404),
    );
    const result = await editConfigurationAction(CONF_ID, makeValidFormData());
    expect(result).toEqual({ success: false, error: "Non trovata." });
  });

  test("returns generic error on unknown exceptions", async () => {
    mockUpdateConfiguration.mockRejectedValue(new TypeError("unexpected"));
    const result = await editConfigurationAction(CONF_ID, makeValidFormData());
    expect(result).toEqual({ success: false, error: MSG.db.unknown });
  });

  // --- Engineering BOM auto-invalidation ---

  test("deletes engineering BOM when it exists after successful update", async () => {
    mockHasEngineeringBom.mockResolvedValue(true);
    const result = await editConfigurationAction(CONF_ID, makeValidFormData());
    expect(result.success).toBe(true);
    expect(mockDeleteAllEngineeringBomItems).toHaveBeenCalledWith(
      CONF_ID,
      mockTx,
    );
  });

  test("does NOT delete engineering BOM when it does not exist", async () => {
    mockHasEngineeringBom.mockResolvedValue(false);
    const result = await editConfigurationAction(CONF_ID, makeValidFormData());
    expect(result.success).toBe(true);
    expect(mockDeleteAllEngineeringBomItems).not.toHaveBeenCalled();
  });

  test("revalidates the edit, view and BOM paths after successful update", async () => {
    mockHasEngineeringBom.mockResolvedValue(true);
    await editConfigurationAction(CONF_ID, makeValidFormData());
    const { revalidatePath } = await import("next/cache");
    expect(revalidatePath).toHaveBeenCalledWith(
      `/configurazioni/modifica/${CONF_ID}`,
    );
    expect(revalidatePath).toHaveBeenCalledWith(
      `/configurazioni/visualizza/${CONF_ID}`,
    );
    expect(revalidatePath).toHaveBeenCalledWith(
      `/configurazioni/bom/${CONF_ID}`,
    );
  });

  // --- Energy chain field reset ---

  test("resets wash bay energy chain fields when supply_type changes from ENERGY_CHAIN", async () => {
    mockGetConfigurationWithTanksAndBays.mockResolvedValue(
      mockConfig({ supply_type: "ENERGY_CHAIN" }),
    );
    const result = await editConfigurationAction(
      CONF_ID,
      makeValidFormData({ supply_type: "STRAIGHT_SHELF" }),
    );
    expect(result.success).toBe(true);
    expect(mockResetWashBayEnergyChainFields).toHaveBeenCalledWith(
      CONF_ID,
      mockTx,
    );
  });

  test("resets wash bay energy chain fields when supply_type changes from ENERGY_CHAIN to BOOM", async () => {
    mockGetConfigurationWithTanksAndBays.mockResolvedValue(
      mockConfig({ supply_type: "ENERGY_CHAIN" }),
    );
    const result = await editConfigurationAction(
      CONF_ID,
      makeValidFormData({
        supply_type: "BOOM",
        has_post_frame: false,
        supply_fixing_type: "POST",
      }),
    );
    expect(result.success).toBe(true);
    expect(mockResetWashBayEnergyChainFields).toHaveBeenCalledWith(
      CONF_ID,
      mockTx,
    );
  });

  test("does NOT reset energy chain fields when supply_type stays ENERGY_CHAIN", async () => {
    mockGetConfigurationWithTanksAndBays.mockResolvedValue(
      mockConfig({ supply_type: "ENERGY_CHAIN" }),
    );
    const result = await editConfigurationAction(
      CONF_ID,
      makeValidFormData({
        supply_type: "ENERGY_CHAIN",
        rail_length: 25,
        supply_fixing_type: "POST",
      }),
    );
    expect(result.success).toBe(true);
    expect(mockResetWashBayEnergyChainFields).not.toHaveBeenCalled();
  });

  test("does NOT reset energy chain fields when supply_type changes between non-EC values", async () => {
    mockGetConfigurationWithTanksAndBays.mockResolvedValue(
      mockConfig({ supply_type: "STRAIGHT_SHELF" }),
    );
    const result = await editConfigurationAction(
      CONF_ID,
      makeValidFormData({
        supply_type: "BOOM",
        has_post_frame: false,
        supply_fixing_type: "POST",
      }),
    );
    expect(result.success).toBe(true);
    expect(mockResetWashBayEnergyChainFields).not.toHaveBeenCalled();
  });

  // --- Non-energy-chain field reset (ENERGY_CHAIN + WALL transition) ---

  test("resets non-EC wash bay fields when transitioning to ENERGY_CHAIN + WALL", async () => {
    mockGetConfigurationWithTanksAndBays.mockResolvedValue(
      mockConfig({ supply_type: "ENERGY_CHAIN", supply_fixing_type: "POST" }),
    );
    const result = await editConfigurationAction(
      CONF_ID,
      makeValidFormData({
        supply_type: "ENERGY_CHAIN",
        supply_fixing_type: "WALL",
        rail_length: 25,
      }),
    );
    expect(result.success).toBe(true);
    expect(mockResetWashBayNonEnergyChainFields).toHaveBeenCalledWith(
      CONF_ID,
      mockTx,
    );
  });

  test("resets non-EC wash bay fields when supply_type changes to ENERGY_CHAIN with WALL", async () => {
    mockGetConfigurationWithTanksAndBays.mockResolvedValue(
      mockConfig({
        supply_type: "STRAIGHT_SHELF",
        supply_fixing_type: undefined,
      }),
    );
    const result = await editConfigurationAction(
      CONF_ID,
      makeValidFormData({
        supply_type: "ENERGY_CHAIN",
        supply_fixing_type: "WALL",
        rail_length: 25,
      }),
    );
    expect(result.success).toBe(true);
    expect(mockResetWashBayNonEnergyChainFields).toHaveBeenCalledWith(
      CONF_ID,
      mockTx,
    );
  });

  test("does NOT reset non-EC fields when already ENERGY_CHAIN + WALL", async () => {
    mockGetConfigurationWithTanksAndBays.mockResolvedValue(
      mockConfig({ supply_type: "ENERGY_CHAIN", supply_fixing_type: "WALL" }),
    );
    const result = await editConfigurationAction(
      CONF_ID,
      makeValidFormData({
        supply_type: "ENERGY_CHAIN",
        supply_fixing_type: "WALL",
        rail_length: 25,
      }),
    );
    expect(result.success).toBe(true);
    expect(mockResetWashBayNonEnergyChainFields).not.toHaveBeenCalled();
  });

  test("does NOT reset non-EC fields when ENERGY_CHAIN + POST", async () => {
    mockGetConfigurationWithTanksAndBays.mockResolvedValue(
      mockConfig({ supply_type: "ENERGY_CHAIN", supply_fixing_type: "POST" }),
    );
    const result = await editConfigurationAction(
      CONF_ID,
      makeValidFormData({
        supply_type: "ENERGY_CHAIN",
        supply_fixing_type: "POST",
        rail_length: 25,
      }),
    );
    expect(result.success).toBe(true);
    expect(mockResetWashBayNonEnergyChainFields).not.toHaveBeenCalled();
  });

  // --- In-tx gate re-assertion under the offer lock (issue #255) ---

  test("locks the offer row before mutating on an OFFER config edit", async () => {
    mockGetConfigurationWithTanksAndBays.mockResolvedValue(
      mockConfig({ origin: "OFFER" }),
    );
    mockGetUserData.mockResolvedValue({
      id: OWNER_ID,
      role: "SALES",
      initials: "SA",
    });
    const result = await editConfigurationAction(CONF_ID, makeValidFormData());
    expect(result).toEqual({ success: true });
    expect(mockLockOfferRow).toHaveBeenCalledWith(OFFER_ID, mockTx);
    const lockOrder = mockLockOfferRow.mock.invocationCallOrder[0];
    const updateOrder = mockUpdateConfiguration.mock.invocationCallOrder[0];
    expect(lockOrder).toBeLessThan(updateOrder);
  });

  test("re-reads the revision status in-tx after taking the lock", async () => {
    mockGetConfigurationWithTanksAndBays.mockResolvedValue(
      mockConfig({ origin: "OFFER" }),
    );
    mockGetUserData.mockResolvedValue({
      id: OWNER_ID,
      role: "SALES",
      initials: "SA",
    });
    const result = await editConfigurationAction(CONF_ID, makeValidFormData());
    expect(result).toEqual({ success: true });
    expect(mockOfferRevisionStatusFor).toHaveBeenCalledTimes(2);
    // Second (in-tx) read runs on the transaction, post-lock.
    expect(mockOfferRevisionStatusFor.mock.calls[1][1]).toBe(mockTx);
    const lockOrder = mockLockOfferRow.mock.invocationCallOrder[0];
    const rereadOrder = mockOfferRevisionStatusFor.mock.invocationCallOrder[1];
    expect(lockOrder).toBeLessThan(rereadOrder);
  });

  test("rejects the edit when the revision leaves DRAFT between gate and tx (lost race)", async () => {
    mockGetConfigurationWithTanksAndBays.mockResolvedValue(
      mockConfig({ origin: "OFFER" }),
    );
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
    const result = await editConfigurationAction(CONF_ID, makeValidFormData());
    expect(result).toEqual({ success: false, error: MSG.config.cannotEdit });
    expect(mockUpdateConfiguration).not.toHaveBeenCalled();
    expect(mockDeleteAllEngineeringBomItems).not.toHaveBeenCalled();
    expect(mockRepriceOfferLine).not.toHaveBeenCalled();
  });

  test("fails when an OFFER config has no owning offer (data drift)", async () => {
    mockGetConfigurationWithTanksAndBays.mockResolvedValue(
      mockConfig({ origin: "OFFER" }),
    );
    mockGetUserData.mockResolvedValue({
      id: OWNER_ID,
      role: "SALES",
      initials: "SA",
    });
    mockGetOfferRefForConfig.mockResolvedValue(null);
    const result = await editConfigurationAction(CONF_ID, makeValidFormData());
    expect(result).toEqual({ success: false, error: MSG.offer.notFound });
    expect(mockUpdateConfiguration).not.toHaveBeenCalled();
  });

  test("does not lock the offer row on a STANDALONE config edit", async () => {
    const result = await editConfigurationAction(CONF_ID, makeValidFormData());
    expect(result).toEqual({ success: true });
    expect(mockGetOfferRefForConfig).not.toHaveBeenCalled();
    expect(mockLockOfferRow).not.toHaveBeenCalled();
  });

  test("does not require a DRAFT revision on a post-handoff engineering edit", async () => {
    // Engineer editing an IN_TECH_REVIEW config while the latest revision is
    // frozen (ACCEPTED): the reprice must keep its by-design silent no-op.
    mockGetConfigurationWithTanksAndBays.mockResolvedValue(
      mockConfig({ origin: "OFFER", status: "IN_TECH_REVIEW" }),
    );
    mockOfferRevisionStatusFor.mockResolvedValue("ACCEPTED");
    const result = await editConfigurationAction(CONF_ID, makeValidFormData());
    expect(result).toEqual({ success: true });
    expect(mockRepriceOfferLine).toHaveBeenCalledWith(
      CONF_ID,
      OWNER_ID,
      mockTx,
      { requireDraft: false },
    );
  });

  test("does not revalidate when audit log insert fails (CONFIG_EDIT rolls back)", async () => {
    mockInsertActivityLog.mockRejectedValue(new Error("audit failure"));
    const result = await editConfigurationAction(CONF_ID, makeValidFormData());
    expect(result.success).toBe(false);
    const { revalidatePath } = await import("next/cache");
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
