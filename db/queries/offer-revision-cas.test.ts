// @vitest-environment node
import { beforeEach, describe, expect, test, vi } from "vitest";

// --- Mocks ---
// We exercise the REAL status-guarded revision header writes (issue #241), so
// only the db connection is faked. Both helpers open their own transaction on
// the db module; the fake db hands the callback a recording tx. The offer row
// lock (`select ... for update`) runs through tx.execute.
const txStub = {
  execute: vi.fn(),
  select: vi.fn(),
  update: vi.fn(),
  insert: vi.fn(),
};

/** The offer row lock must be the first statement: before the audit pre-read. */
function expectLockedBeforeAuditRead() {
  expect(txStub.execute).toHaveBeenCalledTimes(1);
  const lockOrder = txStub.execute.mock.invocationCallOrder[0];
  const readOrder = txStub.select.mock.invocationCallOrder[0];
  expect(lockOrder).toBeLessThan(readOrder);
}

vi.mock("@/db", () => ({
  db: { transaction: (cb: (tx: unknown) => unknown) => cb(txStub) },
}));

import {
  QueryError,
  type RevisionSettingsUpdate,
  updateRevisionDiscountWithAudit,
  updateRevisionSettingsWithAudit,
} from "@/db/queries";
import { activityLogs, offerRevisionLines, offerRevisions } from "@/db/schemas";
import { MSG } from "@/lib/messages";

const OFFER_ID = 5;
const REVISION_ID = 300;

const SETTINGS: RevisionSettingsUpdate = {
  show_net_total_only: false,
  transport_amount: "100.00",
  transport_mode: "INCLUDED",
  installation_mode: "INCLUDED",
  installation_items: [],
};

const selectChain = (rows: unknown[]) => ({
  from: () => ({ where: () => Promise.resolve(rows) }),
});

// The revision header CAS consumes .returning(); the discount line reprice
// awaits the .where() object directly (non-thenable), so one shape serves both.
const updateChain = (returned: unknown[]) => ({
  set: () => ({
    where: () => ({ returning: () => returned }),
  }),
});

beforeEach(() => {
  vi.clearAllMocks();
  txStub.select.mockReturnValue(
    selectChain([{ discount_pct: "0.00", ...SETTINGS }]),
  );
  txStub.update.mockReturnValue(updateChain([{ id: REVISION_ID }]));
  txStub.insert.mockReturnValue({ values: () => Promise.resolve(undefined) });
});

describe("updateRevisionDiscountWithAudit — DRAFT compare-and-swap", () => {
  const DATA = {
    offerId: OFFER_ID,
    revisionId: REVISION_ID,
    discount_pct: "10.00",
    updated_by: "actor",
  };

  test("locks the offer row, reprices lines and audits when the guard matches", async () => {
    await expect(
      updateRevisionDiscountWithAudit(DATA),
    ).resolves.toBeUndefined();

    expect(txStub.update.mock.calls.map(([table]) => table)).toEqual([
      offerRevisions,
      offerRevisionLines,
    ]);
    expect(txStub.insert).toHaveBeenCalledWith(activityLogs);
    expectLockedBeforeAuditRead();
  });

  test("throws 403 and skips the line reprice and audit when the revision left DRAFT", async () => {
    txStub.update.mockReturnValue(updateChain([]));

    await expect(updateRevisionDiscountWithAudit(DATA)).rejects.toThrow(
      new QueryError(MSG.offer.lineCannotEdit),
    );
    expect(txStub.update).toHaveBeenCalledTimes(1); // header CAS only, no reprice
    expect(txStub.insert).not.toHaveBeenCalled();
  });

  test("throws 404 and writes nothing when the revision does not exist", async () => {
    txStub.select.mockReturnValue(selectChain([]));

    await expect(updateRevisionDiscountWithAudit(DATA)).rejects.toThrow(
      new QueryError(MSG.offer.notFound),
    );
    expect(txStub.update).not.toHaveBeenCalled();
    expect(txStub.insert).not.toHaveBeenCalled();
  });
});

describe("updateRevisionSettingsWithAudit — DRAFT compare-and-swap", () => {
  const DATA = {
    offerId: OFFER_ID,
    revisionId: REVISION_ID,
    settings: SETTINGS,
    updated_by: "actor",
  };

  test("locks the offer row, updates the header and audits when the guard matches", async () => {
    await expect(
      updateRevisionSettingsWithAudit(DATA),
    ).resolves.toBeUndefined();

    expect(txStub.update).toHaveBeenCalledExactlyOnceWith(offerRevisions);
    expect(txStub.insert).toHaveBeenCalledWith(activityLogs);
    expectLockedBeforeAuditRead();
  });

  test("throws 403 and skips the audit when the revision left DRAFT", async () => {
    txStub.update.mockReturnValue(updateChain([]));

    await expect(updateRevisionSettingsWithAudit(DATA)).rejects.toThrow(
      new QueryError(MSG.offer.lineCannotEdit),
    );
    expect(txStub.insert).not.toHaveBeenCalled();
  });

  test("throws 404 and writes nothing when the revision does not exist", async () => {
    txStub.select.mockReturnValue(selectChain([]));

    await expect(updateRevisionSettingsWithAudit(DATA)).rejects.toThrow(
      new QueryError(MSG.offer.notFound),
    );
    expect(txStub.update).not.toHaveBeenCalled();
    expect(txStub.insert).not.toHaveBeenCalled();
  });
});
