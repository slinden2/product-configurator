// @vitest-environment node
import { beforeEach, describe, expect, test, vi } from "vitest";

// --- Mocks ---

const mockGetUserData = vi.fn();
const mockGetOfferWorkingRevision = vi.fn();
const mockAddOfferLine = vi.fn();
const mockRemoveOfferLine = vi.fn();
const mockRepriceOfferLine = vi.fn();

const TX = { tx: true };

vi.mock("@/db", () => ({
  db: {
    transaction: (cb: (tx: unknown) => unknown) => cb(TX),
  },
}));

vi.mock("@/db/queries", () => ({
  getUserData: (...args: unknown[]) => mockGetUserData(...args),
  getOfferWorkingRevision: (...args: unknown[]) =>
    mockGetOfferWorkingRevision(...args),
  addOfferLine: (...args: unknown[]) => mockAddOfferLine(...args),
  removeOfferLine: (...args: unknown[]) => mockRemoveOfferLine(...args),
  QueryError: class QueryError extends Error {
    constructor(message: string) {
      super(message);
      this.name = "QueryError";
    }
  },
}));

vi.mock("@/lib/offer-revision-pricing", () => ({
  repriceOfferLine: (...args: unknown[]) => mockRepriceOfferLine(...args),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

vi.mock("pg", () => ({
  DatabaseError: class DatabaseError extends Error {
    constructor(message: string) {
      super(message);
      this.name = "DatabaseError";
    }
  },
}));

// --- Imports (after mocks) ---

import { revalidatePath } from "next/cache";
import {
  addOfferLineAction,
  removeOfferLineAction,
} from "@/app/actions/offer-line-actions";
import { QueryError } from "@/db/queries";
import { OFFER_CONFIG_NAME_PLACEHOLDER } from "@/lib/configuration/constants";
import { MSG } from "@/lib/messages";

const OFFER_ID = 5;
const CONFIG_ID = 42;

// Minimal valid configSchema payload (mirrors the insert-config action test).
function makeValidConfig() {
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
  };
}

describe("addOfferLineAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUserData.mockResolvedValue({
      id: "u1",
      role: "SALES",
      initials: "SX",
    });
    mockGetOfferWorkingRevision.mockResolvedValue({ id: 1, status: "DRAFT" });
    mockAddOfferLine.mockResolvedValue({ id: CONFIG_ID });
    mockRepriceOfferLine.mockResolvedValue(undefined);
  });

  test("adds a line and returns the new configuration id", async () => {
    const result = await addOfferLineAction(OFFER_ID, makeValidConfig());
    expect(result).toEqual({ success: true, id: CONFIG_ID });
    expect(mockAddOfferLine).toHaveBeenCalledWith(
      OFFER_ID,
      expect.objectContaining({ name: OFFER_CONFIG_NAME_PLACEHOLDER }),
      "u1",
      TX,
    );
  });

  test("does not require a customer name in the offer configuration payload", async () => {
    const { name: _name, ...configWithoutName } = makeValidConfig();

    const result = await addOfferLineAction(OFFER_ID, configWithoutName);

    expect(result).toEqual({ success: true, id: CONFIG_ID });
    expect(mockAddOfferLine).toHaveBeenCalledWith(
      OFFER_ID,
      expect.objectContaining({ name: OFFER_CONFIG_NAME_PLACEHOLDER }),
      "u1",
      TX,
    );
  });

  test("revalidates the offer list (line count) and detail on success", async () => {
    await addOfferLineAction(OFFER_ID, makeValidConfig());
    expect(revalidatePath).toHaveBeenCalledWith("/offerte");
    expect(revalidatePath).toHaveBeenCalledWith(`/offerte/${OFFER_ID}`);
  });

  test("prices the new line in the same transaction, without a reprice audit and failing on a non-DRAFT revision", async () => {
    await addOfferLineAction(OFFER_ID, makeValidConfig());
    expect(mockRepriceOfferLine).toHaveBeenCalledWith(CONFIG_ID, "u1", TX, {
      audit: false,
      requireDraft: true,
    });
  });

  test("surfaces a misconfigured surcharge price from the reprice step", async () => {
    mockRepriceOfferLine.mockRejectedValue(
      new QueryError(MSG.surcharge.priceNotConfigured),
    );
    const result = await addOfferLineAction(OFFER_ID, makeValidConfig());
    expect(result).toEqual({
      success: false,
      error: MSG.surcharge.priceNotConfigured,
    });
  });

  test("rejects ENGINEER (no offer access)", async () => {
    mockGetUserData.mockResolvedValue({ id: "e1", role: "ENGINEER" });
    const result = await addOfferLineAction(OFFER_ID, makeValidConfig());
    expect(result).toEqual({ success: false, error: MSG.offer.unauthorized });
    expect(mockAddOfferLine).not.toHaveBeenCalled();
  });

  test("returns notFound when the offer is out of scope", async () => {
    mockGetOfferWorkingRevision.mockResolvedValue(null);
    const result = await addOfferLineAction(OFFER_ID, makeValidConfig());
    expect(result).toEqual({ success: false, error: MSG.offer.notFound });
    expect(mockAddOfferLine).not.toHaveBeenCalled();
  });

  test("returns a validation error for an invalid config", async () => {
    const result = await addOfferLineAction(OFFER_ID, { name: "" });
    expect(result.success).toBe(false);
    expect(mockAddOfferLine).not.toHaveBeenCalled();
  });

  test("surfaces the revision-frozen gate from addOfferLine", async () => {
    mockAddOfferLine.mockRejectedValue(
      new QueryError(MSG.offer.lineCannotEdit),
    );
    const result = await addOfferLineAction(OFFER_ID, makeValidConfig());
    expect(result).toEqual({
      success: false,
      error: MSG.offer.lineCannotEdit,
    });
  });
});

describe("removeOfferLineAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUserData.mockResolvedValue({
      id: "u1",
      role: "SALES_MANAGER",
      initials: "SM",
    });
    mockGetOfferWorkingRevision.mockResolvedValue({ id: 1, status: "DRAFT" });
    mockRemoveOfferLine.mockResolvedValue(undefined);
  });

  test("removes a line for an in-scope manager", async () => {
    const result = await removeOfferLineAction(OFFER_ID, CONFIG_ID);
    expect(result).toEqual({ success: true });
    expect(mockRemoveOfferLine).toHaveBeenCalledWith(OFFER_ID, CONFIG_ID, "u1");
  });

  test("revalidates the offer list (line count) and detail on success", async () => {
    await removeOfferLineAction(OFFER_ID, CONFIG_ID);
    expect(revalidatePath).toHaveBeenCalledWith("/offerte");
    expect(revalidatePath).toHaveBeenCalledWith(`/offerte/${OFFER_ID}`);
  });

  test("rejects ENGINEER (no offer access)", async () => {
    mockGetUserData.mockResolvedValue({ id: "e1", role: "ENGINEER" });
    const result = await removeOfferLineAction(OFFER_ID, CONFIG_ID);
    expect(result).toEqual({ success: false, error: MSG.offer.unauthorized });
    expect(mockRemoveOfferLine).not.toHaveBeenCalled();
  });

  test("returns notFound when the offer is out of scope", async () => {
    mockGetOfferWorkingRevision.mockResolvedValue(null);
    const result = await removeOfferLineAction(OFFER_ID, CONFIG_ID);
    expect(result).toEqual({ success: false, error: MSG.offer.notFound });
    expect(mockRemoveOfferLine).not.toHaveBeenCalled();
  });

  test("surfaces the revision-frozen gate from removeOfferLine", async () => {
    mockRemoveOfferLine.mockRejectedValue(
      new QueryError(MSG.offer.lineCannotEdit),
    );
    const result = await removeOfferLineAction(OFFER_ID, CONFIG_ID);
    expect(result).toEqual({
      success: false,
      error: MSG.offer.lineCannotEdit,
    });
  });
});
