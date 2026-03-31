import { describe, test, expect, vi, beforeEach } from "vitest";

// --- Mocks ---

const mockGetUserData = vi.fn();
const mockInsertConfiguration = vi.fn();

vi.mock("@/db/queries", () => ({
  getUserData: (...args: unknown[]) => mockGetUserData(...args),
  insertConfiguration: (...args: unknown[]) => mockInsertConfiguration(...args),
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

// --- Imports (after mocks) ---

import { insertConfigurationAction } from "@/app/actions/insert-configuration-action";
import { QueryError } from "@/db/queries";
import { MSG } from "@/lib/messages";

// --- Helpers ---

function makeValidFormData() {
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
    rail_type: "DOWELED",
    rail_length: 21,
    rail_guide_qty: 0,
    dowel_type: "ZINCATO",
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

// --- Tests ---

describe("insertConfigurationAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUserData.mockResolvedValue({
      id: "user-1",
      role: "ENGINEER",
      initials: "TU",
    });
    mockInsertConfiguration.mockResolvedValue({ id: 42 });
  });

  test("returns success with new config id on valid input", async () => {
    const result = await insertConfigurationAction(makeValidFormData());
    expect(result).toEqual({ success: true, id: 42 });
    expect(mockInsertConfiguration).toHaveBeenCalledTimes(1);
  });

  test("returns validation error for invalid form data", async () => {
    const result = await insertConfigurationAction({ name: "" });
    expect(result.success).toBe(false);
    expect(result).toHaveProperty("error");
    expect(mockInsertConfiguration).not.toHaveBeenCalled();
  });

  test("returns error when user is not authenticated", async () => {
    mockGetUserData.mockResolvedValue(null);
    const result = await insertConfigurationAction(makeValidFormData());
    expect(result).toEqual({ success: false, error: MSG.auth.userNotFound });
    expect(mockInsertConfiguration).not.toHaveBeenCalled();
  });

  test("returns error message on QueryError", async () => {
    mockInsertConfiguration.mockRejectedValue(
      new QueryError("Impossibile creare la configurazione.", 500),
    );
    const result = await insertConfigurationAction(makeValidFormData());
    expect(result.success).toBe(false);
    expect(result.error).toBe(MSG.config.createFailed);
  });

  test("returns generic error on unknown exceptions", async () => {
    mockInsertConfiguration.mockRejectedValue(new TypeError("unexpected"));
    const result = await insertConfigurationAction(makeValidFormData());
    expect(result).toEqual({ success: false, error: MSG.db.unknown });
  });
});
