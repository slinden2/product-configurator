// @vitest-environment node
import { beforeEach, describe, expect, test, vi } from "vitest";

// --- Mocks (defined before vi.mock calls) ---

const mockGetUserData = vi.fn();
const mockGetAssemblyChildren = vi.fn();

vi.mock("@/db/queries", () => ({
  getUserData: (...args: unknown[]) => mockGetUserData(...args),
  getAssemblyChildren: (...args: unknown[]) => mockGetAssemblyChildren(...args),
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

// --- Import SUT after mocks ---

import { DatabaseError } from "pg";
import { getAssemblyChildrenAction } from "@/app/actions/bom-lines-actions";
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

  test("returns QueryError message on QueryError", async () => {
    mockGetAssemblyChildren.mockRejectedValue(
      new QueryError("PN non trovato.", 404),
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
