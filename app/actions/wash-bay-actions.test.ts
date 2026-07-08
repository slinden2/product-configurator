import { beforeEach, describe, expect, test, vi } from "vitest";
import { mockCanAccessConfiguration } from "@/test/access-mocks";

// --- Mocks ---

const mockGetUserData = vi.fn();
const mockGetConfiguration = vi.fn();
const mockGetWashBaysByConfigId = vi.fn();
const mockInsertWashBay = vi.fn();
const mockUpdateWashBay = vi.fn();
const mockDeleteWashBay = vi.fn();
const mockHasEngineeringBom = vi.fn();
const mockDeleteAllEngineeringBomItems = vi.fn();
const mockTouchConfigurationUpdatedAt = vi.fn();
const mockRepriceOfferLine = vi.fn();
const mockOfferRevisionStatusFor = vi.fn(
  async (..._args: unknown[]) => "DRAFT",
);

vi.mock("@/db/queries", () => ({
  getUserData: (...args: unknown[]) => mockGetUserData(...args),
  canAccessConfiguration: mockCanAccessConfiguration,
  getConfiguration: (...args: unknown[]) => mockGetConfiguration(...args),
  getWashBaysByConfigId: (...args: unknown[]) =>
    mockGetWashBaysByConfigId(...args),
  insertWashBay: (...args: unknown[]) => mockInsertWashBay(...args),
  updateWashBay: (...args: unknown[]) => mockUpdateWashBay(...args),
  deleteWashBay: (...args: unknown[]) => mockDeleteWashBay(...args),
  offerRevisionStatusFor: (...args: unknown[]) =>
    mockOfferRevisionStatusFor(...args),
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

// --- Imports (after mocks) ---

import {
  deleteWashBayAction,
  editWashBayAction,
  insertWashBayAction,
} from "@/app/actions/wash-bay-actions";
import { MSG } from "@/lib/messages";

// --- Helpers ---

const CONF_ID = 1;
const BAY_ID = 10;
const OTHER_BAY_ID = 11;
const OWNER_ID = "owner-123";

function mockConfig(overrides: Record<string, unknown> = {}) {
  return {
    id: CONF_ID,
    user_id: OWNER_ID,
    origin: "STANDALONE",
    status: "DRAFT",
    supply_type: "ENERGY_CHAIN",
    name: "Test",
    ...overrides,
  };
}

const qualifyingBay = {
  id: BAY_ID,
  has_gantry: true,
  energy_chain_width: "L200",
};
const plainBay = {
  id: OTHER_BAY_ID,
  has_gantry: false,
  energy_chain_width: null,
};

/** All washBaySchema fields have defaults/optionals — {} is a valid plain bay. */
const plainBayFormData = {};
const qualifyingBayFormData = {
  has_gantry: true,
  energy_chain_width: "L200",
  ec_signal_cable_qty: 1,
  ec_water_1_tube_qty: 1,
};

// --- Tests ---

describe("wash bay actions — ENERGY_CHAIN reverse guard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUserData.mockResolvedValue({
      id: OWNER_ID,
      role: "ENGINEER",
      initials: "EN",
    });
    mockGetConfiguration.mockResolvedValue(mockConfig());
    mockGetWashBaysByConfigId.mockResolvedValue([qualifyingBay, plainBay]);
    mockInsertWashBay.mockResolvedValue({ id: 99 });
    mockUpdateWashBay.mockResolvedValue({ id: BAY_ID });
    mockDeleteWashBay.mockResolvedValue({ id: BAY_ID });
    mockHasEngineeringBom.mockResolvedValue(false);
    mockDeleteAllEngineeringBomItems.mockResolvedValue(undefined);
    mockTouchConfigurationUpdatedAt.mockResolvedValue(undefined);
    mockRepriceOfferLine.mockResolvedValue(undefined);
  });

  test("delete of the last qualifying bay is blocked", async () => {
    const result = await deleteWashBayAction(CONF_ID, BAY_ID);
    expect(result).toEqual({
      success: false,
      error: MSG.config.energyChainBayGuard,
    });
    expect(mockDeleteWashBay).not.toHaveBeenCalled();
    expect(mockTouchConfigurationUpdatedAt).not.toHaveBeenCalled();
  });

  test("delete of a non-qualifying bay is allowed", async () => {
    const result = await deleteWashBayAction(CONF_ID, OTHER_BAY_ID);
    expect(result.success).toBe(true);
    expect(mockDeleteWashBay).toHaveBeenCalledWith(
      CONF_ID,
      OTHER_BAY_ID,
      mockTx,
    );
  });

  test("delete of a qualifying bay is allowed when another qualifying bay remains", async () => {
    mockGetWashBaysByConfigId.mockResolvedValue([
      qualifyingBay,
      { id: OTHER_BAY_ID, has_gantry: true, energy_chain_width: "L150" },
    ]);
    const result = await deleteWashBayAction(CONF_ID, BAY_ID);
    expect(result.success).toBe(true);
    expect(mockDeleteWashBay).toHaveBeenCalled();
  });

  test("edit that unsets gantry/width on the last qualifying bay is blocked", async () => {
    const result = await editWashBayAction(CONF_ID, BAY_ID, plainBayFormData);
    expect(result).toEqual({
      success: false,
      error: MSG.config.energyChainBayGuard,
    });
    expect(mockUpdateWashBay).not.toHaveBeenCalled();
  });

  test("edit keeping the bay qualifying is allowed", async () => {
    const result = await editWashBayAction(
      CONF_ID,
      BAY_ID,
      qualifyingBayFormData,
    );
    expect(result.success).toBe(true);
    expect(mockUpdateWashBay).toHaveBeenCalled();
  });

  test("edit of another bay is allowed while the qualifying bay remains", async () => {
    const result = await editWashBayAction(
      CONF_ID,
      OTHER_BAY_ID,
      plainBayFormData,
    );
    expect(result.success).toBe(true);
    expect(mockUpdateWashBay).toHaveBeenCalled();
  });

  test("already-violating config: edits stay allowed (regression-only guard)", async () => {
    mockGetWashBaysByConfigId.mockResolvedValue([plainBay]);
    const result = await editWashBayAction(
      CONF_ID,
      OTHER_BAY_ID,
      plainBayFormData,
    );
    expect(result.success).toBe(true);
    expect(mockUpdateWashBay).toHaveBeenCalled();
  });

  test("already-violating config: deletes stay allowed (regression-only guard)", async () => {
    mockGetWashBaysByConfigId.mockResolvedValue([plainBay]);
    const result = await deleteWashBayAction(CONF_ID, OTHER_BAY_ID);
    expect(result.success).toBe(true);
    expect(mockDeleteWashBay).toHaveBeenCalled();
  });

  test("non-ENERGY_CHAIN config: guard no-ops and does not load bays", async () => {
    mockGetConfiguration.mockResolvedValue(
      mockConfig({ supply_type: "STRAIGHT_SHELF" }),
    );
    const result = await deleteWashBayAction(CONF_ID, BAY_ID);
    expect(result.success).toBe(true);
    expect(mockGetWashBaysByConfigId).not.toHaveBeenCalled();
  });

  test("insert is never guarded", async () => {
    const result = await insertWashBayAction(CONF_ID, plainBayFormData);
    expect(result.success).toBe(true);
    expect(mockGetWashBaysByConfigId).not.toHaveBeenCalled();
    expect(mockInsertWashBay).toHaveBeenCalled();
  });
});
