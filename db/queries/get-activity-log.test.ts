import { beforeEach, describe, expect, test, vi } from "vitest";
import { getActivityLog } from "@/db/queries";
import { activityLogs } from "@/db/schemas";

// --- Mocks ---

// Two chains hang off db.select():
//   data:  select().from().innerJoin().where().orderBy().limit().offset()
//   count: select().from().where()
const mockOffset = vi.fn();
const mockLimit = vi.fn(() => ({ offset: mockOffset }));
const mockOrderBy = vi.fn(() => ({ limit: mockLimit }));
const mockDataWhere = vi.fn((_where?: unknown) => ({ orderBy: mockOrderBy }));
const mockInnerJoin = vi.fn(() => ({ where: mockDataWhere }));
const mockCountWhere = vi.fn();
const mockFrom = vi.fn(() => ({
  innerJoin: mockInnerJoin,
  where: mockCountWhere,
}));
const mockSelect = vi.fn(() => ({ from: mockFrom }));

vi.mock("@/db", () => ({
  db: {
    select: vi.fn((...args: Parameters<typeof mockSelect>) =>
      mockSelect(...args),
    ),
  },
}));

vi.mock("@/db/schemas", () => ({
  activityLogs: {
    id: "id",
    user_id: "user_id",
    action: "action",
    target_entity: "target_entity",
    target_id: "target_id",
    metadata: "metadata",
    created_at: "created_at",
  },
  userProfiles: { id: "profile_id", email: "email" },
}));

vi.mock("drizzle-orm", () => ({
  // Mirror drizzle: undefined conditions drop out, and an all-undefined AND
  // collapses to undefined (i.e. no WHERE clause).
  and: vi.fn((...conditions) => {
    const defined = conditions.filter(Boolean);
    return defined.length > 0
      ? { type: "and", conditions: defined }
      : undefined;
  }),
  desc: vi.fn((column) => column),
  eq: vi.fn((column, value) => ({ type: "eq", column, value })),
  // Aggregate used by the shared paginatedList count query; the select chain is
  // stubbed, so its return value is irrelevant.
  count: vi.fn(() => ({ type: "count" })),
  sql: vi.fn(),
}));

// --- Helpers ---

function makeRow(overrides = {}) {
  return {
    id: 1,
    user_id: "u-1",
    action: "CONFIG_CREATE",
    target_entity: "configuration",
    target_id: "42",
    metadata: null,
    created_at: new Date("2026-07-14"),
    user_email: "engineer@iteco.it",
    ...overrides,
  };
}

// --- Tests ---

describe("getActivityLog - filters, paging & transformation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Re-link the chains
    mockSelect.mockReturnValue({ from: mockFrom });
    mockFrom.mockReturnValue({
      innerJoin: mockInnerJoin,
      where: mockCountWhere,
    });
    mockInnerJoin.mockReturnValue({ where: mockDataWhere });
    mockDataWhere.mockReturnValue({ orderBy: mockOrderBy });
    mockOrderBy.mockReturnValue({ limit: mockLimit });
    mockLimit.mockReturnValue({ offset: mockOffset });
    mockOffset.mockResolvedValue([makeRow()]);
    // Drizzle's count() maps the pg bigint to a JS number.
    mockCountWhere.mockResolvedValue([{ count: 1 }]);
  });

  test("applies no WHERE clause when no filter is given", async () => {
    await getActivityLog();

    expect(mockDataWhere).toHaveBeenCalledWith(undefined);
    expect(mockCountWhere).toHaveBeenCalledWith(undefined);
  });

  test("filters by action only", async () => {
    await getActivityLog({ action: "CONFIG_EDIT" });

    expect(mockDataWhere).toHaveBeenCalledWith({
      type: "and",
      conditions: [
        { type: "eq", column: activityLogs.action, value: "CONFIG_EDIT" },
      ],
    });
  });

  test("filters by user only", async () => {
    await getActivityLog({ userId: "u-9" });

    expect(mockDataWhere).toHaveBeenCalledWith({
      type: "and",
      conditions: [{ type: "eq", column: activityLogs.user_id, value: "u-9" }],
    });
  });

  test("ANDs the action and user filters together", async () => {
    await getActivityLog({ action: "BOM_GENERATE", userId: "u-9" });

    expect(mockDataWhere).toHaveBeenCalledWith({
      type: "and",
      conditions: [
        { type: "eq", column: activityLogs.action, value: "BOM_GENERATE" },
        { type: "eq", column: activityLogs.user_id, value: "u-9" },
      ],
    });
  });

  test("applies the same filters to the count query", async () => {
    await getActivityLog({ action: "CONFIG_DELETE", userId: "u-3" });

    expect(mockCountWhere).toHaveBeenCalledWith(mockDataWhere.mock.calls[0][0]);
  });

  test("orders by created_at descending, newest first", async () => {
    await getActivityLog();

    expect(mockOrderBy).toHaveBeenCalledWith(activityLogs.created_at);
  });

  test("paginates with limit and offset", async () => {
    await getActivityLog({}, 3, 20);

    expect(mockLimit).toHaveBeenCalledWith(20);
    expect(mockOffset).toHaveBeenCalledWith(40);
  });

  test("defaults to the first page", async () => {
    await getActivityLog();

    expect(mockOffset).toHaveBeenCalledWith(0);
  });

  test("returns the joined rows and a numeric total count", async () => {
    mockOffset.mockResolvedValue([
      makeRow({ id: 2, user_email: "admin@iteco.it" }),
    ]);
    mockCountWhere.mockResolvedValue([{ count: 37 }]);

    const result = await getActivityLog();

    expect(result.data).toHaveLength(1);
    expect(result.data[0].user_email).toBe("admin@iteco.it");
    expect(result.totalCount).toBe(37);
    expect(typeof result.totalCount).toBe("number");
  });

  test("returns an empty page when nothing matches the filters", async () => {
    mockOffset.mockResolvedValue([]);
    mockCountWhere.mockResolvedValue([{ count: 0 }]);

    const result = await getActivityLog({ action: "PASSWORD_RESET" });

    expect(result).toEqual({ data: [], totalCount: 0 });
  });
});
