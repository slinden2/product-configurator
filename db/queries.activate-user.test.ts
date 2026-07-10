// @vitest-environment node
import { beforeEach, describe, expect, test, vi } from "vitest";
import { MSG } from "@/lib/messages";

// We exercise the REAL activateUserWithAudit, so only the db connection is
// faked. Each `tx.select(...).from(...).where(...).for("update")` chain shifts
// the next row-array off `selectResults`.
let selectResults: unknown[][] = [];
const mockUpdateSet = vi.fn();
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
  update: () => ({
    set: (...args: unknown[]) => {
      mockUpdateSet(...args);
      return { where: mockUpdateWhere };
    },
  }),
  insert: () => ({ values: mockInsertValues }),
});

vi.mock("@/db", () => ({
  db: {
    transaction: vi.fn(async (cb: (tx: unknown) => Promise<unknown>) =>
      cb(makeTx()),
    ),
  },
}));

import { activateUserWithAudit } from "@/db/queries";

const ARGS = { userId: "target", activatedBy: "admin" };

beforeEach(() => {
  vi.clearAllMocks();
  selectResults = [];
  mockUpdateWhere.mockResolvedValue(undefined);
  mockInsertValues.mockResolvedValue(undefined);
});

describe("activateUserWithAudit — locked activation with audit", () => {
  test("throws notFound when the target row is gone", async () => {
    selectResults = [[]];
    await expect(activateUserWithAudit(ARGS)).rejects.toThrow(
      MSG.users.notFound,
    );
    expect(mockUpdateWhere).not.toHaveBeenCalled();
    expect(mockInsertValues).not.toHaveBeenCalled();
  });

  test("rejects an already-active user without writing or logging", async () => {
    selectResults = [[{ id: "target", is_active: true }]];
    await expect(activateUserWithAudit(ARGS)).rejects.toThrow(
      MSG.users.alreadyActive,
    );
    expect(mockUpdateWhere).not.toHaveBeenCalled();
    expect(mockInsertValues).not.toHaveBeenCalled();
  });

  test("activates an inactive user and writes the audit entry in the same transaction", async () => {
    selectResults = [[{ id: "target", is_active: false }]];
    await expect(activateUserWithAudit(ARGS)).resolves.toBeUndefined();
    expect(mockUpdateSet).toHaveBeenCalledWith({ is_active: true });
    expect(mockUpdateWhere).toHaveBeenCalledTimes(1);
    expect(mockInsertValues).toHaveBeenCalledTimes(1);
    expect(mockInsertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "admin",
        action: "USER_ACTIVATE",
        target_entity: "user_profile",
        target_id: "target",
      }),
    );
  });
});
