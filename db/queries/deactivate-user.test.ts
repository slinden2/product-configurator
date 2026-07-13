// @vitest-environment node
import { beforeEach, describe, expect, test, vi } from "vitest";
import { MSG } from "@/lib/messages";

// We exercise the REAL deactivateUserWithAudit, so only the db connection is
// faked. Each `tx.select(...).from(...).where(...).for("update")` chain shifts
// the next row-array off `selectResults`.
let selectResults: unknown[][] = [];
const mockUpdateSet = vi.fn();
const mockUpdateWhere = vi.fn();
const mockInsertValues = vi.fn();
const mockExecute = vi.fn();

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
  execute: (...args: unknown[]) => mockExecute(...args),
});

vi.mock("@/db", () => ({
  db: {
    transaction: vi.fn(async (cb: (tx: unknown) => Promise<unknown>) =>
      cb(makeTx()),
    ),
  },
}));

import { deactivateUserWithAudit } from "@/db/queries";

const ARGS = { userId: "target", deactivatedBy: "admin" };

beforeEach(() => {
  vi.clearAllMocks();
  selectResults = [];
  mockUpdateWhere.mockResolvedValue(undefined);
  mockInsertValues.mockResolvedValue(undefined);
  mockExecute.mockResolvedValue(undefined);
});

describe("deactivateUserWithAudit — locked deactivation with audit", () => {
  test("throws notFound when the target row is gone", async () => {
    selectResults = [[]];
    await expect(deactivateUserWithAudit(ARGS)).rejects.toThrow(
      MSG.users.notFound,
    );
    expect(mockUpdateWhere).not.toHaveBeenCalled();
    expect(mockInsertValues).not.toHaveBeenCalled();
  });

  test("rejects an ADMIN target without writing, logging, or revoking sessions", async () => {
    selectResults = [[{ id: "target", role: "ADMIN", is_active: true }]];
    await expect(deactivateUserWithAudit(ARGS)).rejects.toThrow(
      MSG.users.cannotDeactivateAdmin,
    );
    expect(mockUpdateWhere).not.toHaveBeenCalled();
    expect(mockInsertValues).not.toHaveBeenCalled();
    expect(mockExecute).not.toHaveBeenCalled();
  });

  test("rejects an already-inactive user (pending or deactivated) without writing or logging", async () => {
    selectResults = [[{ id: "target", role: "SALES", is_active: false }]];
    await expect(deactivateUserWithAudit(ARGS)).rejects.toThrow(
      MSG.users.alreadyInactive,
    );
    expect(mockUpdateWhere).not.toHaveBeenCalled();
    expect(mockInsertValues).not.toHaveBeenCalled();
    expect(mockExecute).not.toHaveBeenCalled();
  });

  test("deactivates an active user and writes the audit entry in the same transaction", async () => {
    selectResults = [[{ id: "target", role: "SALES", is_active: true }]];
    await expect(deactivateUserWithAudit(ARGS)).resolves.toBeUndefined();
    expect(mockUpdateSet).toHaveBeenCalledWith({
      is_active: false,
      deactivated_at: expect.any(Date),
    });
    expect(mockUpdateWhere).toHaveBeenCalledTimes(1);
    expect(mockInsertValues).toHaveBeenCalledTimes(1);
    expect(mockInsertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "admin",
        action: "USER_DEACTIVATE",
        target_entity: "user_profile",
        target_id: "target",
      }),
    );
  });

  test("revokes the user's live sessions in the same transaction", async () => {
    // Clearing is_active does not revoke an issued Supabase session on its own:
    // the refresh token would keep minting access tokens. Deleting the
    // auth.sessions rows is what actually terminates the session.
    selectResults = [[{ id: "target", role: "SALES", is_active: true }]];
    await expect(deactivateUserWithAudit(ARGS)).resolves.toBeUndefined();

    expect(mockExecute).toHaveBeenCalledTimes(1);
    const query = mockExecute.mock.calls[0][0] as {
      queryChunks?: unknown[];
      sql?: string;
    };
    const rendered = JSON.stringify(query);
    expect(rendered).toContain("auth.sessions");
    expect(rendered).toContain("target");
  });
});
