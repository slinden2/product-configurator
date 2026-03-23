import { describe, test, expect, vi, beforeEach } from "vitest";

// --- Mocks ---

const mockGetUserData = vi.fn();
const mockGetConfigurationWithTanksAndBays = vi.fn();
const mockUpdateConfiguration = vi.fn();
const mockHasEngineeringBom = vi.fn();
const mockDeleteAllEngineeringBomItems = vi.fn();

vi.mock("@/db/queries", () => ({
  getUserData: (...args: unknown[]) => mockGetUserData(...args),
  getConfigurationWithTanksAndBays: (...args: unknown[]) =>
    mockGetConfigurationWithTanksAndBays(...args),
  updateConfiguration: (...args: unknown[]) =>
    mockUpdateConfiguration(...args),
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

import { editConfigurationAction } from "@/app/actions/edit-configuration-action";
import { QueryError } from "@/db/queries";
import { MSG } from "@/lib/messages";

// --- Helpers ---

function makeValidFormData() {
  return {
    name: "Test Config",
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
    rail_type: "DOWELED",
    rail_length: 21,
    rail_guide_qty: 0,
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
    ...overrides,
  };
}

// --- Tests ---

describe("editConfigurationAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUserData.mockResolvedValue({
      id: OWNER_ID,
      role: "INTERNAL",
      initials: "TU",
    });
    mockGetConfigurationWithTanksAndBays.mockResolvedValue(mockConfig());
    mockUpdateConfiguration.mockResolvedValue({ id: CONF_ID });
    mockHasEngineeringBom.mockResolvedValue(false);
    mockDeleteAllEngineeringBomItems.mockResolvedValue(undefined);
  });

  test("returns success when owner edits DRAFT config", async () => {
    const result = await editConfigurationAction(
      CONF_ID,
      OWNER_ID,
      makeValidFormData()
    );
    expect(result).toEqual({ success: true });
    expect(mockUpdateConfiguration).toHaveBeenCalledTimes(1);
  });

  test("returns validation error for invalid form data", async () => {
    const result = await editConfigurationAction(CONF_ID, OWNER_ID, {
      name: "",
    });
    expect(result.success).toBe(false);
    expect(result).toHaveProperty("error");
    expect(mockUpdateConfiguration).not.toHaveBeenCalled();
  });

  test("returns error when user is not authenticated", async () => {
    mockGetUserData.mockResolvedValue(null);
    const result = await editConfigurationAction(
      CONF_ID,
      OWNER_ID,
      makeValidFormData()
    );
    expect(result).toEqual({ success: false, error: MSG.auth.userNotFound });
  });

  test("returns error when configuration not found", async () => {
    mockGetConfigurationWithTanksAndBays.mockResolvedValue(null);
    const result = await editConfigurationAction(
      CONF_ID,
      OWNER_ID,
      makeValidFormData()
    );
    expect(result).toEqual({
      success: false,
      error: MSG.config.notFound,
    });
  });

  test("EXTERNAL user cannot edit another user's config", async () => {
    mockGetUserData.mockResolvedValue({
      id: "other-user",
      role: "EXTERNAL",
      initials: "OU",
    });
    const result = await editConfigurationAction(
      CONF_ID,
      OWNER_ID,
      makeValidFormData()
    );
    expect(result).toEqual({ success: false, error: MSG.auth.unauthorized });
  });

  test("INTERNAL user can edit another user's DRAFT config", async () => {
    mockGetUserData.mockResolvedValue({
      id: "internal-user",
      role: "INTERNAL",
      initials: "IU",
    });
    const result = await editConfigurationAction(
      CONF_ID,
      OWNER_ID,
      makeValidFormData()
    );
    expect(result).toEqual({ success: true });
  });

  test("ADMIN user can edit another user's SUBMITTED config", async () => {
    mockGetUserData.mockResolvedValue({
      id: "admin-user",
      role: "ADMIN",
      initials: "AU",
    });
    mockGetConfigurationWithTanksAndBays.mockResolvedValue(
      mockConfig({ status: "SUBMITTED" })
    );
    const result = await editConfigurationAction(
      CONF_ID,
      OWNER_ID,
      makeValidFormData()
    );
    expect(result).toEqual({ success: true });
  });

  test("EXTERNAL cannot edit SUBMITTED config", async () => {
    mockGetUserData.mockResolvedValue({
      id: OWNER_ID,
      role: "EXTERNAL",
      initials: "EX",
    });
    mockGetConfigurationWithTanksAndBays.mockResolvedValue(
      mockConfig({ status: "SUBMITTED" })
    );
    const result = await editConfigurationAction(
      CONF_ID,
      OWNER_ID,
      makeValidFormData()
    );
    expect(result.success).toBe(false);
    expect(result.error).toBe(MSG.config.cannotEdit);
  });

  test("nobody can edit APPROVED config", async () => {
    mockGetConfigurationWithTanksAndBays.mockResolvedValue(
      mockConfig({ status: "APPROVED" })
    );
    const result = await editConfigurationAction(
      CONF_ID,
      OWNER_ID,
      makeValidFormData()
    );
    expect(result.success).toBe(false);
    expect(result.error).toBe(MSG.config.cannotEdit);
  });

  test("nobody can edit CLOSED config", async () => {
    mockGetConfigurationWithTanksAndBays.mockResolvedValue(
      mockConfig({ status: "CLOSED" })
    );
    const result = await editConfigurationAction(
      CONF_ID,
      OWNER_ID,
      makeValidFormData()
    );
    expect(result.success).toBe(false);
    expect(result.error).toBe(MSG.config.cannotEdit);
  });

  test("returns error message on QueryError", async () => {
    mockUpdateConfiguration.mockRejectedValue(
      new QueryError("Non trovata.", 404)
    );
    const result = await editConfigurationAction(
      CONF_ID,
      OWNER_ID,
      makeValidFormData()
    );
    expect(result).toEqual({ success: false, error: "Non trovata." });
  });

  test("returns generic error on unknown exceptions", async () => {
    mockUpdateConfiguration.mockRejectedValue(new TypeError("unexpected"));
    const result = await editConfigurationAction(
      CONF_ID,
      OWNER_ID,
      makeValidFormData()
    );
    expect(result).toEqual({ success: false, error: MSG.db.unknown });
  });

  // --- Engineering BOM auto-invalidation ---

  test("deletes engineering BOM when it exists after successful update", async () => {
    mockHasEngineeringBom.mockResolvedValue(true);
    const result = await editConfigurationAction(
      CONF_ID,
      OWNER_ID,
      makeValidFormData()
    );
    expect(result.success).toBe(true);
    expect(mockDeleteAllEngineeringBomItems).toHaveBeenCalledWith(CONF_ID);
  });

  test("does NOT delete engineering BOM when it does not exist", async () => {
    mockHasEngineeringBom.mockResolvedValue(false);
    const result = await editConfigurationAction(
      CONF_ID,
      OWNER_ID,
      makeValidFormData()
    );
    expect(result.success).toBe(true);
    expect(mockDeleteAllEngineeringBomItems).not.toHaveBeenCalled();
  });

  test("revalidates both edit and BOM paths after successful update", async () => {
    mockHasEngineeringBom.mockResolvedValue(true);
    await editConfigurationAction(CONF_ID, OWNER_ID, makeValidFormData());
    const { revalidatePath } = await import("next/cache");
    expect(revalidatePath).toHaveBeenCalledWith(
      `/configurations/edit/${CONF_ID}`
    );
    expect(revalidatePath).toHaveBeenCalledWith(
      `/configurations/bom/${CONF_ID}`
    );
  });
});
