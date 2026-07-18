// @vitest-environment node
import { beforeEach, describe, expect, test, vi } from "vitest";

// --- Mocks ---

const mockGetUserData = vi.fn();
const mockGetOfferWorkingRevision = vi.fn();
const mockUpdateOfferHeaderWithAudit = vi.fn();

vi.mock("@/db/queries", () => ({
  getUserData: (...args: unknown[]) => mockGetUserData(...args),
  getOfferWorkingRevision: (...args: unknown[]) =>
    mockGetOfferWorkingRevision(...args),
  updateOfferHeaderWithAudit: (...args: unknown[]) =>
    mockUpdateOfferHeaderWithAudit(...args),
  QueryError: class QueryError extends Error {
    constructor(message: string) {
      super(message);
      this.name = "QueryError";
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

import { revalidatePath } from "next/cache";
import { updateOfferHeaderAction } from "@/app/actions/offer-header-actions";
import { QueryError } from "@/db/queries";
import { MSG } from "@/lib/messages";

const OFFER_ID = 5;
const CONFIG_ID = 42;

const SALES_USER = { id: "user-1", role: "SALES" };

const HEADER = {
  customer_name: "Rossi Logistica",
  customer_address: "Via Roma 12",
  customer_email: "rossi@example.it",
};

beforeEach(() => {
  vi.clearAllMocks();
  mockGetUserData.mockResolvedValue(SALES_USER);
  // Default: the working revision has already been SENT — header edits are
  // deliberately not revision-gated, so this must still go through.
  mockGetOfferWorkingRevision.mockResolvedValue({ id: 300, status: "SENT" });
  mockUpdateOfferHeaderWithAudit.mockResolvedValue({ configIds: [CONFIG_ID] });
});

describe("updateOfferHeaderAction", () => {
  test("updates the header even when the working revision has left DRAFT", async () => {
    // The header is the offer's stable spine: a customer typo stays correctable
    // after the quote is sent or accepted. This test IS that contract.
    const result = await updateOfferHeaderAction(OFFER_ID, HEADER);

    expect(result).toEqual({ success: true });
    expect(mockUpdateOfferHeaderWithAudit).toHaveBeenCalledWith({
      offerId: OFFER_ID,
      header: HEADER,
      updated_by: SALES_USER.id,
    });
  });

  test("revalidates the config pages when a rename re-synced the name shadow", async () => {
    await updateOfferHeaderAction(OFFER_ID, HEADER);

    const paths = vi.mocked(revalidatePath).mock.calls.map(([path]) => path);
    expect(paths).toEqual([
      `/offerte/${OFFER_ID}`,
      "/offerte",
      "/",
      "/configurazioni",
      `/configurazioni/modifica/${CONFIG_ID}`,
      `/configurazioni/visualizza/${CONFIG_ID}`,
      `/configurazioni/bom/${CONFIG_ID}`,
      `/configurazioni/marginalita/${CONFIG_ID}`,
    ]);
  });

  test("revalidates only the offer tree when no config was re-synced", async () => {
    mockUpdateOfferHeaderWithAudit.mockResolvedValue({ configIds: [] });

    await updateOfferHeaderAction(OFFER_ID, HEADER);

    const paths = vi.mocked(revalidatePath).mock.calls.map(([path]) => path);
    // "/" is always revalidated: the dashboard aggregates the offer queues.
    expect(paths).toEqual([`/offerte/${OFFER_ID}`, "/offerte", "/"]);
  });

  test("rejects an unauthenticated user", async () => {
    mockGetUserData.mockResolvedValue(null);

    const result = await updateOfferHeaderAction(OFFER_ID, HEADER);

    expect(result).toEqual({
      success: false,
      error: MSG.auth.userNotAuthenticated,
    });
    expect(mockUpdateOfferHeaderWithAudit).not.toHaveBeenCalled();
  });

  test("rejects ENGINEER — offers are a sales-and-admin workspace", async () => {
    mockGetUserData.mockResolvedValue({ id: "eng-1", role: "ENGINEER" });

    const result = await updateOfferHeaderAction(OFFER_ID, HEADER);

    expect(result).toEqual({
      success: false,
      error: MSG.offer.unauthorized,
    });
    expect(mockUpdateOfferHeaderWithAudit).not.toHaveBeenCalled();
  });

  test("rejects an offer outside the user's scope", async () => {
    mockGetOfferWorkingRevision.mockResolvedValue(null);

    const result = await updateOfferHeaderAction(OFFER_ID, HEADER);

    expect(result).toEqual({ success: false, error: MSG.offer.notFound });
    expect(mockUpdateOfferHeaderWithAudit).not.toHaveBeenCalled();
  });

  test("returns the Italian field message and never hits the db on invalid input", async () => {
    const result = await updateOfferHeaderAction(OFFER_ID, {
      ...HEADER,
      customer_email: "not-an-email",
    });

    expect(result.success).toBe(false);
    expect(result).toHaveProperty("error", "Email non valida.");
    expect(mockUpdateOfferHeaderWithAudit).not.toHaveBeenCalled();
  });

  test("rejects a customer name shorter than the config-name minimum", async () => {
    // A 2-char name would propagate into `configurations.name` (min 3) and make
    // every OFFER config on the offer un-saveable from its own form.
    const result = await updateOfferHeaderAction(OFFER_ID, {
      ...HEADER,
      customer_name: "Bo",
    });

    expect(result.success).toBe(false);
    expect(mockUpdateOfferHeaderWithAudit).not.toHaveBeenCalled();
  });

  test("surfaces a QueryError message from the query layer", async () => {
    mockUpdateOfferHeaderWithAudit.mockRejectedValue(
      new QueryError(MSG.offer.notFound),
    );

    const result = await updateOfferHeaderAction(OFFER_ID, HEADER);

    expect(result).toEqual({ success: false, error: MSG.offer.notFound });
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
