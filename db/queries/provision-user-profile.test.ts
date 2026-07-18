// @vitest-environment node
import { beforeEach, describe, expect, test, vi } from "vitest";

// --- Mocks ---
// We exercise the REAL provisionUserProfileOnLogin; only the db connection and
// the best-effort activity logger are faked.

const mockFindFirst = vi.fn();
const mockInsertValues = vi.fn();
const mockUpdateSet = vi.fn();
const mockUpdateWhere = vi.fn();
const mockLogActivity = vi.fn();

vi.mock("@/db", () => ({
  db: {
    query: {
      userProfiles: {
        findFirst: (...args: unknown[]) => mockFindFirst(...args),
      },
    },
    insert: () => ({ values: mockInsertValues }),
    update: () => ({
      set: (...args: unknown[]) => {
        mockUpdateSet(...args);
        return { where: mockUpdateWhere };
      },
    }),
  },
}));

vi.mock("@/db/queries/activity", () => ({
  logActivity: (...args: unknown[]) => mockLogActivity(...args),
  insertActivityLog: vi.fn(),
  getActivityLog: vi.fn(),
  getUserActivityLog: vi.fn(),
}));

import { provisionUserProfileOnLogin } from "@/db/queries";

const USER_ID = "00000000-0000-4000-8000-000000000001";
const EMAIL = "new.user@itecosrl.com";

beforeEach(() => {
  vi.clearAllMocks();
  mockInsertValues.mockResolvedValue(undefined);
  mockUpdateWhere.mockResolvedValue(undefined);
});

describe("provisionUserProfileOnLogin", () => {
  test("first login provisions an inactive SALES profile and logs the creation", async () => {
    mockFindFirst.mockResolvedValue(undefined);

    const result = await provisionUserProfileOnLogin(USER_ID, EMAIL);

    expect(result).toEqual({ is_active: false, deactivated_at: null });
    expect(mockInsertValues).toHaveBeenCalledWith({
      id: USER_ID,
      email: EMAIL,
      role: "SALES",
      is_active: false,
    });
    expect(mockLogActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: USER_ID,
        action: "USER_PROFILE_CREATE",
        targetEntity: "user_profile",
        targetId: USER_ID,
        metadata: { email: EMAIL, initial_role: "SALES" },
      }),
    );
    // No last-login touch on the provisioning path.
    expect(mockUpdateSet).not.toHaveBeenCalled();
  });

  test("existing-but-never-activated profile returns pending state without writing", async () => {
    mockFindFirst.mockResolvedValue({ is_active: false, deactivated_at: null });

    const result = await provisionUserProfileOnLogin(USER_ID, EMAIL);

    expect(result).toEqual({ is_active: false, deactivated_at: null });
    expect(mockInsertValues).not.toHaveBeenCalled();
    expect(mockUpdateSet).not.toHaveBeenCalled();
    expect(mockLogActivity).not.toHaveBeenCalled();
  });

  test("admin-deactivated profile surfaces deactivated_at without writing", async () => {
    const deactivatedAt = new Date("2026-01-02T03:04:05.000Z");
    mockFindFirst.mockResolvedValue({
      is_active: false,
      deactivated_at: deactivatedAt,
    });

    const result = await provisionUserProfileOnLogin(USER_ID, EMAIL);

    expect(result).toEqual({ is_active: false, deactivated_at: deactivatedAt });
    expect(mockInsertValues).not.toHaveBeenCalled();
    expect(mockUpdateSet).not.toHaveBeenCalled();
    expect(mockLogActivity).not.toHaveBeenCalled();
  });

  test("active profile stamps last_login_at and returns the active state", async () => {
    mockFindFirst.mockResolvedValue({ is_active: true, deactivated_at: null });

    const result = await provisionUserProfileOnLogin(USER_ID, EMAIL);

    expect(result).toEqual({ is_active: true, deactivated_at: null });
    expect(mockUpdateSet).toHaveBeenCalledWith(
      expect.objectContaining({ last_login_at: expect.any(Date) }),
    );
    expect(mockUpdateWhere).toHaveBeenCalled();
    expect(mockInsertValues).not.toHaveBeenCalled();
    expect(mockLogActivity).not.toHaveBeenCalled();
  });
});
