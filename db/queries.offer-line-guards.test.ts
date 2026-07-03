// @vitest-environment node
import { beforeEach, describe, expect, test, vi } from "vitest";

// --- Mocks ---
// We exercise the REAL addOfferLine / removeOfferLine guards with stub readers.
// removeOfferLine opens its own transaction on the db module, so the fake db
// hands the callback a recording tx.
const txStub = {
  query: { offers: { findFirst: vi.fn() } },
  delete: vi.fn(),
  insert: vi.fn(),
};

vi.mock("@/db", () => ({
  db: { transaction: (cb: (tx: unknown) => unknown) => cb(txStub) },
}));

import {
  addOfferLine,
  removeOfferLine,
  type TransactionType,
} from "@/db/queries";
import { MSG } from "@/lib/messages";
import type { ConfigSchema } from "@/validation/config-schema";

/** An accepted offer whose working revision is an open renegotiation DRAFT. */
function renegotiationDraftOffer() {
  return {
    id: 5,
    user_id: "owner",
    accepted_revision_id: 200,
    revisions: [{ id: 300, status: "DRAFT", lines: [{ id: 31 }] }],
  };
}

describe("renegotiation line guards (structural edits locked)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    txStub.query.offers.findFirst.mockResolvedValue(renegotiationDraftOffer());
  });

  test("addOfferLine rejects on a renegotiation draft (config set is fixed)", async () => {
    await expect(
      addOfferLine(
        5,
        {} as ConfigSchema,
        "actor",
        txStub as unknown as TransactionType,
      ),
    ).rejects.toThrow(MSG.offer.renegotiationLinesLocked);
    expect(txStub.insert).not.toHaveBeenCalled();
  });

  test("removeOfferLine rejects on a renegotiation draft (would delete an engineering config)", async () => {
    await expect(removeOfferLine(5, 7, "actor")).rejects.toThrow(
      MSG.offer.renegotiationLinesLocked,
    );
    expect(txStub.delete).not.toHaveBeenCalled();
  });
});
