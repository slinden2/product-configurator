// @vitest-environment node
import { beforeEach, describe, expect, test, vi } from "vitest";

// --- Mocks (defined before vi.mock calls) ---

const mockGetUserData = vi.fn();
const mockGetAssemblyChildren = vi.fn();
const mockGetBOM = vi.fn();
const mockExplodeBomsToLeaves = vi.fn();
const mockBuildBomCostExportData = vi.fn();

vi.mock("@/db/queries", () => ({
  getUserData: (...args: unknown[]) => mockGetUserData(...args),
  getAssemblyChildren: (...args: unknown[]) => mockGetAssemblyChildren(...args),
  getBOM: (...args: unknown[]) => mockGetBOM(...args),
  QueryError: class QueryError extends Error {
    constructor(message: string) {
      super(message);
      this.name = "QueryError";
    }
  },
}));

vi.mock("@/lib/BOM/explode-bom", () => ({
  explodeBomsToLeaves: (...args: unknown[]) => mockExplodeBomsToLeaves(...args),
}));

vi.mock("@/app/configurazioni/bom/[id]/bom-helpers", () => ({
  buildBomCostExportData: (...args: unknown[]) =>
    mockBuildBomCostExportData(...args),
}));

vi.mock("pg", () => ({
  DatabaseError: class DatabaseError extends Error {
    constructor(message: string) {
      super(message);
      this.name = "DatabaseError";
    }
  },
}));

// --- Import SUT after mocks ---

import { DatabaseError } from "pg";
import {
  buildBomCostExportAction,
  getAssemblyChildrenAction,
} from "@/app/actions/bom-lines-actions";
import { QueryError } from "@/db/queries";
import { MSG } from "@/lib/messages";

// --- Helpers ---

const MOCK_USER = { id: "user-1", role: "ENGINEER" };

const MOCK_CHILDREN = [
  {
    pn: "CHILD-001",
    description: "Child part",
    qty: 2,
    pos: 1,
    pn_type: "PART" as const,
    is_phantom: false,
  },
  {
    pn: "CHILD-002",
    description: "Child assembly",
    qty: 1,
    pos: 2,
    pn_type: "ASSY" as const,
    is_phantom: false,
  },
];

// --- Tests ---

describe("getAssemblyChildrenAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUserData.mockResolvedValue(MOCK_USER);
    mockGetAssemblyChildren.mockResolvedValue(MOCK_CHILDREN);
  });

  test("returns children for a valid parent PN", async () => {
    const result = await getAssemblyChildrenAction("PARENT-001");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(MOCK_CHILDREN);
    }
    expect(mockGetAssemblyChildren).toHaveBeenCalledWith("PARENT-001");
  });

  test("trims whitespace from the parent PN", async () => {
    await getAssemblyChildrenAction("  PARENT-001  ");
    expect(mockGetAssemblyChildren).toHaveBeenCalledWith("PARENT-001");
  });

  test("returns empty data without querying for empty parentPn", async () => {
    const result = await getAssemblyChildrenAction("");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual([]);
    }
    expect(mockGetAssemblyChildren).not.toHaveBeenCalled();
  });

  test("returns empty data without querying for whitespace-only parentPn", async () => {
    const result = await getAssemblyChildrenAction("   ");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual([]);
    }
    expect(mockGetAssemblyChildren).not.toHaveBeenCalled();
  });

  test("returns auth error when user is not authenticated", async () => {
    mockGetUserData.mockResolvedValue(null);
    const result = await getAssemblyChildrenAction("PARENT-001");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe(MSG.auth.userNotAuthenticated);
    }
    expect(mockGetAssemblyChildren).not.toHaveBeenCalled();
  });

  test.each([
    "SALES",
    "SALES_MANAGER",
    "SALES_DIRECTOR",
  ])("returns unauthorized error for %s user without querying", async (role) => {
    mockGetUserData.mockResolvedValue({ id: "user-1", role });
    const result = await getAssemblyChildrenAction("PARENT-001");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe(MSG.bom.unauthorized);
    }
    expect(mockGetAssemblyChildren).not.toHaveBeenCalled();
  });

  test("role gate wins over the empty-PN early return", async () => {
    mockGetUserData.mockResolvedValue({ id: "user-1", role: "SALES" });
    const result = await getAssemblyChildrenAction("");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe(MSG.bom.unauthorized);
    }
  });

  test("returns QueryError message on QueryError", async () => {
    mockGetAssemblyChildren.mockRejectedValue(
      new QueryError("PN non trovato."),
    );
    const result = await getAssemblyChildrenAction("PARENT-001");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("PN non trovato.");
    }
  });

  test("returns db error message on DatabaseError", async () => {
    mockGetAssemblyChildren.mockRejectedValue(
      new (DatabaseError as unknown as typeof Error)("pg internal error"),
    );
    const result = await getAssemblyChildrenAction("PARENT-001");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe(MSG.db.error);
    }
  });

  test("returns unknown error message on unexpected error", async () => {
    mockGetAssemblyChildren.mockRejectedValue(new Error("unexpected"));
    const result = await getAssemblyChildrenAction("PARENT-001");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe(MSG.db.unknown);
    }
  });
});

describe("buildBomCostExportAction", () => {
  const CONF_ID = 42;
  const MOCK_BOM = { configuration: { id: CONF_ID } };

  const MOCK_COST_DATA = {
    generalBOM: [{ pn: "G-1", description: "General", qty: 1, cost: 10 }],
    waterTankBOMs: [],
    washBayBOMs: [],
  };

  const MOCK_EXPLODED = {
    generalBOM: [
      { pn: "LEAF-001", description: "Leaf part", qty: 4, cost: 12.5 },
    ],
    waterTankBOMs: [],
    washBayBOMs: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUserData.mockResolvedValue(MOCK_USER);
    mockGetBOM.mockResolvedValue(MOCK_BOM);
    mockBuildBomCostExportData.mockResolvedValue(MOCK_COST_DATA);
    mockExplodeBomsToLeaves.mockResolvedValue(MOCK_EXPLODED);
  });

  test("returns the cost BOMs plus exploded leaves for an authorized user", async () => {
    const result = await buildBomCostExportAction(CONF_ID);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({
        ...MOCK_COST_DATA,
        exploded: MOCK_EXPLODED,
      });
    }
    // Everything derives from confId server-side (no client-supplied BOM).
    expect(mockGetBOM).toHaveBeenCalledWith(CONF_ID, MOCK_USER);
    expect(mockBuildBomCostExportData).toHaveBeenCalledWith(MOCK_BOM, CONF_ID);
    expect(mockExplodeBomsToLeaves).toHaveBeenCalledWith(MOCK_COST_DATA);
  });

  test("returns auth error when user is not authenticated", async () => {
    mockGetUserData.mockResolvedValue(null);
    const result = await buildBomCostExportAction(CONF_ID);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe(MSG.auth.userNotAuthenticated);
    }
    expect(mockGetBOM).not.toHaveBeenCalled();
  });

  test.each([
    "SALES",
    "SALES_MANAGER",
    "SALES_DIRECTOR",
  ])("returns unauthorized error for %s user without fetching", async (role) => {
    mockGetUserData.mockResolvedValue({ id: "user-1", role });
    const result = await buildBomCostExportAction(CONF_ID);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe(MSG.bom.unauthorized);
    }
    expect(mockGetBOM).not.toHaveBeenCalled();
  });

  test("returns not-found when the config is missing or out of scope", async () => {
    mockGetBOM.mockResolvedValue(null);
    const result = await buildBomCostExportAction(CONF_ID);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe(MSG.config.notFound);
    }
    expect(mockBuildBomCostExportData).not.toHaveBeenCalled();
    expect(mockExplodeBomsToLeaves).not.toHaveBeenCalled();
  });

  test("returns unknown error message on unexpected error", async () => {
    mockBuildBomCostExportData.mockRejectedValue(new Error("unexpected"));
    const result = await buildBomCostExportAction(CONF_ID);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe(MSG.db.unknown);
    }
  });
});
