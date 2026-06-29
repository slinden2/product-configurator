// @vitest-environment node
import { beforeEach, describe, expect, test, vi } from "vitest";
import { MSG } from "@/lib/messages";

// We exercise the REAL assignManagerWithAudit, so only the db connection is
// faked. Each `tx.select(...).from(...).where(...).for("update")` chain shifts
// the next row-array off `selectResults` (first = target, second = manager).
let selectResults: unknown[][] = [];
const mockUpdateWhere = vi.fn();
const mockInsertValues = vi.fn();

const makeTx = () => ({
  select: () => ({
    from: () => ({
      where: () => ({
        for: () => Promise.resolve(selectResults.shift() ?? []),
      }),
    }),
  }),
  update: () => ({ set: () => ({ where: mockUpdateWhere }) }),
  insert: () => ({ values: mockInsertValues }),
});

vi.mock("@/db", () => ({
  db: {
    transaction: vi.fn(async (cb: (tx: unknown) => Promise<unknown>) =>
      cb(makeTx()),
    ),
  },
}));

import { assignManagerWithAudit } from "@/db/queries";

const ARGS = { userId: "target", managerId: "manager", changedBy: "admin" };

beforeEach(() => {
  vi.clearAllMocks();
  selectResults = [];
  mockUpdateWhere.mockResolvedValue(undefined);
  mockInsertValues.mockResolvedValue(undefined);
});

describe("assignManagerWithAudit — in-transaction role re-validation", () => {
  test("throws notFound when the target row is gone", async () => {
    selectResults = [[]];
    await expect(assignManagerWithAudit(ARGS)).rejects.toThrow(
      MSG.users.notFound,
    );
    expect(mockUpdateWhere).not.toHaveBeenCalled();
  });

  test("rejects a target that is no longer SALES", async () => {
    selectResults = [[{ id: "target", role: "ENGINEER", manager_id: null }]];
    await expect(assignManagerWithAudit(ARGS)).rejects.toThrow(
      MSG.users.invalidManager,
    );
    expect(mockUpdateWhere).not.toHaveBeenCalled();
    expect(mockInsertValues).not.toHaveBeenCalled();
  });

  test("rejects a manager that is no longer a SALES_MANAGER", async () => {
    selectResults = [
      [{ id: "target", role: "SALES", manager_id: null }],
      [{ id: "manager", role: "SALES" }],
    ];
    await expect(assignManagerWithAudit(ARGS)).rejects.toThrow(
      MSG.users.invalidManager,
    );
    expect(mockUpdateWhere).not.toHaveBeenCalled();
  });

  test("rejects when the manager row is missing", async () => {
    selectResults = [[{ id: "target", role: "SALES", manager_id: null }], []];
    await expect(assignManagerWithAudit(ARGS)).rejects.toThrow(
      MSG.users.invalidManager,
    );
    expect(mockUpdateWhere).not.toHaveBeenCalled();
  });

  test("writes manager_id + audit when both roles are valid", async () => {
    selectResults = [
      [{ id: "target", role: "SALES", manager_id: "old" }],
      [{ id: "manager", role: "SALES_MANAGER" }],
    ];
    await expect(assignManagerWithAudit(ARGS)).resolves.toBeUndefined();
    expect(mockUpdateWhere).toHaveBeenCalledTimes(1);
    expect(mockInsertValues).toHaveBeenCalledTimes(1);
  });

  test("clearing a manager (null) needs only the target to be SALES", async () => {
    selectResults = [[{ id: "target", role: "SALES", manager_id: "old" }]];
    await expect(
      assignManagerWithAudit({ ...ARGS, managerId: null }),
    ).resolves.toBeUndefined();
    expect(mockUpdateWhere).toHaveBeenCalledTimes(1);
    expect(mockInsertValues).toHaveBeenCalledTimes(1);
  });
});
