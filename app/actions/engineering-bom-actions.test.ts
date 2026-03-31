import { describe, test, expect, vi, beforeEach } from "vitest";

// --- Mocks ---

const mockGetUserData = vi.fn();
const mockGetConfigurationWithTanksAndBays = vi.fn();
const mockHasEngineeringBom = vi.fn();
const mockGetPartNumbersByArray = vi.fn();
const mockInsertEngineeringBomItems = vi.fn();
const mockSearchPartNumbers = vi.fn();

vi.mock("@/db/queries", () => ({
  getUserData: (...args: unknown[]) => mockGetUserData(...args),
  getConfigurationWithTanksAndBays: (...args: unknown[]) =>
    mockGetConfigurationWithTanksAndBays(...args),
  hasEngineeringBom: (...args: unknown[]) => mockHasEngineeringBom(...args),
  getPartNumbersByArray: (...args: unknown[]) =>
    mockGetPartNumbersByArray(...args),
  insertEngineeringBomItems: (...args: unknown[]) =>
    mockInsertEngineeringBomItems(...args),
  searchPartNumbers: (...args: unknown[]) => mockSearchPartNumbers(...args),
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

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

// Mock the db module for direct drizzle calls (insert, update, query, transaction)
const mockReturning = vi.fn();
const mockWhere = vi.fn((): unknown => ({ returning: mockReturning }));
const mockSet = vi.fn(() => ({ where: mockWhere }));
const mockValues = vi.fn((): Promise<void> => Promise.resolve());
const mockInsert = vi.fn((_table: unknown) => ({ values: mockValues }));
const mockUpdate = vi.fn((_table: unknown) => ({ set: mockSet }));
const mockFindFirst = vi.fn();
const mockTxDelete = vi.fn(() => ({
  where: vi.fn().mockResolvedValue(undefined),
}));
const mockTxInsert = vi.fn(() => ({
  values: vi.fn().mockResolvedValue(undefined),
}));
const mockTransaction = vi.fn();

vi.mock("@/db", () => ({
  db: {
    insert: (table: unknown) => mockInsert(table),
    update: (table: unknown) => mockUpdate(table),
    query: {
      engineeringBomItems: {
        findFirst: (opts: unknown) => mockFindFirst(opts),
      },
    },
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

import {
  snapshotEngineeringBomAction,
  regenerateEngineeringBomAction,
  addEngineeringBomItemAction,
  updateEngineeringBomItemQtyAction,
  toggleDeleteEngineeringBomItemAction,
  searchPartNumbersAction,
} from "@/app/actions/engineering-bom-actions";
import { MSG } from "@/lib/messages";
import { revalidatePath } from "next/cache";

// --- Helpers ---

type ActionResult = { success: boolean; error?: string };

const CONF_ID = 1;
const ITEM_ID = 10;

function mockConfig(overrides: Record<string, unknown> = {}) {
  return {
    id: CONF_ID,
    user_id: "owner-123",
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
  mockHasEngineeringBom.mockResolvedValue(false);
  mockGetPartNumbersByArray.mockResolvedValue([
    { pn: "PN-001" },
    { pn: "PN-002" },
    { pn: "PN-003" },
    { pn: "PN-004" },
  ]);
  mockInsertEngineeringBomItems.mockResolvedValue(undefined);
  mockBuildCompleteBOM.mockResolvedValue({
    generalBOM: MOCK_GENERAL_BOM,
    waterTankBOMs: MOCK_TANK_BOMS,
    washBayBOMs: MOCK_BAY_BOMS,
  });
  mockSearchPartNumbers.mockResolvedValue([]);
  mockTransaction.mockImplementation(
    async (fn: (tx: unknown) => Promise<void>) => {
      await fn({
        delete: mockTxDelete,
        insert: mockTxInsert,
      });
    },
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

  test("returns error when configuration not found", async () => {
    mockGetConfigurationWithTanksAndBays.mockResolvedValue(null);
    const result: ActionResult = await snapshotEngineeringBomAction(CONF_ID);
    expect(result.success).toBe(false);
    expect(result.error).toBe(MSG.config.notFound);
  });

  test("returns error when config is APPROVED", async () => {
    mockGetConfigurationWithTanksAndBays.mockResolvedValue(
      mockConfig({ status: "APPROVED" }),
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

  test("ADMIN can snapshot SUBMITTED config", async () => {
    mockGetUserData.mockResolvedValue(mockUser({ role: "ADMIN" }));
    mockGetConfigurationWithTanksAndBays.mockResolvedValue(
      mockConfig({ status: "SUBMITTED" }),
    );
    const result = await snapshotEngineeringBomAction(CONF_ID);
    expect(result.success).toBe(true);
  });

  test("ENGINEER can snapshot DRAFT config", async () => {
    const result = await snapshotEngineeringBomAction(CONF_ID);
    expect(result.success).toBe(true);
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

  test("revalidates BOM path on success", async () => {
    await snapshotEngineeringBomAction(CONF_ID);
    expect(revalidatePath).toHaveBeenCalledWith(
      `/configurations/bom/${CONF_ID}`,
    );
  });

  test("returns generic error on DB failure", async () => {
    mockInsertEngineeringBomItems.mockRejectedValue(new Error("DB down"));
    const result: ActionResult = await snapshotEngineeringBomAction(CONF_ID);
    expect(result.success).toBe(false);
    expect(result.error).toBe(MSG.db.unknown);
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

  test("revalidates BOM path on success", async () => {
    await regenerateEngineeringBomAction(CONF_ID);
    expect(revalidatePath).toHaveBeenCalledWith(
      `/configurations/bom/${CONF_ID}`,
    );
  });

  test("returns error when user is SALES", async () => {
    mockGetUserData.mockResolvedValue(mockUser({ role: "SALES" }));
    const result: ActionResult = await regenerateEngineeringBomAction(CONF_ID);
    expect(result.success).toBe(false);
    expect(result.error).toContain(MSG.bom.unauthorized);
  });

  test("returns error when config is APPROVED", async () => {
    mockGetConfigurationWithTanksAndBays.mockResolvedValue(
      mockConfig({ status: "APPROVED" }),
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
});

describe("addEngineeringBomItemAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupDefaultMocks();
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
    expect(mockInsert).toHaveBeenCalled();
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
    const call = mockValues.mock.calls[0] as unknown[];
    const insertedValues = call[0] as Record<string, unknown>;
    expect(insertedValues.is_added).toBe(true);
    expect(insertedValues.original_qty).toBeNull();
  });

  test("revalidates BOM path on success", async () => {
    await addEngineeringBomItemAction(CONF_ID, validFormData);
    expect(revalidatePath).toHaveBeenCalledWith(
      `/configurations/bom/${CONF_ID}`,
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
    mockValues.mockRejectedValueOnce(new Error("Unique constraint"));
    const result: ActionResult = await addEngineeringBomItemAction(
      CONF_ID,
      validFormData,
    );
    expect(result.success).toBe(false);
    expect(result.error).toBe("Errore sconosciuto.");
  });

  test("returns auth error for SALES user", async () => {
    mockGetUserData.mockResolvedValue(mockUser({ role: "SALES" }));
    const result: ActionResult = await addEngineeringBomItemAction(
      CONF_ID,
      validFormData,
    );
    expect(result.success).toBe(false);
    expect(result.error).toContain(MSG.bom.unauthorized);
    expect(mockInsert).not.toHaveBeenCalled();
  });
});

describe("updateEngineeringBomItemQtyAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupDefaultMocks();
    mockReturning.mockResolvedValue([{ id: ITEM_ID }]);
  });

  test("succeeds with valid qty", async () => {
    const result = await updateEngineeringBomItemQtyAction(CONF_ID, ITEM_ID, 3);
    expect(result.success).toBe(true);
    expect(mockUpdate).toHaveBeenCalled();
  });

  test("revalidates BOM path on success", async () => {
    await updateEngineeringBomItemQtyAction(CONF_ID, ITEM_ID, 3);
    expect(revalidatePath).toHaveBeenCalledWith(
      `/configurations/bom/${CONF_ID}`,
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
    expect(mockUpdate).not.toHaveBeenCalled();
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
    mockReturning.mockResolvedValue([]);
    const result: ActionResult = await updateEngineeringBomItemQtyAction(
      CONF_ID,
      999,
      3,
    );
    expect(result.success).toBe(false);
    expect(result.error).toBe(MSG.bom.rowNotFound);
  });

  test("returns generic error on DB failure", async () => {
    mockReturning.mockRejectedValue(new Error("DB error"));
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
    mockFindFirst.mockResolvedValue({ is_deleted: false });
    mockWhere.mockResolvedValue(undefined as never);
  });

  test("toggles is_deleted from false to true", async () => {
    mockFindFirst.mockResolvedValue({ is_deleted: false });
    const result = await toggleDeleteEngineeringBomItemAction(CONF_ID, ITEM_ID);
    expect(result.success).toBe(true);
    expect(mockSet).toHaveBeenCalledWith({ is_deleted: true });
  });

  test("toggles is_deleted from true to false (restore)", async () => {
    mockFindFirst.mockResolvedValue({ is_deleted: true });
    const result = await toggleDeleteEngineeringBomItemAction(CONF_ID, ITEM_ID);
    expect(result.success).toBe(true);
    expect(mockSet).toHaveBeenCalledWith({ is_deleted: false });
  });

  test("revalidates BOM path on success", async () => {
    await toggleDeleteEngineeringBomItemAction(CONF_ID, ITEM_ID);
    expect(revalidatePath).toHaveBeenCalledWith(
      `/configurations/bom/${CONF_ID}`,
    );
  });

  test("returns error when item not found", async () => {
    mockFindFirst.mockResolvedValue(null);
    const result: ActionResult = await toggleDeleteEngineeringBomItemAction(
      CONF_ID,
      999,
    );
    expect(result.success).toBe(false);
    expect(result.error).toBe(MSG.bom.rowNotFound);
  });

  test("returns generic error on DB failure", async () => {
    mockFindFirst.mockRejectedValue(new Error("DB error"));
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

  test("does NOT require ENGINEER/ADMIN role (any authenticated user)", async () => {
    mockGetUserData.mockResolvedValue(mockUser({ role: "SALES" }));
    mockSearchPartNumbers.mockResolvedValue([]);
    const result = await searchPartNumbersAction("test");
    expect(result.success).toBe(true);
  });
});
