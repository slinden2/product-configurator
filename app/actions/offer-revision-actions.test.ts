// @vitest-environment node
import { beforeEach, describe, expect, test, vi } from "vitest";

// --- Mocks ---

const mockGetUserData = vi.fn();
const mockGetOfferWithRevisionAndLines = vi.fn();
const mockUpdateRevisionDiscountWithAudit = vi.fn();
const mockUpdateRevisionSettingsWithAudit = vi.fn();

vi.mock("@/db/queries", () => ({
  getUserData: (...args: unknown[]) => mockGetUserData(...args),
  getOfferWithRevisionAndLines: (...args: unknown[]) =>
    mockGetOfferWithRevisionAndLines(...args),
  updateRevisionDiscountWithAudit: (...args: unknown[]) =>
    mockUpdateRevisionDiscountWithAudit(...args),
  updateRevisionSettingsWithAudit: (...args: unknown[]) =>
    mockUpdateRevisionSettingsWithAudit(...args),
  QueryError: class QueryError extends Error {
    errorCode: number;
    constructor(message: string, errorCode: number) {
      super(message);
      this.name = "QueryError";
      this.errorCode = errorCode;
    }
  },
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

vi.mock("pg", () => ({
  DatabaseError: class DatabaseError extends Error {
    constructor(message: string) {
      super(message);
      this.name = "DatabaseError";
    }
  },
}));

// --- Imports (after mocks) ---

import {
  setRevisionDiscountAction,
  setRevisionSettingsAction,
} from "@/app/actions/offer-revision-actions";
import { MSG } from "@/lib/messages";

const OFFER_ID = 5;
const REVISION_ID = 7;

function validSettings() {
  return {
    show_net_total_only: false,
    transport_amount: 1000,
    transport_mode: "INCLUDED" as const,
    installation_mode: "TBD" as const,
    installation_items: [
      { kind: "BASE_SYSTEM" as const, amount: 0, included: false },
      { kind: "HP_ROOF_BAR" as const, amount: 0, included: false },
    ],
  };
}

describe("setRevisionDiscountAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUserData.mockResolvedValue({ id: "u1", role: "SALES" });
    mockGetOfferWithRevisionAndLines.mockResolvedValue({
      id: OFFER_ID,
      revisions: [{ id: REVISION_ID, status: "DRAFT", lines: [] }],
    });
    mockUpdateRevisionDiscountWithAudit.mockResolvedValue(undefined);
  });

  test("sets the discount and recomputes line nets", async () => {
    const result = await setRevisionDiscountAction(OFFER_ID, 10);
    expect(result).toEqual({ success: true });
    expect(mockUpdateRevisionDiscountWithAudit).toHaveBeenCalledWith({
      revisionId: REVISION_ID,
      discount_pct: "10.00",
      updated_by: "u1",
    });
  });

  test("rejects ENGINEER (no offer access)", async () => {
    mockGetUserData.mockResolvedValue({ id: "e1", role: "ENGINEER" });
    const result = await setRevisionDiscountAction(OFFER_ID, 10);
    expect(result).toEqual({ success: false, error: MSG.offer.unauthorized });
    expect(mockUpdateRevisionDiscountWithAudit).not.toHaveBeenCalled();
  });

  test("returns notFound when the offer is out of scope", async () => {
    mockGetOfferWithRevisionAndLines.mockResolvedValue(null);
    const result = await setRevisionDiscountAction(OFFER_ID, 10);
    expect(result).toEqual({ success: false, error: MSG.offer.notFound });
    expect(mockUpdateRevisionDiscountWithAudit).not.toHaveBeenCalled();
  });

  test("rejects a non-DRAFT revision", async () => {
    mockGetOfferWithRevisionAndLines.mockResolvedValue({
      id: OFFER_ID,
      revisions: [{ id: REVISION_ID, status: "SENT", lines: [] }],
    });
    const result = await setRevisionDiscountAction(OFFER_ID, 10);
    expect(result).toEqual({
      success: false,
      error: MSG.offer.lineCannotEdit,
    });
    expect(mockUpdateRevisionDiscountWithAudit).not.toHaveBeenCalled();
  });

  test("rejects an out-of-range discount", async () => {
    const result = await setRevisionDiscountAction(OFFER_ID, 50);
    expect(result).toEqual({
      success: false,
      error: MSG.offer.invalidDiscount,
    });
    expect(mockUpdateRevisionDiscountWithAudit).not.toHaveBeenCalled();
  });
});

describe("setRevisionSettingsAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUserData.mockResolvedValue({ id: "u1", role: "SALES_MANAGER" });
    mockGetOfferWithRevisionAndLines.mockResolvedValue({
      id: OFFER_ID,
      revisions: [{ id: REVISION_ID, status: "DRAFT", lines: [] }],
    });
    mockUpdateRevisionSettingsWithAudit.mockResolvedValue(undefined);
  });

  test("persists settings with the transport amount as a fixed string", async () => {
    const result = await setRevisionSettingsAction(OFFER_ID, validSettings());
    expect(result).toEqual({ success: true });
    expect(mockUpdateRevisionSettingsWithAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        revisionId: REVISION_ID,
        updated_by: "u1",
        settings: expect.objectContaining({ transport_amount: "1000.00" }),
      }),
    );
  });

  test("rejects a non-DRAFT revision", async () => {
    mockGetOfferWithRevisionAndLines.mockResolvedValue({
      id: OFFER_ID,
      revisions: [{ id: REVISION_ID, status: "APPROVED_TO_SEND", lines: [] }],
    });
    const result = await setRevisionSettingsAction(OFFER_ID, validSettings());
    expect(result).toEqual({
      success: false,
      error: MSG.offer.lineCannotEdit,
    });
    expect(mockUpdateRevisionSettingsWithAudit).not.toHaveBeenCalled();
  });

  test("rejects a negative transport amount", async () => {
    const result = await setRevisionSettingsAction(OFFER_ID, {
      ...validSettings(),
      transport_amount: -10,
    });
    expect(result.success).toBe(false);
    expect(mockUpdateRevisionSettingsWithAudit).not.toHaveBeenCalled();
  });
});
