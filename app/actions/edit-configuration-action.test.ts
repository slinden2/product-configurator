import { beforeEach, describe, expect, test, vi } from "vitest";

// --- Mocks ---

const mockGetUserData = vi.fn();
const mockGetConfigurationWithTanksAndBays = vi.fn();
const mockUpdateConfiguration = vi.fn();
const mockHasEngineeringBom = vi.fn();
const mockDeleteAllEngineeringBomItems = vi.fn();
const mockResetWashBayEnergyChainFields = vi.fn();
const mockResetWashBayNonEnergyChainFields = vi.fn();

vi.mock("@/db/queries", () => ({
  getUserData: (...args: unknown[]) => mockGetUserData(...args),
  getConfigurationWithTanksAndBays: (...args: unknown[]) =>
    mockGetConfigurationWithTanksAndBays(...args),
  updateConfiguration: (...args: unknown[]) => mockUpdateConfiguration(...args),
  hasEngineeringBom: (...args: unknown[]) => mockHasEngineeringBom(...args),
  deleteAllEngineeringBomItems: (...args: unknown[]) =>
    mockDeleteAllEngineeringBomItems(...args),
  resetWashBayEnergyChainFields: (...args: unknown[]) =>
    mockResetWashBayEnergyChainFields(...args),
  resetWashBayNonEnergyChainFields: (...args: unknown[]) =>
    mockResetWashBayNonEnergyChainFields(...args),
  logActivity: vi.fn(),
  QueryError: class QueryError extends Error {
    errorCode: number;
    constructor(message: string, errorCode: number) {
      super(message);
      this.name = "QueryError";
      this.errorCode = errorCode;
    }
  },
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
const OWNER_ID = "owner-123";

function mockConfig(overrides: Record<string, unknown> = {}) {
  return {
    id: CONF_ID,
    user_id: OWNER_ID,
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
  });

  test("returns success when owner edits DRAFT config", async () => {
    const result = await editConfigurationAction(CONF_ID, makeValidFormData());
    expect(result).toEqual({ success: true });
    expect(mockUpdateConfiguration).toHaveBeenCalledTimes(1);
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

  test("SALES user cannot edit another user's config", async () => {
    mockGetUserData.mockResolvedValue({
      id: "other-user",
      role: "SALES",
      initials: "OU",
    });
    const result = await editConfigurationAction(CONF_ID, makeValidFormData());
    expect(result).toEqual({ success: false, error: MSG.auth.unauthorized });
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

  test("ADMIN user can edit another user's SUBMITTED config", async () => {
    mockGetUserData.mockResolvedValue({
      id: "admin-user",
      role: "ADMIN",
      initials: "AU",
    });
    mockGetConfigurationWithTanksAndBays.mockResolvedValue(
      mockConfig({ status: "SUBMITTED" }),
    );
    const result = await editConfigurationAction(CONF_ID, makeValidFormData());
    expect(result).toEqual({ success: true });
  });

  test("SALES cannot edit SUBMITTED config", async () => {
    mockGetUserData.mockResolvedValue({
      id: OWNER_ID,
      role: "SALES",
      initials: "EX",
    });
    mockGetConfigurationWithTanksAndBays.mockResolvedValue(
      mockConfig({ status: "SUBMITTED" }),
    );
    const result = await editConfigurationAction(CONF_ID, makeValidFormData());
    expect(result.success).toBe(false);
    expect(result.error).toBe(MSG.config.cannotEdit);
  });

  test("nobody can edit APPROVED config", async () => {
    mockGetConfigurationWithTanksAndBays.mockResolvedValue(
      mockConfig({ status: "APPROVED" }),
    );
    const result = await editConfigurationAction(CONF_ID, makeValidFormData());
    expect(result.success).toBe(false);
    expect(result.error).toBe(MSG.config.cannotEdit);
  });

  test("nobody can edit CLOSED config", async () => {
    mockGetConfigurationWithTanksAndBays.mockResolvedValue(
      mockConfig({ status: "CLOSED" }),
    );
    const result = await editConfigurationAction(CONF_ID, makeValidFormData());
    expect(result.success).toBe(false);
    expect(result.error).toBe(MSG.config.cannotEdit);
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

  test("revalidates both edit and BOM paths after successful update", async () => {
    mockHasEngineeringBom.mockResolvedValue(true);
    await editConfigurationAction(CONF_ID, makeValidFormData());
    const { revalidatePath } = await import("next/cache");
    expect(revalidatePath).toHaveBeenCalledWith(
      `/configurazioni/modifica/${CONF_ID}`,
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
});
