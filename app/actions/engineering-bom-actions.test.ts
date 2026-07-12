import { beforeEach, describe, expect, test, vi } from "vitest";

// --- Mocks ---

const mockGetUserData = vi.fn();
const mockGetConfigurationWithTanksAndBays = vi.fn();
const mockAssertConfigurationStatus = vi.fn();
const mockHasEngineeringBom = vi.fn();
const mockGetPartNumbersByArray = vi.fn();
const mockInsertEngineeringBomItems = vi.fn();
const mockSearchPartNumbers = vi.fn();
const mockInsertActivityLog = vi.fn();
const mockLogActivity = vi.fn();
// STANDALONE configs ignore this; OFFER tests default the revision to DRAFT.
const mockOfferRevisionStatusFor = vi.fn(
  async (..._args: unknown[]) => "DRAFT",
);

vi.mock("@/db/queries", () => ({
  getUserData: (...args: unknown[]) => mockGetUserData(...args),
  getConfigurationWithTanksAndBays: (...args: unknown[]) =>
    mockGetConfigurationWithTanksAndBays(...args),
  assertConfigurationStatus: (...args: unknown[]) =>
    mockAssertConfigurationStatus(...args),
  offerRevisionStatusFor: (...args: unknown[]) =>
    mockOfferRevisionStatusFor(...args),
  hasEngineeringBom: (...args: unknown[]) => mockHasEngineeringBom(...args),
  getPartNumbersByArray: (...args: unknown[]) =>
    mockGetPartNumbersByArray(...args),
  insertEngineeringBomItems: (...args: unknown[]) =>
    mockInsertEngineeringBomItems(...args),
  searchPartNumbers: (...args: unknown[]) => mockSearchPartNumbers(...args),
  insertActivityLog: (...args: unknown[]) => mockInsertActivityLog(...args),
  logActivity: (...args: unknown[]) => mockLogActivity(...args),
  QueryError: class QueryError extends Error {
    constructor(message: string) {
      super(message);
      this.name = "QueryError";
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

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

// Mock the db module for direct drizzle calls (transaction)
const mockInsertReturning = vi.fn();
const mockTxDelete = vi.fn(() => ({
  where: vi.fn().mockResolvedValue(undefined),
}));
// The insert chain must serve both regenerate (`await ....values(items)`) and
// add (`....values({...}).returning()`), so it is an awaitable Promise that
// also carries the returning step.
const mockTxInsertValues = vi.fn((): unknown =>
  Object.assign(Promise.resolve(undefined), {
    returning: mockInsertReturning,
  }),
);
const mockTxInsert = vi.fn(() => ({ values: mockTxInsertValues }));
const mockTxSelectWhere = vi.fn();
const mockTxSelect = vi.fn(() => ({
  from: vi.fn(() => ({ where: mockTxSelectWhere })),
}));
const mockTxUpdateReturning = vi.fn();
const mockTxUpdateWhere = vi.fn(() => ({ returning: mockTxUpdateReturning }));
const mockTxUpdateSet = vi.fn(() => ({ where: mockTxUpdateWhere }));
const mockTxUpdate = vi.fn(() => ({ set: mockTxUpdateSet }));
const mockTransaction = vi.fn();

vi.mock("@/db", () => ({
  db: {
    transaction: (fn: unknown) => mockTransaction(fn),
  },
}));

// Mock BOM module
const mockBuildCompleteBOM = vi.fn();
vi.mock("@/lib/BOM", () => ({
  BOM: {
    init: () => ({
      buildCompleteBOM: mockBuildCompleteBOM,
    }),
  },
}));

// Mock drizzle-orm operators (keep originals, override sql tag)
vi.mock("drizzle-orm", async (importOriginal) => {
  const actual = await importOriginal<typeof import("drizzle-orm")>();
  return {
    ...actual,
    sql: (strings: TemplateStringsArray, ...values: unknown[]) => ({
      strings,
      values,
    }),
  };
});

// --- Imports ---

import { revalidatePath } from "next/cache";
import {
  addEngineeringBomItemAction,
  regenerateEngineeringBomAction,
  searchPartNumbersAction,
  snapshotEngineeringBomAction,
  toggleDeleteEngineeringBomItemAction,
  updateEngineeringBomItemQtyAction,
} from "@/app/actions/engineering-bom-actions";
import { MSG } from "@/lib/messages";
import type { ActionResult } from "@/types";

// --- Helpers ---

const CONF_ID = 1;
const ITEM_ID = 10;

function mockConfig(overrides: Record<string, unknown> = {}) {
  return {
    id: CONF_ID,
    user_id: "owner-123",
    // Engineering BOM work runs on standalone technical configs; sales-status
    // tests override origin to OFFER.
    origin: "STANDALONE",
    status: "DRAFT",
    name: "Test Config",
    water_tanks: [],
    wash_bays: [],
    ...overrides,
  };
}

function mockUser(overrides: Record<string, unknown> = {}) {
  return {
    id: "engineer-user",
    role: "ENGINEER",
    initials: "IU",
    ...overrides,
  };
}

const MOCK_GENERAL_BOM = [
  { pn: "PN-001", qty: 2, description: "Brush A", _description: "" },
  { pn: "PN-002", qty: 1, description: "Motor B", _description: "" },
];

const MOCK_TANK_BOMS = [
  [{ pn: "PN-003", qty: 3, description: "Pump C", _description: "" }],
];

const MOCK_BAY_BOMS = [
  [{ pn: "PN-004", qty: 1, description: "Nozzle D", _description: "" }],
];

function setupDefaultMocks() {
  mockGetUserData.mockResolvedValue(mockUser());
  mockGetConfigurationWithTanksAndBays.mockResolvedValue(mockConfig());
  mockAssertConfigurationStatus.mockResolvedValue(undefined);
  mockHasEngineeringBom.mockResolvedValue(false);
  mockGetPartNumbersByArray.mockResolvedValue([
    { pn: "PN-001" },
    { pn: "PN-002" },
    { pn: "PN-003" },
    { pn: "PN-004" },
  ]);
  mockInsertEngineeringBomItems.mockResolvedValue(undefined);
  mockInsertActivityLog.mockResolvedValue(undefined);
  mockLogActivity.mockResolvedValue(undefined);
  mockInsertReturning.mockResolvedValue([{ id: ITEM_ID }]);
  mockBuildCompleteBOM.mockResolvedValue({
    generalBOM: MOCK_GENERAL_BOM,
    waterTankBOMs: MOCK_TANK_BOMS,
    washBayBOMs: MOCK_BAY_BOMS,
  });
  mockSearchPartNumbers.mockResolvedValue([]);
  mockTxSelectWhere.mockResolvedValue([{ qty: 2, is_deleted: false }]);
  mockTxUpdateReturning.mockResolvedValue([{ id: ITEM_ID }]);
  mockTransaction.mockImplementation(
    async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        delete: mockTxDelete,
        insert: mockTxInsert,
        select: mockTxSelect,
        update: mockTxUpdate,
      }),
  );
}

// --- Tests ---

describe("snapshotEngineeringBomAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupDefaultMocks();
  });

  // -- Authorization (tested via snapshot, applies to all actions) --

  test("returns error when user is not authenticated", async () => {
    mockGetUserData.mockResolvedValue(null);
    const result = await snapshotEngineeringBomAction(CONF_ID);
    expect(result.success).toBe(false);
    expect(result).toHaveProperty("error", MSG.auth.userNotAuthenticated);
  });

  test("returns error when user is SALES", async () => {
    mockGetUserData.mockResolvedValue(mockUser({ role: "SALES" }));
    const result: ActionResult = await snapshotEngineeringBomAction(CONF_ID);
    expect(result.success).toBe(false);
    expect(result.error).toContain(MSG.bom.unauthorized);
  });

  test.each([
    "SALES_MANAGER",
    "SALES_DIRECTOR",
  ] as const)("returns error when user is %s (BOM is ENGINEER/ADMIN only)", async (role) => {
    mockGetUserData.mockResolvedValue(mockUser({ role }));
    const result: ActionResult = await snapshotEngineeringBomAction(CONF_ID);
    expect(result.success).toBe(false);
    expect(result.error).toContain(MSG.bom.unauthorized);
  });

  test("returns error when configuration not found", async () => {
    mockGetConfigurationWithTanksAndBays.mockResolvedValue(null);
    const result: ActionResult = await snapshotEngineeringBomAction(CONF_ID);
    expect(result.success).toBe(false);
    expect(result.error).toBe(MSG.config.notFound);
  });

  test("returns error when config is TECH_APPROVED", async () => {
    mockGetConfigurationWithTanksAndBays.mockResolvedValue(
      mockConfig({ status: "TECH_APPROVED" }),
    );
    const result: ActionResult = await snapshotEngineeringBomAction(CONF_ID);
    expect(result.success).toBe(false);
    expect(result.error).toBe(MSG.bom.unauthorizedState);
  });

  test("returns error when config is CLOSED", async () => {
    mockGetConfigurationWithTanksAndBays.mockResolvedValue(
      mockConfig({ status: "CLOSED" }),
    );
    const result: ActionResult = await snapshotEngineeringBomAction(CONF_ID);
    expect(result.success).toBe(false);
    expect(result.error).toBe(MSG.bom.unauthorizedState);
  });

  test("ADMIN can snapshot a pre-handoff OFFER config (revision DRAFT)", async () => {
    mockGetUserData.mockResolvedValue(mockUser({ role: "ADMIN" }));
    mockGetConfigurationWithTanksAndBays.mockResolvedValue(
      mockConfig({ status: "DRAFT", origin: "OFFER" }),
    );
    const result = await snapshotEngineeringBomAction(CONF_ID);
    expect(result.success).toBe(true);
  });

  test("ENGINEER can snapshot DRAFT config", async () => {
    const result = await snapshotEngineeringBomAction(CONF_ID);
    expect(result.success).toBe(true);
  });

  test("re-asserts the config status inside the transaction (issue #240)", async () => {
    await snapshotEngineeringBomAction(CONF_ID);
    expect(mockAssertConfigurationStatus).toHaveBeenCalledWith(
      CONF_ID,
      "DRAFT",
      expect.anything(),
    );
  });

  test("surfaces the 409 conflict and skips the insert when the status moved between gate and tx (lost race, issue #240)", async () => {
    const { QueryError } = await import("@/db/queries");
    mockAssertConfigurationStatus.mockRejectedValue(
      new QueryError(MSG.config.statusConflict),
    );
    const result: ActionResult = await snapshotEngineeringBomAction(CONF_ID);
    expect(result.success).toBe(false);
    expect(result.error).toBe(MSG.config.statusConflict);
    expect(mockInsertEngineeringBomItems).not.toHaveBeenCalled();
  });

  // -- Snapshot-specific --

  test("succeeds and inserts BOM items", async () => {
    const result = await snapshotEngineeringBomAction(CONF_ID);
    expect(result.success).toBe(true);
    expect(mockInsertEngineeringBomItems).toHaveBeenCalledTimes(1);

    const insertedItems = mockInsertEngineeringBomItems.mock.calls[0][0];
    // 2 general + 1 tank + 1 bay = 4 items
    expect(insertedItems).toHaveLength(4);
  });

  test("inserted items have correct structure", async () => {
    await snapshotEngineeringBomAction(CONF_ID);

    const insertedItems = mockInsertEngineeringBomItems.mock.calls[0][0];
    const generalItem = insertedItems[0];
    expect(generalItem).toMatchObject({
      configuration_id: CONF_ID,
      category: "GENERAL",
      category_index: 0,
      pn: "PN-001",
      qty: 2,
      original_qty: 2,
      is_deleted: false,
      is_added: false,
      sort_order: 0,
    });
  });

  test("marks items not in catalog as is_custom", async () => {
    // Only PN-001 exists in catalog
    mockGetPartNumbersByArray.mockResolvedValue([{ pn: "PN-001" }]);

    await snapshotEngineeringBomAction(CONF_ID);

    const insertedItems = mockInsertEngineeringBomItems.mock.calls[0][0];
    const catalogItem = insertedItems.find(
      (i: { pn: string }) => i.pn === "PN-001",
    );
    const customItem = insertedItems.find(
      (i: { pn: string }) => i.pn === "PN-002",
    );
    expect(catalogItem.is_custom).toBe(false);
    expect(customItem.is_custom).toBe(true);
  });

  test("categorizes items correctly (GENERAL, WATER_TANK, WASH_BAY)", async () => {
    await snapshotEngineeringBomAction(CONF_ID);

    const insertedItems = mockInsertEngineeringBomItems.mock.calls[0][0];
    const categories = insertedItems.map(
      (i: { category: string }) => i.category,
    );
    expect(categories).toEqual([
      "GENERAL",
      "GENERAL",
      "WATER_TANK",
      "WASH_BAY",
    ]);
  });

  test("prevents duplicate snapshot when BOM already exists", async () => {
    mockHasEngineeringBom.mockResolvedValue(true);
    const result: ActionResult = await snapshotEngineeringBomAction(CONF_ID);
    expect(result.success).toBe(false);
    expect(result.error).toContain("esiste già");
    expect(mockInsertEngineeringBomItems).not.toHaveBeenCalled();
  });

  test("re-checks hasEngineeringBom inside the transaction and rejects the losing concurrent snapshot (issue #246)", async () => {
    // The pre-tx fast-path sees no BOM; by the time the tx acquires the
    // config row lock, a concurrent snapshot has committed its items.
    mockHasEngineeringBom
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);
    const result: ActionResult = await snapshotEngineeringBomAction(CONF_ID);
    expect(result.success).toBe(false);
    expect(result.error).toBe(MSG.bom.alreadyExists);
    expect(mockInsertEngineeringBomItems).not.toHaveBeenCalled();
    expect(mockHasEngineeringBom).toHaveBeenLastCalledWith(
      CONF_ID,
      expect.anything(),
    );
  });

  test("runs the in-tx duplicate re-check with the transaction handle on success", async () => {
    await snapshotEngineeringBomAction(CONF_ID);
    expect(mockHasEngineeringBom).toHaveBeenCalledTimes(2);
    expect(mockHasEngineeringBom).toHaveBeenLastCalledWith(
      CONF_ID,
      expect.anything(),
    );
    expect(mockInsertEngineeringBomItems).toHaveBeenCalledTimes(1);
  });

  test("revalidates config routes (BOM + margin) on success", async () => {
    await snapshotEngineeringBomAction(CONF_ID);
    expect(revalidatePath).toHaveBeenCalledWith(
      `/configurazioni/bom/${CONF_ID}`,
    );
    expect(revalidatePath).toHaveBeenCalledWith(
      `/configurazioni/marginalita/${CONF_ID}`,
    );
  });

  test("refuses an ENERGY_CHAIN config without a qualifying bay", async () => {
    mockGetConfigurationWithTanksAndBays.mockResolvedValue(
      mockConfig({
        supply_type: "ENERGY_CHAIN",
        wash_bays: [{ has_gantry: true, energy_chain_width: null }],
      }),
    );
    const result: ActionResult = await snapshotEngineeringBomAction(CONF_ID);
    expect(result.success).toBe(false);
    expect(result.error).toBe(MSG.config.energyChainRequiresGantry);
    expect(mockInsertEngineeringBomItems).not.toHaveBeenCalled();
  });

  test("snapshots an ENERGY_CHAIN config with a qualifying bay", async () => {
    mockGetConfigurationWithTanksAndBays.mockResolvedValue(
      mockConfig({
        supply_type: "ENERGY_CHAIN",
        wash_bays: [{ has_gantry: true, energy_chain_width: "L200" }],
      }),
    );
    const result = await snapshotEngineeringBomAction(CONF_ID);
    expect(result.success).toBe(true);
    expect(mockInsertEngineeringBomItems).toHaveBeenCalled();
  });

  test("returns generic error on DB failure", async () => {
    mockInsertEngineeringBomItems.mockRejectedValue(new Error("DB down"));
    const result: ActionResult = await snapshotEngineeringBomAction(CONF_ID);
    expect(result.success).toBe(false);
    expect(result.error).toBe(MSG.db.unknown);
  });

  test("does not revalidate when audit log insert fails (BOM_GENERATE rolls back)", async () => {
    mockInsertActivityLog.mockRejectedValue(new Error("audit failure"));
    const result: ActionResult = await snapshotEngineeringBomAction(CONF_ID);
    expect(result.success).toBe(false);
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

describe("regenerateEngineeringBomAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupDefaultMocks();
  });

  test("succeeds using a transaction (delete + insert)", async () => {
    const result = await regenerateEngineeringBomAction(CONF_ID);
    expect(result.success).toBe(true);
    expect(mockTransaction).toHaveBeenCalledTimes(1);
    expect(mockTxDelete).toHaveBeenCalled();
    expect(mockTxInsert).toHaveBeenCalled();
  });

  test("surfaces the 409 conflict and skips delete + insert on a lost status race (issue #240)", async () => {
    const { QueryError } = await import("@/db/queries");
    mockAssertConfigurationStatus.mockRejectedValue(
      new QueryError(MSG.config.statusConflict),
    );
    const result: ActionResult = await regenerateEngineeringBomAction(CONF_ID);
    expect(result.success).toBe(false);
    expect(result.error).toBe(MSG.config.statusConflict);
    expect(mockAssertConfigurationStatus).toHaveBeenCalledWith(
      CONF_ID,
      "DRAFT",
      expect.anything(),
    );
    expect(mockTxDelete).not.toHaveBeenCalled();
    expect(mockTxInsert).not.toHaveBeenCalled();
  });

  test("works even without existing BOM (no-op delete)", async () => {
    const result = await regenerateEngineeringBomAction(CONF_ID);
    expect(result.success).toBe(true);
    // Delete is always called in the transaction regardless
    expect(mockTxDelete).toHaveBeenCalled();
  });

  test("does NOT check hasEngineeringBom (unlike snapshot)", async () => {
    await regenerateEngineeringBomAction(CONF_ID);
    expect(mockHasEngineeringBom).not.toHaveBeenCalled();
  });

  test("revalidates config routes (BOM + margin) on success", async () => {
    await regenerateEngineeringBomAction(CONF_ID);
    expect(revalidatePath).toHaveBeenCalledWith(
      `/configurazioni/bom/${CONF_ID}`,
    );
    expect(revalidatePath).toHaveBeenCalledWith(
      `/configurazioni/marginalita/${CONF_ID}`,
    );
  });

  test("returns error when user is SALES", async () => {
    mockGetUserData.mockResolvedValue(mockUser({ role: "SALES" }));
    const result: ActionResult = await regenerateEngineeringBomAction(CONF_ID);
    expect(result.success).toBe(false);
    expect(result.error).toContain(MSG.bom.unauthorized);
  });

  test("returns error when config is TECH_APPROVED", async () => {
    mockGetConfigurationWithTanksAndBays.mockResolvedValue(
      mockConfig({ status: "TECH_APPROVED" }),
    );
    const result = await regenerateEngineeringBomAction(CONF_ID);
    expect(result.success).toBe(false);
  });

  test("returns generic error on transaction failure", async () => {
    mockTransaction.mockRejectedValue(new Error("TX failed"));
    const result: ActionResult = await regenerateEngineeringBomAction(CONF_ID);
    expect(result.success).toBe(false);
    expect(result.error).toBe(MSG.db.unknown);
  });

  test("refuses an ENERGY_CHAIN config without a qualifying bay", async () => {
    mockGetConfigurationWithTanksAndBays.mockResolvedValue(
      mockConfig({ supply_type: "ENERGY_CHAIN", wash_bays: [] }),
    );
    const result: ActionResult = await regenerateEngineeringBomAction(CONF_ID);
    expect(result.success).toBe(false);
    expect(result.error).toBe(MSG.config.energyChainRequiresGantry);
    expect(mockTransaction).not.toHaveBeenCalled();
    expect(mockTxDelete).not.toHaveBeenCalled();
  });

  test("regenerates an ENERGY_CHAIN config with a qualifying bay", async () => {
    mockGetConfigurationWithTanksAndBays.mockResolvedValue(
      mockConfig({
        supply_type: "ENERGY_CHAIN",
        wash_bays: [{ has_gantry: true, energy_chain_width: "L150" }],
      }),
    );
    const result = await regenerateEngineeringBomAction(CONF_ID);
    expect(result.success).toBe(true);
    expect(mockTxInsert).toHaveBeenCalled();
  });

  test("does not revalidate when audit log insert fails (BOM_REGENERATE rolls back)", async () => {
    mockInsertActivityLog.mockRejectedValue(new Error("audit failure"));
    const result: ActionResult = await regenerateEngineeringBomAction(CONF_ID);
    expect(result.success).toBe(false);
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

describe("addEngineeringBomItemAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupDefaultMocks();
    // Manual items require an existing rule-generated snapshot (#246).
    mockHasEngineeringBom.mockResolvedValue(true);
  });

  const validFormData = {
    pn: "PN-NEW",
    qty: 5,
    description: "New part",
    category: "GENERAL",
    category_index: 0,
    is_custom: false,
  };

  test("succeeds with valid catalog item", async () => {
    const result = await addEngineeringBomItemAction(CONF_ID, validFormData);
    expect(result.success).toBe(true);
    expect(mockTxInsert).toHaveBeenCalled();
  });

  test("re-asserts the config status inside the insert transaction (issue #240)", async () => {
    await addEngineeringBomItemAction(CONF_ID, validFormData);
    expect(mockAssertConfigurationStatus).toHaveBeenCalledWith(
      CONF_ID,
      "DRAFT",
      expect.anything(),
    );
  });

  test("surfaces the 409 conflict and skips insert + log on a lost status race (issue #240)", async () => {
    const { QueryError } = await import("@/db/queries");
    mockAssertConfigurationStatus.mockRejectedValue(
      new QueryError(MSG.config.statusConflict),
    );
    const result: ActionResult = await addEngineeringBomItemAction(
      CONF_ID,
      validFormData,
    );
    expect(result.success).toBe(false);
    expect(result.error).toBe(MSG.config.statusConflict);
    expect(mockTxInsert).not.toHaveBeenCalled();
    expect(mockLogActivity).not.toHaveBeenCalled();
  });

  test("rejects a manual item when no snapshot exists (mint-from-nothing, issue #246)", async () => {
    mockHasEngineeringBom.mockResolvedValue(false);
    const result: ActionResult = await addEngineeringBomItemAction(
      CONF_ID,
      validFormData,
    );
    expect(result.success).toBe(false);
    expect(result.error).toBe(MSG.bom.snapshotRequired);
    expect(mockTxInsert).not.toHaveBeenCalled();
    expect(mockLogActivity).not.toHaveBeenCalled();
  });

  test("checks the snapshot precondition inside the transaction", async () => {
    await addEngineeringBomItemAction(CONF_ID, validFormData);
    expect(mockHasEngineeringBom).toHaveBeenCalledWith(
      CONF_ID,
      expect.anything(),
    );
  });

  test("succeeds with custom item", async () => {
    const result = await addEngineeringBomItemAction(CONF_ID, {
      ...validFormData,
      is_custom: true,
    });
    expect(result.success).toBe(true);
  });

  test("inserted values have is_added=true and original_qty=null", async () => {
    await addEngineeringBomItemAction(CONF_ID, validFormData);
    const call = mockTxInsertValues.mock.calls[0] as unknown[];
    const insertedValues = call[0] as Record<string, unknown>;
    expect(insertedValues.is_added).toBe(true);
    expect(insertedValues.original_qty).toBeNull();
  });

  test("revalidates config routes (BOM + margin) on success", async () => {
    await addEngineeringBomItemAction(CONF_ID, validFormData);
    expect(revalidatePath).toHaveBeenCalledWith(
      `/configurazioni/bom/${CONF_ID}`,
    );
    expect(revalidatePath).toHaveBeenCalledWith(
      `/configurazioni/marginalita/${CONF_ID}`,
    );
  });

  test("returns validation error for empty pn", async () => {
    const result = await addEngineeringBomItemAction(CONF_ID, {
      ...validFormData,
      pn: "",
    });
    expect(result.success).toBe(false);
    expect(result).toHaveProperty("error");
  });

  test("returns validation error for qty < 1", async () => {
    const result = await addEngineeringBomItemAction(CONF_ID, {
      ...validFormData,
      qty: 0,
    });
    expect(result.success).toBe(false);
    expect(result).toHaveProperty("error");
  });

  test("returns validation error for non-integer qty", async () => {
    const result = await addEngineeringBomItemAction(CONF_ID, {
      ...validFormData,
      qty: 1.5,
    });
    expect(result.success).toBe(false);
    expect(result).toHaveProperty("error");
  });

  test("returns validation error for invalid category", async () => {
    const result = await addEngineeringBomItemAction(CONF_ID, {
      ...validFormData,
      category: "INVALID",
    });
    expect(result.success).toBe(false);
    expect(result).toHaveProperty("error");
  });

  test("returns validation error for missing required fields", async () => {
    const result = await addEngineeringBomItemAction(CONF_ID, {});
    expect(result.success).toBe(false);
    expect(result).toHaveProperty("error");
  });

  test("returns specific DB error message on insert failure", async () => {
    mockInsertReturning.mockRejectedValueOnce(new Error("Unique constraint"));
    const result: ActionResult = await addEngineeringBomItemAction(
      CONF_ID,
      validFormData,
    );
    expect(result.success).toBe(false);
    expect(result.error).toBe("Errore sconosciuto.");
  });

  test("logs BOM_ITEM_ADD via tolerant logActivity on success", async () => {
    await addEngineeringBomItemAction(CONF_ID, validFormData);
    expect(mockLogActivity).toHaveBeenCalledWith({
      userId: "engineer-user",
      action: "BOM_ITEM_ADD",
      targetEntity: "engineering_bom_item",
      targetId: ITEM_ID.toString(),
      metadata: {
        configuration_id: CONF_ID,
        pn: "PN-NEW",
        qty: 5,
        category: "GENERAL",
        category_index: 0,
      },
    });
  });

  test("does not log when insert fails", async () => {
    mockInsertReturning.mockRejectedValueOnce(new Error("DB down"));
    await addEngineeringBomItemAction(CONF_ID, validFormData);
    expect(mockLogActivity).not.toHaveBeenCalled();
  });

  test("returns auth error for SALES user", async () => {
    mockGetUserData.mockResolvedValue(mockUser({ role: "SALES" }));
    const result: ActionResult = await addEngineeringBomItemAction(
      CONF_ID,
      validFormData,
    );
    expect(result.success).toBe(false);
    expect(result.error).toContain(MSG.bom.unauthorized);
    expect(mockTransaction).not.toHaveBeenCalled();
  });
});

describe("updateEngineeringBomItemQtyAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupDefaultMocks();
  });

  test("succeeds with valid qty", async () => {
    const result = await updateEngineeringBomItemQtyAction(CONF_ID, ITEM_ID, 3);
    expect(result.success).toBe(true);
    expect(mockTransaction).toHaveBeenCalledTimes(1);
    expect(mockTxUpdateSet).toHaveBeenCalledWith({ qty: 3 });
    expect(mockAssertConfigurationStatus).toHaveBeenCalledWith(
      CONF_ID,
      "DRAFT",
      expect.anything(),
    );
  });

  test("surfaces the 409 conflict and skips the update on a lost status race (issue #240)", async () => {
    const { QueryError } = await import("@/db/queries");
    mockAssertConfigurationStatus.mockRejectedValue(
      new QueryError(MSG.config.statusConflict),
    );
    const result: ActionResult = await updateEngineeringBomItemQtyAction(
      CONF_ID,
      ITEM_ID,
      3,
    );
    expect(result.success).toBe(false);
    expect(result.error).toBe(MSG.config.statusConflict);
    expect(mockTxUpdate).not.toHaveBeenCalled();
  });

  test("logs BOM_ITEM_QTY_UPDATE with old/new qty inside the transaction", async () => {
    await updateEngineeringBomItemQtyAction(CONF_ID, ITEM_ID, 3);
    expect(mockInsertActivityLog).toHaveBeenCalledWith(
      {
        userId: "engineer-user",
        action: "BOM_ITEM_QTY_UPDATE",
        targetEntity: "engineering_bom_item",
        targetId: ITEM_ID.toString(),
        metadata: { configuration_id: CONF_ID, old_qty: 2, new_qty: 3 },
      },
      expect.anything(),
    );
  });

  test("does not revalidate when audit log insert fails (qty update rolls back)", async () => {
    mockInsertActivityLog.mockRejectedValue(new Error("audit failure"));
    const result: ActionResult = await updateEngineeringBomItemQtyAction(
      CONF_ID,
      ITEM_ID,
      3,
    );
    expect(result.success).toBe(false);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  test("revalidates config routes (BOM + margin) on success", async () => {
    await updateEngineeringBomItemQtyAction(CONF_ID, ITEM_ID, 3);
    expect(revalidatePath).toHaveBeenCalledWith(
      `/configurazioni/bom/${CONF_ID}`,
    );
    expect(revalidatePath).toHaveBeenCalledWith(
      `/configurazioni/marginalita/${CONF_ID}`,
    );
  });

  test("rejects qty = 0", async () => {
    const result: ActionResult = await updateEngineeringBomItemQtyAction(
      CONF_ID,
      ITEM_ID,
      0,
    );
    expect(result.success).toBe(false);
    expect(result.error).toBe(MSG.bom.invalidQty);
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  test("rejects negative qty", async () => {
    const result: ActionResult = await updateEngineeringBomItemQtyAction(
      CONF_ID,
      ITEM_ID,
      -1,
    );
    expect(result.success).toBe(false);
    expect(result.error).toBe(MSG.bom.invalidQty);
  });

  test("rejects non-integer qty", async () => {
    const result: ActionResult = await updateEngineeringBomItemQtyAction(
      CONF_ID,
      ITEM_ID,
      1.5,
    );
    expect(result.success).toBe(false);
    expect(result.error).toBe(MSG.bom.invalidQty);
  });

  test("returns error when item not found", async () => {
    mockTxSelectWhere.mockResolvedValue([]);
    const result: ActionResult = await updateEngineeringBomItemQtyAction(
      CONF_ID,
      999,
      3,
    );
    expect(result.success).toBe(false);
    expect(result.error).toBe(MSG.bom.rowNotFound);
    expect(mockTxUpdate).not.toHaveBeenCalled();
  });

  test("returns generic error on DB failure", async () => {
    mockTxUpdateReturning.mockRejectedValue(new Error("DB error"));
    const result: ActionResult = await updateEngineeringBomItemQtyAction(
      CONF_ID,
      ITEM_ID,
      3,
    );
    expect(result.success).toBe(false);
    expect(result.error).toBe(MSG.db.unknown);
  });

  test("returns auth error for SALES user", async () => {
    mockGetUserData.mockResolvedValue(mockUser({ role: "SALES" }));
    const result: ActionResult = await updateEngineeringBomItemQtyAction(
      CONF_ID,
      ITEM_ID,
      3,
    );
    expect(result.success).toBe(false);
    expect(result.error).toContain(MSG.bom.unauthorized);
  });

  test("returns error when config is CLOSED", async () => {
    mockGetConfigurationWithTanksAndBays.mockResolvedValue(
      mockConfig({ status: "CLOSED" }),
    );
    const result = await updateEngineeringBomItemQtyAction(CONF_ID, ITEM_ID, 3);
    expect(result.success).toBe(false);
  });
});

describe("toggleDeleteEngineeringBomItemAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupDefaultMocks();
  });

  test("toggles is_deleted from false to true", async () => {
    mockTxSelectWhere.mockResolvedValue([{ is_deleted: false }]);
    const result = await toggleDeleteEngineeringBomItemAction(CONF_ID, ITEM_ID);
    expect(result.success).toBe(true);
    expect(mockTxUpdateSet).toHaveBeenCalledWith({ is_deleted: true });
    expect(mockAssertConfigurationStatus).toHaveBeenCalledWith(
      CONF_ID,
      "DRAFT",
      expect.anything(),
    );
  });

  test("surfaces the 409 conflict and skips the toggle on a lost status race (issue #240)", async () => {
    const { QueryError } = await import("@/db/queries");
    mockAssertConfigurationStatus.mockRejectedValue(
      new QueryError(MSG.config.statusConflict),
    );
    const result: ActionResult = await toggleDeleteEngineeringBomItemAction(
      CONF_ID,
      ITEM_ID,
    );
    expect(result.success).toBe(false);
    expect(result.error).toBe(MSG.config.statusConflict);
    expect(mockTxUpdate).not.toHaveBeenCalled();
  });

  test("toggles is_deleted from true to false (restore)", async () => {
    mockTxSelectWhere.mockResolvedValue([{ is_deleted: true }]);
    const result = await toggleDeleteEngineeringBomItemAction(CONF_ID, ITEM_ID);
    expect(result.success).toBe(true);
    expect(mockTxUpdateSet).toHaveBeenCalledWith({ is_deleted: false });
  });

  test("logs BOM_ITEM_TOGGLE_DELETE with old/new state inside the transaction", async () => {
    mockTxSelectWhere.mockResolvedValue([{ is_deleted: false }]);
    await toggleDeleteEngineeringBomItemAction(CONF_ID, ITEM_ID);
    expect(mockInsertActivityLog).toHaveBeenCalledWith(
      {
        userId: "engineer-user",
        action: "BOM_ITEM_TOGGLE_DELETE",
        targetEntity: "engineering_bom_item",
        targetId: ITEM_ID.toString(),
        metadata: {
          configuration_id: CONF_ID,
          old_is_deleted: false,
          new_is_deleted: true,
        },
      },
      expect.anything(),
    );
  });

  test("does not revalidate when audit log insert fails (toggle rolls back)", async () => {
    mockInsertActivityLog.mockRejectedValue(new Error("audit failure"));
    const result: ActionResult = await toggleDeleteEngineeringBomItemAction(
      CONF_ID,
      ITEM_ID,
    );
    expect(result.success).toBe(false);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  test("revalidates config routes (BOM + margin) on success", async () => {
    await toggleDeleteEngineeringBomItemAction(CONF_ID, ITEM_ID);
    expect(revalidatePath).toHaveBeenCalledWith(
      `/configurazioni/bom/${CONF_ID}`,
    );
    expect(revalidatePath).toHaveBeenCalledWith(
      `/configurazioni/marginalita/${CONF_ID}`,
    );
  });

  test("returns error when item not found", async () => {
    mockTxSelectWhere.mockResolvedValue([]);
    const result: ActionResult = await toggleDeleteEngineeringBomItemAction(
      CONF_ID,
      999,
    );
    expect(result.success).toBe(false);
    expect(result.error).toBe(MSG.bom.rowNotFound);
    expect(mockTxUpdate).not.toHaveBeenCalled();
  });

  test("returns generic error on DB failure", async () => {
    mockTxSelectWhere.mockRejectedValue(new Error("DB error"));
    const result: ActionResult = await toggleDeleteEngineeringBomItemAction(
      CONF_ID,
      ITEM_ID,
    );
    expect(result.success).toBe(false);
    expect(result.error).toBe(MSG.db.unknown);
  });

  test("returns auth error for SALES user", async () => {
    mockGetUserData.mockResolvedValue(mockUser({ role: "SALES" }));
    const result: ActionResult = await toggleDeleteEngineeringBomItemAction(
      CONF_ID,
      ITEM_ID,
    );
    expect(result.success).toBe(false);
    expect(result.error).toContain(MSG.bom.unauthorized);
  });
});

describe("searchPartNumbersAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupDefaultMocks();
  });

  test("returns error when user is not authenticated", async () => {
    mockGetUserData.mockResolvedValue(null);
    const result: ActionResult = await searchPartNumbersAction("test");
    expect(result.success).toBe(false);
    expect(result.error).toBe(MSG.auth.userNotAuthenticated);
  });

  test("returns empty array for empty query", async () => {
    const result = await searchPartNumbersAction("");
    expect(result.success).toBe(true);
    expect(result).toHaveProperty("data", []);
    expect(mockSearchPartNumbers).not.toHaveBeenCalled();
  });

  test("returns empty array for whitespace-only query", async () => {
    const result = await searchPartNumbersAction("   ");
    expect(result.success).toBe(true);
    expect(result).toHaveProperty("data", []);
    expect(mockSearchPartNumbers).not.toHaveBeenCalled();
  });

  test("returns search results for valid query", async () => {
    const mockResults = [
      { pn: "PN-001", description: "Brush A" },
      { pn: "PN-002", description: "Motor B" },
    ];
    mockSearchPartNumbers.mockResolvedValue(mockResults);

    const result = await searchPartNumbersAction("PN");
    expect(result.success).toBe(true);
    expect(result).toHaveProperty("data", mockResults);
    expect(mockSearchPartNumbers).toHaveBeenCalledWith("PN", 20);
  });

  test("trims query before searching", async () => {
    mockSearchPartNumbers.mockResolvedValue([]);
    await searchPartNumbersAction("  PN-001  ");
    expect(mockSearchPartNumbers).toHaveBeenCalledWith("PN-001", 20);
  });

  test("returns generic error on DB failure", async () => {
    mockSearchPartNumbers.mockRejectedValue(new Error("DB error"));
    const result: ActionResult = await searchPartNumbersAction("test");
    expect(result.success).toBe(false);
    expect(result.error).toBe(MSG.db.unknown);
  });

  test.each([
    "SALES",
    "SALES_MANAGER",
    "SALES_DIRECTOR",
  ] as const)("returns auth error for %s user without querying", async (role) => {
    mockGetUserData.mockResolvedValue(mockUser({ role }));
    const result: ActionResult = await searchPartNumbersAction("test");
    expect(result.success).toBe(false);
    expect(result.error).toBe(MSG.bom.unauthorized);
    expect(mockSearchPartNumbers).not.toHaveBeenCalled();
  });

  test("role gate wins over the empty-query early return", async () => {
    mockGetUserData.mockResolvedValue(mockUser({ role: "SALES" }));
    const result: ActionResult = await searchPartNumbersAction("");
    expect(result.success).toBe(false);
    expect(result.error).toBe(MSG.bom.unauthorized);
  });
});
