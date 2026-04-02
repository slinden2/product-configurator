import { beforeEach, describe, expect, test, vi } from "vitest";
import { getAllUsersWithStats } from "@/db/queries";
import { db } from "@/db";
import { userProfiles } from "@/db/schemas";
import { asc } from "drizzle-orm";

// --- Mocks ---

const mockOrderBy = vi.fn();
const mockGroupBy = vi.fn(() => ({ orderBy: mockOrderBy }));
const mockLeftJoin2 = vi.fn(() => ({ groupBy: mockGroupBy }));
const mockLeftJoin1 = vi.fn(() => ({ leftJoin: mockLeftJoin2 }));
const mockFrom = vi.fn(() => ({ leftJoin: mockLeftJoin1 }));
const mockSelect = vi.fn(() => ({ from: mockFrom }));

vi.mock("@/db", () => ({
  db: { select: vi.fn((...args) => mockSelect(...args)) },
}));

vi.mock("@/db/schemas", () => ({
  userProfiles: {
    id: "id",
    email: "email",
    role: "role",
    initials: "initials",
    last_login_at: "last_login_at",
  },
  configurations: { id: "config_id", user_id: "user_id" },
  activityLogs: { created_at: "created_at", user_id: "user_id" },
}));

vi.mock("drizzle-orm", () => ({
  and: vi.fn(),
  asc: vi.fn((col) => col),
  countDistinct: vi.fn(),
  desc: vi.fn(),
  eq: vi.fn(),
  max: vi.fn(),
  sql: vi.fn(),
}));

// --- Helpers ---

function makeDbRow(overrides = {}) {
  return {
    id: "u-1",
    email: "test@test.com",
    configCount: "5", // DB returns counts as strings
    lastActivity: new Date("2024-01-01"),
    ...overrides,
  };
}

// --- High-Value Test Suite ---

describe("getAllUsersWithStats - Logic & Transformation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Re-link the chain
    mockSelect.mockReturnValue({ from: mockFrom });
    mockFrom.mockReturnValue({ leftJoin: mockLeftJoin1 });
    mockLeftJoin1.mockReturnValue({ leftJoin: mockLeftJoin2 });
    mockLeftJoin2.mockReturnValue({ groupBy: mockGroupBy });
    mockGroupBy.mockReturnValue({ orderBy: mockOrderBy });
  });

  test("transforms database strings (BigInt) into numbers", async () => {
    mockOrderBy.mockResolvedValue([
      makeDbRow({ configCount: "12" }),
      makeDbRow({ configCount: "0" }),
    ]);

    const result = await getAllUsersWithStats();

    expect(result[0].configCount).toBe(12);
    expect(result[1].configCount).toBe(0);
    expect(typeof result[0].configCount).toBe("number");
  });

  test("handles null lastActivity correctly (no join matches)", async () => {
    mockOrderBy.mockResolvedValue([makeDbRow({ lastActivity: null })]);

    const result = await getAllUsersWithStats();

    expect(result[0].lastActivity).toBeNull();
  });

  test("maintains correct sorting order via email", async () => {
    await getAllUsersWithStats();

    // Verifies the query intent: order by email ascending
    expect(mockOrderBy).toHaveBeenCalledWith(userProfiles.email);
  });

  test("returns an empty array when no users exist", async () => {
    mockOrderBy.mockResolvedValue([]);

    const result = await getAllUsersWithStats();

    expect(result).toEqual([]);
  });

  test("properly maps complex result sets", async () => {
    const rows = [
      makeDbRow({ id: "1", initials: "JD", configCount: "1" }),
      makeDbRow({ id: "2", initials: null, configCount: "10" }),
    ];
    mockOrderBy.mockResolvedValue(rows);

    const result = await getAllUsersWithStats();

    expect(result).toHaveLength(2);
    expect(result[1]).toMatchObject({
      id: "2",
      initials: null,
      configCount: 10,
    });
  });
});
