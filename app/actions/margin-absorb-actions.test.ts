// @vitest-environment node
import { beforeEach, describe, expect, test, vi } from "vitest";

// --- Mocks ---

const mockGetUserData = vi.fn();
const mockGetOfferLinePricingForConfig = vi.fn();
const mockGetEngineeringBomItems = vi.fn();
const mockAbsorbOfferLineMarginWithAudit = vi.fn();
const mockEnrichWithCosts = vi.fn();
const mockPrepareOfferDisplayData = vi.fn();

vi.mock("@/db/queries", () => ({
  getUserData: (...args: unknown[]) => mockGetUserData(...args),
  getOfferLinePricingForConfig: (...args: unknown[]) =>
    mockGetOfferLinePricingForConfig(...args),
  getEngineeringBomItems: (...args: unknown[]) =>
    mockGetEngineeringBomItems(...args),
  absorbOfferLineMarginWithAudit: (...args: unknown[]) =>
    mockAbsorbOfferLineMarginWithAudit(...args),
  QueryError: class QueryError extends Error {
    errorCode: number;
    constructor(message: string, errorCode: number) {
      super(message);
      this.name = "QueryError";
      this.errorCode = errorCode;
    }
  },
}));

vi.mock("@/lib/BOM", () => ({
  enrichWithCosts: (...args: unknown[]) => mockEnrichWithCosts(...args),
}));

vi.mock("@/lib/offer", () => ({
  prepareOfferDisplayData: (...args: unknown[]) =>
    mockPrepareOfferDisplayData(...args),
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

import { revalidatePath } from "next/cache";
import { absorbLineMarginAction } from "@/app/actions/margin-absorb-actions";
import { QueryError } from "@/db/queries";
import { MSG } from "@/lib/messages";

const CONF_ID = 42;
const LINE_ID = 11;
const OFFER_ID = 5;
const REVISION_ID = 7;

/** An accepted, frozen, not-yet-absorbed line row for the config. */
function makeLine(overrides: Record<string, unknown> = {}) {
  return {
    id: LINE_ID,
    offer_id: OFFER_ID,
    revision_id: REVISION_ID,
    pricing_snapshot: [{ pn: "A" }],
    net_price: "1000.00",
    list_price: "1200.00",
    discount_pct: "10.00",
    revisionStatus: "ACCEPTED",
    as_sold_snapshot: {},
    as_sold_frozen_at: new Date("2026-06-01T09:00:00Z"),
    absorbed_by: null,
    absorbed_by_email: null,
    absorbed_at: null,
    absorbed_margin_percent: null,
    absorbed_note: null,
    ...overrides,
  };
}

/** One enriched EBOM row costing `cost` (revenue is fixed at 1000). */
function makeEbomRow(cost: number) {
  return {
    pn: "A",
    description: "desc A",
    qty: 1,
    cost,
    tag: null,
    is_deleted: false,
  };
}

describe("absorbLineMarginAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUserData.mockResolvedValue({ id: "u1", role: "ADMIN" });
    mockGetOfferLinePricingForConfig.mockResolvedValue(makeLine());
    // Live margin: revenue 1000, EBOM cost 800 → 20% (below the 30% threshold).
    mockPrepareOfferDisplayData.mockReturnValue({
      displayData: { discounted_total: 1000 },
    });
    mockGetEngineeringBomItems.mockResolvedValue([{ is_deleted: false }]);
    mockEnrichWithCosts.mockResolvedValue([makeEbomRow(800)]);
    mockAbsorbOfferLineMarginWithAudit.mockResolvedValue(undefined);
  });

  // --- Happy path & integrity ---

  test("records the sign-off with the server-computed margin (never the client's)", async () => {
    const result = await absorbLineMarginAction(CONF_ID, { note: "ok" });
    expect(result).toEqual({ success: true });
    expect(mockAbsorbOfferLineMarginWithAudit).toHaveBeenCalledWith({
      lineId: LINE_ID,
      offerId: OFFER_ID,
      configId: CONF_ID,
      revisionId: REVISION_ID,
      absorbedBy: "u1",
      absorbedMarginPct: "20.00",
      thresholdPct: 30,
      note: "ok",
    });
  });

  test("revalidates the margin page, the offer detail and the offer list", async () => {
    await absorbLineMarginAction(CONF_ID, {});
    expect(revalidatePath).toHaveBeenCalledWith(
      `/configurazioni/marginalita/${CONF_ID}`,
    );
    expect(revalidatePath).toHaveBeenCalledWith(`/offerte/${OFFER_ID}`);
    expect(revalidatePath).toHaveBeenCalledWith("/offerte");
  });

  test("normalizes a missing or blank note to null", async () => {
    await absorbLineMarginAction(CONF_ID, {});
    expect(mockAbsorbOfferLineMarginWithAudit).toHaveBeenCalledWith(
      expect.objectContaining({ note: null }),
    );

    vi.clearAllMocks();
    mockGetUserData.mockResolvedValue({ id: "u1", role: "ADMIN" });
    mockGetOfferLinePricingForConfig.mockResolvedValue(makeLine());
    mockPrepareOfferDisplayData.mockReturnValue({
      displayData: { discounted_total: 1000 },
    });
    mockGetEngineeringBomItems.mockResolvedValue([{ is_deleted: false }]);
    mockEnrichWithCosts.mockResolvedValue([makeEbomRow(800)]);
    mockAbsorbOfferLineMarginWithAudit.mockResolvedValue(undefined);

    await absorbLineMarginAction(CONF_ID, { note: "   " });
    expect(mockAbsorbOfferLineMarginWithAudit).toHaveBeenCalledWith(
      expect.objectContaining({ note: null }),
    );
  });

  test("rejects a note longer than 500 characters before touching auth", async () => {
    const result = await absorbLineMarginAction(CONF_ID, {
      note: "x".repeat(501),
    });
    expect(result).toEqual({
      success: false,
      error: "La nota non può superare 500 caratteri.",
    });
    expect(mockGetUserData).not.toHaveBeenCalled();
    expect(mockAbsorbOfferLineMarginWithAudit).not.toHaveBeenCalled();
  });

  test("rejects a non-positive or non-integer confId", async () => {
    expect(await absorbLineMarginAction(0, {})).toEqual({
      success: false,
      error: MSG.config.notFound,
    });
    expect(await absorbLineMarginAction(1.5, {})).toEqual({
      success: false,
      error: MSG.config.notFound,
    });
    expect(mockAbsorbOfferLineMarginWithAudit).not.toHaveBeenCalled();
  });

  // --- Permission matrix ---

  test.each([
    "SALES",
    "SALES_MANAGER",
    "ENGINEER",
  ])("rejects %s (margin review is ADMIN / SALES_DIRECTOR only)", async (role) => {
    mockGetUserData.mockResolvedValue({ id: "u2", role });
    const result = await absorbLineMarginAction(CONF_ID, {});
    expect(result).toEqual({
      success: false,
      error: MSG.marginReview.absorbUnauthorized,
    });
    expect(mockAbsorbOfferLineMarginWithAudit).not.toHaveBeenCalled();
  });

  test.each(["ADMIN", "SALES_DIRECTOR"])("allows %s", async (role) => {
    mockGetUserData.mockResolvedValue({ id: "u3", role });
    const result = await absorbLineMarginAction(CONF_ID, {});
    expect(result).toEqual({ success: true });
    expect(mockAbsorbOfferLineMarginWithAudit).toHaveBeenCalledWith(
      expect.objectContaining({ absorbedBy: "u3" }),
    );
  });

  test("rejects an unauthenticated user", async () => {
    mockGetUserData.mockResolvedValue(null);
    const result = await absorbLineMarginAction(CONF_ID, {});
    expect(result).toEqual({
      success: false,
      error: MSG.auth.userNotAuthenticated,
    });
    expect(mockAbsorbOfferLineMarginWithAudit).not.toHaveBeenCalled();
  });

  // --- State gates ---

  test("rejects a config without an offer line", async () => {
    mockGetOfferLinePricingForConfig.mockResolvedValue(null);
    const result = await absorbLineMarginAction(CONF_ID, {});
    expect(result).toEqual({
      success: false,
      error: MSG.marginReview.absorbNotAccepted,
    });
    expect(mockAbsorbOfferLineMarginWithAudit).not.toHaveBeenCalled();
  });

  test.each([
    ["a non-accepted revision", { revisionStatus: "SENT" }],
    ["a line without the as-sold freeze", { as_sold_frozen_at: null }],
    ["a line without a pricing snapshot", { pricing_snapshot: null }],
  ])("rejects %s", async (_label, overrides) => {
    mockGetOfferLinePricingForConfig.mockResolvedValue(makeLine(overrides));
    const result = await absorbLineMarginAction(CONF_ID, {});
    expect(result).toEqual({
      success: false,
      error: MSG.marginReview.absorbNotAccepted,
    });
    expect(mockAbsorbOfferLineMarginWithAudit).not.toHaveBeenCalled();
  });

  // --- Alert-active gate & re-absorb rule ---

  test("rejects when the margin is not below threshold (nothing to sign off)", async () => {
    mockEnrichWithCosts.mockResolvedValue([makeEbomRow(600)]); // 40% ≥ 30%
    const result = await absorbLineMarginAction(CONF_ID, {});
    expect(result).toEqual({
      success: false,
      error: MSG.marginReview.absorbNotActive,
    });
    expect(mockAbsorbOfferLineMarginWithAudit).not.toHaveBeenCalled();
  });

  test("rejects a re-absorb when the existing sign-off already covers the live margin", async () => {
    mockGetOfferLinePricingForConfig.mockResolvedValue(
      makeLine({ absorbed_margin_percent: "20.00" }), // live is 20% → covered
    );
    const result = await absorbLineMarginAction(CONF_ID, {});
    expect(result).toEqual({
      success: false,
      error: MSG.marginReview.absorbNotActive,
    });
    expect(mockAbsorbOfferLineMarginWithAudit).not.toHaveBeenCalled();
  });

  test("allows a re-absorb after further drift below the absorbed margin", async () => {
    mockGetOfferLinePricingForConfig.mockResolvedValue(
      makeLine({ absorbed_margin_percent: "25.00" }), // live 20% < absorbed 25%
    );
    const result = await absorbLineMarginAction(CONF_ID, {});
    expect(result).toEqual({ success: true });
    expect(mockAbsorbOfferLineMarginWithAudit).toHaveBeenCalledWith(
      expect.objectContaining({ absorbedMarginPct: "20.00" }),
    );
  });

  // --- Error mapping ---

  test("maps a QueryError from the audit helper to its message", async () => {
    mockAbsorbOfferLineMarginWithAudit.mockRejectedValue(
      new QueryError(MSG.marginReview.absorbNotAccepted, 409),
    );
    const result = await absorbLineMarginAction(CONF_ID, {});
    expect(result).toEqual({
      success: false,
      error: MSG.marginReview.absorbNotAccepted,
    });
  });

  test("maps a DatabaseError to the generic DB message", async () => {
    const { DatabaseError } = await import("pg");
    mockAbsorbOfferLineMarginWithAudit.mockRejectedValue(
      new (DatabaseError as unknown as new (m: string) => Error)("boom"),
    );
    const result = await absorbLineMarginAction(CONF_ID, {});
    expect(result).toEqual({ success: false, error: MSG.db.error });
  });

  test("maps an unknown error to the unknown message", async () => {
    mockAbsorbOfferLineMarginWithAudit.mockRejectedValue(new Error("boom"));
    const result = await absorbLineMarginAction(CONF_ID, {});
    expect(result).toEqual({ success: false, error: MSG.db.unknown });
  });
});
