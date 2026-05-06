// @vitest-environment node
import { beforeEach, describe, expect, test, vi } from "vitest";

// --- Mocks ---

const mockGetUserData = vi.fn();
const mockChangeUserRoleWithAudit = vi.fn();
const mockLogActivity = vi.fn();
const mockFindFirst = vi.fn();
const mockResetPasswordForEmail = vi.fn();

vi.mock("@/db/queries", () => ({
  getUserData: (...args: unknown[]) => mockGetUserData(...args),
  changeUserRoleWithAudit: (...args: unknown[]) =>
    mockChangeUserRoleWithAudit(...args),
  logActivity: (...args: unknown[]) => mockLogActivity(...args),
  QueryError: class QueryError extends Error {
    errorCode: number;
    constructor(message: string, errorCode: number) {
      super(message);
      this.name = "QueryError";
      this.errorCode = errorCode;
    }
  },
}));

vi.mock("@/db", () => ({
  db: {
    query: {
      userProfiles: {
        findFirst: (...args: unknown[]) => mockFindFirst(...args),
      },
    },
  },
}));

vi.mock("@/utils/supabase/server", () => ({
  createClient: () =>
    Promise.resolve({
      auth: {
        resetPasswordForEmail: (...args: unknown[]) =>
          mockResetPasswordForEmail(...args),
      },
    }),
}));

vi.mock("next/headers", () => ({
  headers: () => Promise.resolve({ get: () => "http://localhost:3000" }),
}));

vi.mock("pg", () => ({
  DatabaseError: class DatabaseError extends Error {
    constructor(message: string) {
      super(message);
      this.name = "DatabaseError";
    }
  },
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { revalidatePath } from "next/cache";
import { DatabaseError } from "pg";
import {
  changeUserRoleAction,
  sendPasswordResetAction,
} from "@/app/actions/user-actions";
import { QueryError } from "@/db/queries";
import { MSG } from "@/lib/messages";

const ADMIN_ID = "00000000-0000-4000-8000-000000000001";
const ENGINEER_ID = "00000000-0000-4000-8000-000000000002";
const TARGET_ID = "00000000-0000-4000-8000-000000000003";

const adminUser = { id: ADMIN_ID, role: "ADMIN" as const, initials: "A" };
const engineerUser = {
  id: ENGINEER_ID,
  role: "ENGINEER" as const,
  initials: "E",
};
const targetUser = {
  id: TARGET_ID,
  role: "SALES" as const,
  email: "target@example.com",
};

const createDatabaseError = (message: string) =>
  new DatabaseError(message, 0, "error");

// ── changeUserRoleAction ─────────────────────────────────────────────────────

describe("changeUserRoleAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockChangeUserRoleWithAudit.mockResolvedValue(undefined);
    mockFindFirst.mockResolvedValue(targetUser);
  });

  test("rejects unauthenticated users", async () => {
    mockGetUserData.mockResolvedValue(null);
    const result = await changeUserRoleAction({
      userId: TARGET_ID,
      newRole: "ENGINEER",
    });
    expect(result.success).toBe(false);
  });

  test("rejects non-ADMIN users", async () => {
    mockGetUserData.mockResolvedValue(engineerUser);
    const result = await changeUserRoleAction({
      userId: TARGET_ID,
      newRole: "SALES",
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe(MSG.auth.unauthorized);
  });

  test("rejects self-role change", async () => {
    mockGetUserData.mockResolvedValue(adminUser);
    const result = await changeUserRoleAction({
      userId: ADMIN_ID,
      newRole: "ENGINEER",
    });
    expect(result.success).toBe(false);
    if (!result.success)
      expect(result.error).toBe(MSG.users.cannotChangeOwnRole);
  });

  test("rejects promotion to ADMIN", async () => {
    mockGetUserData.mockResolvedValue(adminUser);
    const result = await changeUserRoleAction({
      userId: TARGET_ID,
      newRole: "ADMIN",
    });
    expect(result.success).toBe(false);
    if (!result.success)
      expect(result.error).toBe(MSG.users.cannotPromoteToAdmin);
  });

  test("returns notFound when target user does not exist", async () => {
    mockGetUserData.mockResolvedValue(adminUser);
    mockFindFirst.mockResolvedValue(undefined);
    const result = await changeUserRoleAction({
      userId: TARGET_ID,
      newRole: "ENGINEER",
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe(MSG.users.notFound);
    expect(mockChangeUserRoleWithAudit).not.toHaveBeenCalled();
  });

  test("calls changeUserRoleWithAudit with correct args and revalidates", async () => {
    mockGetUserData.mockResolvedValue(adminUser);
    const result = await changeUserRoleAction({
      userId: TARGET_ID,
      newRole: "ENGINEER",
    });
    expect(result.success).toBe(true);
    expect(mockChangeUserRoleWithAudit).toHaveBeenCalledWith({
      userId: TARGET_ID,
      newRole: "ENGINEER",
      changedBy: ADMIN_ID,
    });
    expect(revalidatePath).toHaveBeenCalledWith("/gestione/utenti");
  });

  test("does not revalidate when helper rejects (audit failure rolls back)", async () => {
    mockGetUserData.mockResolvedValue(adminUser);
    mockChangeUserRoleWithAudit.mockRejectedValue(
      new QueryError("Utente non trovato.", 404),
    );
    const result = await changeUserRoleAction({
      userId: TARGET_ID,
      newRole: "ENGINEER",
    });
    expect(result.success).toBe(false);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  test("returns QueryError message on QueryError", async () => {
    mockGetUserData.mockResolvedValue(adminUser);
    mockChangeUserRoleWithAudit.mockRejectedValue(
      new QueryError("Utente non trovato.", 404),
    );
    const result = await changeUserRoleAction({
      userId: TARGET_ID,
      newRole: "ENGINEER",
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe("Utente non trovato.");
  });

  test("returns db error message on DatabaseError", async () => {
    mockGetUserData.mockResolvedValue(adminUser);
    mockChangeUserRoleWithAudit.mockRejectedValue(
      createDatabaseError("pg error"),
    );
    const result = await changeUserRoleAction({
      userId: TARGET_ID,
      newRole: "ENGINEER",
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe(MSG.db.error);
  });

  test("returns unknown error message on unexpected error", async () => {
    mockGetUserData.mockResolvedValue(adminUser);
    mockChangeUserRoleWithAudit.mockRejectedValue(new Error("boom"));
    const result = await changeUserRoleAction({
      userId: TARGET_ID,
      newRole: "ENGINEER",
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe(MSG.db.unknown);
  });
});

// ── sendPasswordResetAction ──────────────────────────────────────────────────

describe("sendPasswordResetAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLogActivity.mockResolvedValue(undefined);
    mockFindFirst.mockResolvedValue(targetUser);
    mockResetPasswordForEmail.mockResolvedValue({ error: null });
  });

  test("rejects unauthenticated users", async () => {
    mockGetUserData.mockResolvedValue(null);
    const result = await sendPasswordResetAction({ userId: TARGET_ID });
    expect(result.success).toBe(false);
  });

  test("rejects non-ADMIN users", async () => {
    mockGetUserData.mockResolvedValue(engineerUser);
    const result = await sendPasswordResetAction({ userId: TARGET_ID });
    expect(result.success).toBe(false);
  });

  test("returns notFound when target user does not exist", async () => {
    mockGetUserData.mockResolvedValue(adminUser);
    mockFindFirst.mockResolvedValue(undefined);
    const result = await sendPasswordResetAction({ userId: TARGET_ID });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe(MSG.users.notFound);
  });

  test("sends password reset email and logs best-effort", async () => {
    mockGetUserData.mockResolvedValue(adminUser);
    const result = await sendPasswordResetAction({ userId: TARGET_ID });
    expect(result.success).toBe(true);
    expect(mockLogActivity).toHaveBeenCalledWith(
      expect.objectContaining({ action: "PASSWORD_RESET" }),
    );
  });
});
