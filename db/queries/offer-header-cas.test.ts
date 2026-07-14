// @vitest-environment node
import { beforeEach, describe, expect, test, vi } from "vitest";

// --- Mocks ---
// We exercise the REAL offer-header write (issue #265), so only the db connection
// is faked. The helper opens its own transaction on the db module; the fake db
// hands the callback a recording tx. The offer row lock (`select ... for update`)
// runs through tx.execute.
const setSpy = vi.fn();

const txStub = {
  execute: vi.fn(),
  select: vi.fn(),
  selectDistinct: vi.fn(),
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

import { QueryError, updateOfferHeaderWithAudit } from "@/db/queries";
import { activityLogs, configurations, offers } from "@/db/schemas";
import { MSG } from "@/lib/messages";
import type { OfferHeaderInput } from "@/validation/offer/offer-schema";

const OFFER_ID = 5;
const CONFIG_IDS = [11, 12];

const EXISTING = {
  customer_name: "Rossi Trasporti",
  customer_address: "Via Roma 12",
  customer_email: "rossi@example.it",
};

const RENAME: OfferHeaderInput = {
  customer_name: "Rossi Logistica",
  customer_address: "Via Roma 12",
  customer_email: "rossi@example.it",
};

const selectChain = (rows: unknown[]) => ({
  from: () => ({ where: () => Promise.resolve(rows) }),
});

const selectDistinctChain = (rows: unknown[]) => ({
  from: () => ({
    innerJoin: () => ({ where: () => Promise.resolve(rows) }),
  }),
});

// The header UPDATE consumes .returning(); the shadow fan-out awaits the .where()
// object directly (non-thenable), so one shape serves both.
const updateChain = (returned: unknown[]) => ({
  set: (values: unknown) => {
    setSpy(values);
    return { where: () => ({ returning: () => returned }) };
  },
});

beforeEach(() => {
  vi.clearAllMocks();
  txStub.select.mockReturnValue(selectChain([EXISTING]));
  txStub.selectDistinct.mockReturnValue(
    selectDistinctChain(CONFIG_IDS.map((id) => ({ id }))),
  );
  txStub.update.mockReturnValue(updateChain([{ id: OFFER_ID }]));
  txStub.insert.mockReturnValue({ values: () => Promise.resolve(undefined) });
});

describe("updateOfferHeaderWithAudit", () => {
  const DATA = { offerId: OFFER_ID, header: RENAME, updated_by: "actor" };

  test("locks the offer row, re-syncs the config name shadow and audits on a rename", async () => {
    await expect(updateOfferHeaderWithAudit(DATA)).resolves.toEqual({
      configIds: CONFIG_IDS,
    });

    expect(txStub.update.mock.calls.map(([table]) => table)).toEqual([
      offers,
      configurations,
    ]);
    expect(txStub.insert).toHaveBeenCalledWith(activityLogs);
    expectLockedBeforeAuditRead();
  });

  test("re-syncs the shadow status-blind — no status predicate narrows the fan-out", async () => {
    // The shadow is the display source on every config detail surface, so a
    // TECH_APPROVED/CLOSED config must be renamed too. Guard against a future
    // status filter being added: every config on the offer comes back.
    await expect(updateOfferHeaderWithAudit(DATA)).resolves.toEqual({
      configIds: CONFIG_IDS,
    });
    expect(setSpy).toHaveBeenLastCalledWith({
      name: RENAME.customer_name,
    });
  });

  test("leaves configurations untouched when only address/email change", async () => {
    const DATA_NO_RENAME = {
      offerId: OFFER_ID,
      header: {
        ...RENAME,
        customer_name: EXISTING.customer_name,
        customer_address: "Via Milano 3",
      },
      updated_by: "actor",
    };

    await expect(updateOfferHeaderWithAudit(DATA_NO_RENAME)).resolves.toEqual({
      configIds: [],
    });

    // Header only — the engineers' technical queue must not reshuffle.
    expect(txStub.update.mock.calls.map(([table]) => table)).toEqual([offers]);
    expect(txStub.selectDistinct).not.toHaveBeenCalled();
    expect(txStub.insert).toHaveBeenCalledWith(activityLogs);
  });

  test("stores blank optional fields as NULL, like insertOffer", async () => {
    await updateOfferHeaderWithAudit({
      offerId: OFFER_ID,
      header: { ...RENAME, customer_address: "", customer_email: "" },
      updated_by: "actor",
    });

    expect(setSpy).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        customer_name: RENAME.customer_name,
        customer_address: null,
        customer_email: null,
      }),
    );
  });

  test("skips the shadow update when the offer has no lines", async () => {
    txStub.selectDistinct.mockReturnValue(selectDistinctChain([]));

    await expect(updateOfferHeaderWithAudit(DATA)).resolves.toEqual({
      configIds: [],
    });
    expect(txStub.update.mock.calls.map(([table]) => table)).toEqual([offers]);
    expect(txStub.insert).toHaveBeenCalledWith(activityLogs);
  });

  test("throws 404 and writes nothing when the offer does not exist", async () => {
    txStub.select.mockReturnValue(selectChain([]));

    await expect(updateOfferHeaderWithAudit(DATA)).rejects.toThrow(
      new QueryError(MSG.offer.notFound),
    );
    expect(txStub.update).not.toHaveBeenCalled();
    expect(txStub.insert).not.toHaveBeenCalled();
  });

  test("throws 404 when the offer vanishes between the locked read and the update", async () => {
    txStub.update.mockReturnValue(updateChain([]));

    await expect(updateOfferHeaderWithAudit(DATA)).rejects.toThrow(
      new QueryError(MSG.offer.notFound),
    );
    expect(txStub.insert).not.toHaveBeenCalled();
  });
});
