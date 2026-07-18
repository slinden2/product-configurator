// @vitest-environment node
import { beforeEach, describe, expect, test, vi } from "vitest";

// --- Mocks ---

const mockGetUserData = vi.fn();
const mockChangeUserRoleWithAudit = vi.fn();
const mockAssignManagerWithAudit = vi.fn();
const mockActivateUserWithAudit = vi.fn();
const mockDeactivateUserWithAudit = vi.fn();
const mockLogActivity = vi.fn();
const mockGetUserProfileById = vi.fn();
const mockResetPasswordForEmail = vi.fn();

vi.mock("@/db/queries", () => ({
  getUserData: (...args: unknown[]) => mockGetUserData(...args),
  changeUserRoleWithAudit: (...args: unknown[]) =>
    mockChangeUserRoleWithAudit(...args),
  assignManagerWithAudit: (...args: unknown[]) =>
    mockAssignManagerWithAudit(...args),
  activateUserWithAudit: (...args: unknown[]) =>
    mockActivateUserWithAudit(...args),
  deactivateUserWithAudit: (...args: unknown[]) =>
    mockDeactivateUserWithAudit(...args),
  getUserProfileById: (...args: unknown[]) => mockGetUserProfileById(...args),
  logActivity: (...args: unknown[]) => mockLogActivity(...args),
  QueryError: class QueryError extends Error {
    constructor(message: string) {
      super(message);
      this.name = "QueryError";
    }
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
  activateUserAction,
  assignManagerAction,
  changeUserRoleAction,
  deactivateUserAction,
  sendPasswordResetAction,
} from "@/app/actions/user-actions";
import { QueryError } from "@/db/queries";
import { MSG } from "@/lib/messages";

const ADMIN_ID = "00000000-0000-4000-8000-000000000001";
const ENGINEER_ID = "00000000-0000-4000-8000-000000000002";
const TARGET_ID = "00000000-0000-4000-8000-000000000003";
const MANAGER_ID = "00000000-0000-4000-8000-000000000004";

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
    mockGetUserProfileById.mockResolvedValue(targetUser);
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

  test("rejects demotion of another ADMIN", async () => {
    mockGetUserData.mockResolvedValue(adminUser);
    mockGetUserProfileById.mockResolvedValue({ id: TARGET_ID, role: "ADMIN" });
    const result = await changeUserRoleAction({
      userId: TARGET_ID,
      newRole: "ENGINEER",
    });
    expect(result.success).toBe(false);
    if (!result.success)
      expect(result.error).toBe(MSG.users.cannotChangeAdminRole);
    expect(mockChangeUserRoleWithAudit).not.toHaveBeenCalled();
  });

  test("returns notFound when target user does not exist", async () => {
    mockGetUserData.mockResolvedValue(adminUser);
    mockGetUserProfileById.mockResolvedValue(undefined);
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
      new QueryError("Utente non trovato."),
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
      new QueryError("Utente non trovato."),
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

// ── assignManagerAction ──────────────────────────────────────────────────────

describe("assignManagerAction", () => {
  const salesTarget = { id: TARGET_ID, role: "SALES" as const };
  const salesManager = {
    id: MANAGER_ID,
    role: "SALES_MANAGER" as const,
    is_active: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUserData.mockResolvedValue(adminUser);
    mockAssignManagerWithAudit.mockResolvedValue(undefined);
  });

  test("rejects non-ADMIN users", async () => {
    mockGetUserData.mockResolvedValue(engineerUser);
    const result = await assignManagerAction({
      userId: TARGET_ID,
      managerId: MANAGER_ID,
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe(MSG.auth.unauthorized);
    expect(mockAssignManagerWithAudit).not.toHaveBeenCalled();
  });

  test("rejects assigning a manager to a non-SALES target", async () => {
    // Target is an ENGINEER — only SALES agents may report to a manager.
    mockGetUserProfileById.mockResolvedValueOnce({
      id: TARGET_ID,
      role: "ENGINEER",
    });
    const result = await assignManagerAction({
      userId: TARGET_ID,
      managerId: MANAGER_ID,
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe(MSG.users.invalidManager);
    expect(mockAssignManagerWithAudit).not.toHaveBeenCalled();
  });

  test("rejects when the manager is not a SALES_MANAGER", async () => {
    mockGetUserProfileById
      .mockResolvedValueOnce(salesTarget)
      .mockResolvedValueOnce({ id: MANAGER_ID, role: "SALES" });
    const result = await assignManagerAction({
      userId: TARGET_ID,
      managerId: MANAGER_ID,
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe(MSG.users.invalidManager);
    expect(mockAssignManagerWithAudit).not.toHaveBeenCalled();
  });

  test("rejects when the manager is deactivated", async () => {
    mockGetUserProfileById
      .mockResolvedValueOnce(salesTarget)
      .mockResolvedValueOnce({ ...salesManager, is_active: false });
    const result = await assignManagerAction({
      userId: TARGET_ID,
      managerId: MANAGER_ID,
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe(MSG.users.invalidManager);
    expect(mockAssignManagerWithAudit).not.toHaveBeenCalled();
  });

  test("assigns a SALES_MANAGER to a SALES target and revalidates", async () => {
    mockGetUserProfileById
      .mockResolvedValueOnce(salesTarget)
      .mockResolvedValueOnce(salesManager);
    const result = await assignManagerAction({
      userId: TARGET_ID,
      managerId: MANAGER_ID,
    });
    expect(result.success).toBe(true);
    expect(mockAssignManagerWithAudit).toHaveBeenCalledWith({
      userId: TARGET_ID,
      managerId: MANAGER_ID,
      changedBy: ADMIN_ID,
    });
    expect(revalidatePath).toHaveBeenCalledWith("/gestione/utenti");
  });

  test("clears a manager (managerId null) without a manager lookup", async () => {
    mockGetUserProfileById.mockResolvedValueOnce(salesTarget);
    const result = await assignManagerAction({
      userId: TARGET_ID,
      managerId: null,
    });
    expect(result.success).toBe(true);
    expect(mockAssignManagerWithAudit).toHaveBeenCalledWith({
      userId: TARGET_ID,
      managerId: null,
      changedBy: ADMIN_ID,
    });
  });
});

// ── activateUserAction ───────────────────────────────────────────────────────

describe("activateUserAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUserData.mockResolvedValue(adminUser);
    mockActivateUserWithAudit.mockResolvedValue(undefined);
  });

  test("returns validation error for a non-uuid userId", async () => {
    const result = await activateUserAction({ userId: "not-a-uuid" });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe(MSG.auth.invalidData);
    expect(mockActivateUserWithAudit).not.toHaveBeenCalled();
  });

  test("rejects unauthenticated users", async () => {
    mockGetUserData.mockResolvedValue(null);
    const result = await activateUserAction({ userId: TARGET_ID });
    expect(result.success).toBe(false);
    expect(mockActivateUserWithAudit).not.toHaveBeenCalled();
  });

  test("rejects non-ADMIN users", async () => {
    mockGetUserData.mockResolvedValue(engineerUser);
    const result = await activateUserAction({ userId: TARGET_ID });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe(MSG.auth.unauthorized);
    expect(mockActivateUserWithAudit).not.toHaveBeenCalled();
  });

  test("activates the user with audit and revalidates", async () => {
    const result = await activateUserAction({ userId: TARGET_ID });
    expect(result.success).toBe(true);
    expect(mockActivateUserWithAudit).toHaveBeenCalledWith({
      userId: TARGET_ID,
      activatedBy: ADMIN_ID,
    });
    expect(revalidatePath).toHaveBeenCalledWith("/gestione/utenti");
  });

  test("surfaces QueryError messages (already active / not found) verbatim", async () => {
    mockActivateUserWithAudit.mockRejectedValue(
      new QueryError(MSG.users.alreadyActive),
    );
    const result = await activateUserAction({ userId: TARGET_ID });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe(MSG.users.alreadyActive);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  test("returns db error message on DatabaseError", async () => {
    mockActivateUserWithAudit.mockRejectedValue(createDatabaseError("pg"));
    const result = await activateUserAction({ userId: TARGET_ID });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe(MSG.db.error);
  });
});

// ── deactivateUserAction ─────────────────────────────────────────────────────

describe("deactivateUserAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUserData.mockResolvedValue(adminUser);
    mockDeactivateUserWithAudit.mockResolvedValue(undefined);
    mockGetUserProfileById.mockResolvedValue(targetUser);
  });

  test("returns validation error for a non-uuid userId", async () => {
    const result = await deactivateUserAction({ userId: "not-a-uuid" });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe(MSG.auth.invalidData);
    expect(mockDeactivateUserWithAudit).not.toHaveBeenCalled();
  });

  test("rejects unauthenticated users", async () => {
    mockGetUserData.mockResolvedValue(null);
    const result = await deactivateUserAction({ userId: TARGET_ID });
    expect(result.success).toBe(false);
    expect(mockDeactivateUserWithAudit).not.toHaveBeenCalled();
  });

  test("rejects non-ADMIN users", async () => {
    mockGetUserData.mockResolvedValue(engineerUser);
    const result = await deactivateUserAction({ userId: TARGET_ID });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe(MSG.auth.unauthorized);
    expect(mockDeactivateUserWithAudit).not.toHaveBeenCalled();
  });

  test("rejects self-deactivation", async () => {
    const result = await deactivateUserAction({ userId: ADMIN_ID });
    expect(result.success).toBe(false);
    if (!result.success)
      expect(result.error).toBe(MSG.users.cannotDeactivateSelf);
    expect(mockDeactivateUserWithAudit).not.toHaveBeenCalled();
  });

  test("returns notFound when target user does not exist", async () => {
    mockGetUserProfileById.mockResolvedValue(undefined);
    const result = await deactivateUserAction({ userId: TARGET_ID });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe(MSG.users.notFound);
    expect(mockDeactivateUserWithAudit).not.toHaveBeenCalled();
  });

  test("rejects deactivation of another ADMIN", async () => {
    mockGetUserProfileById.mockResolvedValue({ id: TARGET_ID, role: "ADMIN" });
    const result = await deactivateUserAction({ userId: TARGET_ID });
    expect(result.success).toBe(false);
    if (!result.success)
      expect(result.error).toBe(MSG.users.cannotDeactivateAdmin);
    expect(mockDeactivateUserWithAudit).not.toHaveBeenCalled();
  });

  test("deactivates the user with audit and revalidates", async () => {
    const result = await deactivateUserAction({ userId: TARGET_ID });
    expect(result.success).toBe(true);
    expect(mockDeactivateUserWithAudit).toHaveBeenCalledWith({
      userId: TARGET_ID,
      deactivatedBy: ADMIN_ID,
    });
    expect(revalidatePath).toHaveBeenCalledWith("/gestione/utenti");
  });

  test("surfaces QueryError messages (already inactive) verbatim", async () => {
    mockDeactivateUserWithAudit.mockRejectedValue(
      new QueryError(MSG.users.alreadyInactive),
    );
    const result = await deactivateUserAction({ userId: TARGET_ID });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe(MSG.users.alreadyInactive);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  test("returns db error message on DatabaseError", async () => {
    mockDeactivateUserWithAudit.mockRejectedValue(createDatabaseError("pg"));
    const result = await deactivateUserAction({ userId: TARGET_ID });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe(MSG.db.error);
  });
});

// ── sendPasswordResetAction ──────────────────────────────────────────────────

describe("sendPasswordResetAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLogActivity.mockResolvedValue(undefined);
    mockGetUserProfileById.mockResolvedValue(targetUser);
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
    mockGetUserProfileById.mockResolvedValue(undefined);
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
