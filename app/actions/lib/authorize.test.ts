// @vitest-environment node
import { beforeEach, describe, expect, test, vi } from "vitest";

// --- Mocks ---

const mockGetUserData = vi.fn();
const mockGetOfferWorkingRevision = vi.fn();

vi.mock("@/db/queries", () => ({
  getUserData: (...args: unknown[]) => mockGetUserData(...args),
  getOfferWorkingRevision: (...args: unknown[]) =>
    mockGetOfferWorkingRevision(...args),
}));

// --- Imports (after mocks) ---

import {
  authorizeAdmin,
  authorizeOfferLifecycleAction,
  authorizeRevisionAction,
} from "@/app/actions/lib/authorize";
import { MSG } from "@/lib/messages";

const OFFER_ID = 5;
const ADMIN = { id: "a1", role: "ADMIN", initials: "AD" };
const SALES = { id: "u1", role: "SALES", initials: "SX" };

beforeEach(() => {
  vi.clearAllMocks();
  mockGetUserData.mockResolvedValue(ADMIN);
  mockGetOfferWorkingRevision.mockResolvedValue({ id: 1, status: "DRAFT" });
});

describe("authorizeAdmin", () => {
  test("returns the user for an ADMIN", async () => {
    const result = await authorizeAdmin();
    expect(result).toEqual({ success: true, user: ADMIN });
  });

  test("rejects an unauthenticated user", async () => {
    mockGetUserData.mockResolvedValue(null);
    const result = await authorizeAdmin();
    expect(result).toEqual({
      success: false,
      error: MSG.auth.userNotAuthenticated,
    });
  });

  test("rejects a non-ADMIN with the default message", async () => {
    mockGetUserData.mockResolvedValue(SALES);
    const result = await authorizeAdmin();
    expect(result).toEqual({ success: false, error: MSG.auth.unauthorized });
  });

  test("rejects a non-ADMIN with the caller's domain message", async () => {
    mockGetUserData.mockResolvedValue(SALES);
    const result = await authorizeAdmin(MSG.coefficient.adminOnly);
    expect(result).toEqual({
      success: false,
      error: MSG.coefficient.adminOnly,
    });
  });
});

describe("authorizeOfferLifecycleAction", () => {
  test("returns user and working revision for an offer-access role", async () => {
    mockGetUserData.mockResolvedValue(SALES);
    const result = await authorizeOfferLifecycleAction(OFFER_ID);
    expect(result).toEqual({
      success: true,
      user: SALES,
      revision: { id: 1, status: "DRAFT" },
    });
    expect(mockGetOfferWorkingRevision).toHaveBeenCalledWith(OFFER_ID, SALES);
  });

  test("rejects an unauthenticated user", async () => {
    mockGetUserData.mockResolvedValue(null);
    const result = await authorizeOfferLifecycleAction(OFFER_ID);
    expect(result).toEqual({
      success: false,
      error: MSG.auth.userNotAuthenticated,
    });
    expect(mockGetOfferWorkingRevision).not.toHaveBeenCalled();
  });

  test("rejects ENGINEER (no offer access)", async () => {
    mockGetUserData.mockResolvedValue({ id: "e1", role: "ENGINEER" });
    const result = await authorizeOfferLifecycleAction(OFFER_ID);
    expect(result).toEqual({ success: false, error: MSG.offer.unauthorized });
    expect(mockGetOfferWorkingRevision).not.toHaveBeenCalled();
  });

  test("returns notFound when the offer is out of scope", async () => {
    mockGetOfferWorkingRevision.mockResolvedValue(null);
    const result = await authorizeOfferLifecycleAction(OFFER_ID);
    expect(result).toEqual({ success: false, error: MSG.offer.notFound });
  });

  test("does not require the working revision to be DRAFT", async () => {
    mockGetOfferWorkingRevision.mockResolvedValue({ id: 1, status: "SENT" });
    const result = await authorizeOfferLifecycleAction(OFFER_ID);
    expect(result.success).toBe(true);
  });
});

describe("authorizeRevisionAction", () => {
  test("passes through when the working revision is DRAFT", async () => {
    const result = await authorizeRevisionAction(OFFER_ID);
    expect(result).toEqual({
      success: true,
      user: ADMIN,
      revision: { id: 1, status: "DRAFT" },
    });
  });

  test("rejects when the working revision is not DRAFT", async () => {
    mockGetOfferWorkingRevision.mockResolvedValue({
      id: 1,
      status: "PENDING_APPROVAL",
    });
    const result = await authorizeRevisionAction(OFFER_ID);
    expect(result).toEqual({ success: false, error: MSG.offer.lineCannotEdit });
  });

  test("propagates the base gate's rejection", async () => {
    mockGetUserData.mockResolvedValue({ id: "e1", role: "ENGINEER" });
    const result = await authorizeRevisionAction(OFFER_ID);
    expect(result).toEqual({ success: false, error: MSG.offer.unauthorized });
  });
});
