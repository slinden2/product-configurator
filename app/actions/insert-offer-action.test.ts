// @vitest-environment node
import { beforeEach, describe, expect, test, vi } from "vitest";

// --- Mocks ---

const mockGetUserData = vi.fn();
const mockInsertOffer = vi.fn();
const mockLogActivity = vi.fn();

vi.mock("@/db/queries", () => ({
  getUserData: (...args: unknown[]) => mockGetUserData(...args),
  insertOffer: (...args: unknown[]) => mockInsertOffer(...args),
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

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

vi.mock("pg", () => ({
  DatabaseError: class DatabaseError extends Error {
    code?: string;
    constructor(message: string, code?: string) {
      super(message);
      this.name = "DatabaseError";
      this.code = code;
    }
  },
}));

// --- Imports (after mocks) ---

import { DatabaseError } from "pg";
import { insertOfferAction } from "@/app/actions/insert-offer-action";
import { QueryError } from "@/db/queries";
import { MSG } from "@/lib/messages";

const validInput = {
  customer_name: "Cliente X",
  customer_address: "",
  customer_email: "",
};

describe("insertOfferAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUserData.mockResolvedValue({
      id: "u1",
      role: "SALES",
      initials: "SX",
    });
    mockInsertOffer.mockResolvedValue({ id: 7 });
  });

  test("creates an offer for a sales user", async () => {
    const result = await insertOfferAction(validInput);
    expect(result).toEqual({ success: true, id: 7 });
    expect(mockInsertOffer).toHaveBeenCalledWith(
      expect.objectContaining({ customer_name: "Cliente X" }),
      "u1",
    );
    expect(mockLogActivity).toHaveBeenCalledTimes(1);
  });

  test("rejects ENGINEER (no offer access)", async () => {
    mockGetUserData.mockResolvedValue({
      id: "e1",
      role: "ENGINEER",
      initials: "EN",
    });
    const result = await insertOfferAction(validInput);
    expect(result).toEqual({ success: false, error: MSG.offer.unauthorized });
    expect(mockInsertOffer).not.toHaveBeenCalled();
  });

  test("returns error when unauthenticated", async () => {
    mockGetUserData.mockResolvedValue(null);
    const result = await insertOfferAction(validInput);
    expect(result).toEqual({
      success: false,
      error: MSG.auth.userNotAuthenticated,
    });
    expect(mockInsertOffer).not.toHaveBeenCalled();
  });

  test("returns a validation error for a blank customer name", async () => {
    const result = await insertOfferAction({ customer_name: "" });
    expect(result.success).toBe(false);
    expect(mockInsertOffer).not.toHaveBeenCalled();
  });

  test("surfaces a retry message on a unique offer_number violation", async () => {
    // The mocked pg DatabaseError takes (message, code?); cast past pg's real
    // 3-arg type so the instanceof + code check in the action is exercised.
    const DbErrorCtor = DatabaseError as unknown as new (
      message: string,
      code: string,
    ) => Error;
    mockInsertOffer.mockRejectedValue(new DbErrorCtor("duplicate", "23505"));
    const result = await insertOfferAction(validInput);
    expect(result).toEqual({ success: false, error: MSG.offer.numberRetry });
  });

  test("returns the QueryError message on a controlled failure", async () => {
    mockInsertOffer.mockRejectedValue(
      new QueryError(MSG.offer.createFailed, 500),
    );
    const result = await insertOfferAction(validInput);
    expect(result).toEqual({ success: false, error: MSG.offer.createFailed });
  });
});
