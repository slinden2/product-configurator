// @vitest-environment node
import { beforeEach, describe, expect, test, vi } from "vitest";

// --- Mocks ---
// We exercise the REAL in-tx absorb guard (issue #256), so only the db
// connection is faked. The helper opens its own transaction on the db module;
// the fake db hands the callback a recording tx. The offer row lock
// (`select ... for update`) runs through tx.execute.
const txStub = {
  execute: vi.fn(),
  select: vi.fn(),
  update: vi.fn(),
  insert: vi.fn(),
};

/** The offer row lock must be the first statement: before the guard read. */
function expectLockedBeforeGuardRead() {
  expect(txStub.execute).toHaveBeenCalledTimes(1);
  const lockOrder = txStub.execute.mock.invocationCallOrder[0];
  const readOrder = txStub.select.mock.invocationCallOrder[0];
  expect(lockOrder).toBeLessThan(readOrder);
}

vi.mock("@/db", () => ({
  db: { transaction: (cb: (tx: unknown) => unknown) => cb(txStub) },
}));

import { absorbOfferLineMarginWithAudit, QueryError } from "@/db/queries";
import { activityLogs, offerRevisionLines } from "@/db/schemas";
import { MSG } from "@/lib/messages";

const DATA = {
  lineId: 42,
  offerId: 5,
  configId: 7,
  revisionId: 300,
  absorbedBy: "director",
  absorbedMarginPct: "12.34",
  thresholdPct: 20,
  note: null,
};

/** A line row that passes every in-tx gate. */
const inForceLine = {
  revision_status: "ACCEPTED",
  revision_id: 300,
  accepted_revision_id: 300,
  as_sold_frozen_at: new Date("2026-07-01"),
  absorbed_by: null,
  absorbed_at: null,
  absorbed_margin_percent: null,
};

// select().from().innerJoin().innerJoin().where().for(...) resolves the rows.
const selectChain = (rows: unknown[]) => ({
  from: () => ({
    innerJoin: () => ({
      innerJoin: () => ({
        where: () => ({ for: () => Promise.resolve(rows) }),
      }),
    }),
  }),
});

beforeEach(() => {
  vi.clearAllMocks();
  txStub.select.mockReturnValue(selectChain([inForceLine]));
  txStub.update.mockReturnValue({
    set: () => ({ where: () => Promise.resolve(undefined) }),
  });
  txStub.insert.mockReturnValue({ values: () => Promise.resolve(undefined) });
});

describe("absorbOfferLineMarginWithAudit — in-force accepted revision guard", () => {
  test("locks the offer row, writes the sign-off and audits when the line is in force", async () => {
    await expect(absorbOfferLineMarginWithAudit(DATA)).resolves.toBeUndefined();

    expect(txStub.update).toHaveBeenCalledExactlyOnceWith(offerRevisionLines);
    expect(txStub.insert).toHaveBeenCalledWith(activityLogs);
    expectLockedBeforeGuardRead();
  });

  test("throws 409 when the line's revision is no longer the offer's accepted one (superseded by a renegotiation re-acceptance)", async () => {
    txStub.select.mockReturnValue(
      selectChain([{ ...inForceLine, accepted_revision_id: 301 }]),
    );

    await expect(absorbOfferLineMarginWithAudit(DATA)).rejects.toThrow(
      new QueryError(MSG.marginReview.absorbNotAccepted),
    );
    expect(txStub.update).not.toHaveBeenCalled();
    expect(txStub.insert).not.toHaveBeenCalled();
  });

  test("throws 409 when the revision is not ACCEPTED", async () => {
    txStub.select.mockReturnValue(
      selectChain([{ ...inForceLine, revision_status: "SENT" }]),
    );

    await expect(absorbOfferLineMarginWithAudit(DATA)).rejects.toThrow(
      new QueryError(MSG.marginReview.absorbNotAccepted),
    );
    expect(txStub.update).not.toHaveBeenCalled();
    expect(txStub.insert).not.toHaveBeenCalled();
  });

  test("throws 409 when the as-sold freeze is missing", async () => {
    txStub.select.mockReturnValue(
      selectChain([{ ...inForceLine, as_sold_frozen_at: null }]),
    );

    await expect(absorbOfferLineMarginWithAudit(DATA)).rejects.toThrow(
      new QueryError(MSG.marginReview.absorbNotAccepted),
    );
    expect(txStub.update).not.toHaveBeenCalled();
    expect(txStub.insert).not.toHaveBeenCalled();
  });

  test("throws 409 when the line does not exist", async () => {
    txStub.select.mockReturnValue(selectChain([]));

    await expect(absorbOfferLineMarginWithAudit(DATA)).rejects.toThrow(
      new QueryError(MSG.marginReview.absorbNotAccepted),
    );
    expect(txStub.update).not.toHaveBeenCalled();
    expect(txStub.insert).not.toHaveBeenCalled();
  });
});
