// @vitest-environment node
import { beforeEach, describe, expect, test, vi } from "vitest";

// --- Mocks ---
// We exercise the REAL acceptOfferRevisionWithAudit; a hand-built `tx` answers the
// relational offer load (query.offers.findFirst) and the revision-lines join, and
// records every update/insert. Only the db connection module is faked so importing
// @/db/queries doesn't open a connection.
vi.mock("@/db", () => ({ db: {} }));

import {
  acceptOfferRevisionWithAudit,
  type TransactionType,
} from "@/db/queries";
import {
  activityLogs,
  configurations,
  offerRevisionLines,
  offerRevisions,
  offers,
} from "@/db/schemas";
import { MSG } from "@/lib/messages";
import type { OfferConfigSnapshot } from "@/validation/offer-config-snapshot-schema";

// --- tx stub ---

interface OfferLoad {
  id: number;
  accepted_revision_id: number | null;
  /** Desc by revision_no, like the real relational load. */
  revisions: { id: number; revision_no: number }[];
}

interface TxState {
  offer: OfferLoad | null;
  lines: { lineId: number; configId: number; configStatus: string }[];
  /** Rows returned by the status-guarded revision UPDATE (empty = guard failed). */
  revisionUpdateReturns: { id: number }[];
}

function makeTx(state: TxState) {
  const updates: { table: unknown; set: Record<string, unknown> }[] = [];
  const inserts: { table: unknown; values: Record<string, unknown> }[] = [];

  const tx = {
    // The offer row lock (`select ... for update`) runs through tx.execute.
    execute: vi.fn().mockResolvedValue(undefined),
    query: {
      offers: {
        findFirst: vi.fn().mockResolvedValue(state.offer),
      },
    },
    // The lines read: select().from(offerRevisionLines).innerJoin(configurations).where().
    select: () => ({
      from: () => ({
        innerJoin: () => ({
          where: () => Promise.resolve(state.lines),
        }),
      }),
    }),
    update: (table: unknown) => ({
      set: (set: Record<string, unknown>) => {
        updates.push({ table, set });
        const result = Promise.resolve(undefined) as Promise<undefined> & {
          where: () => Promise<undefined> & {
            returning: () => Promise<{ id: number }[]>;
          };
        };
        result.where = () => {
          const whereResult = Promise.resolve(
            undefined,
          ) as Promise<undefined> & {
            returning: () => Promise<{ id: number }[]>;
          };
          whereResult.returning = () =>
            Promise.resolve(
              table === offerRevisions ? state.revisionUpdateReturns : [],
            );
          return whereResult;
        };
        return result;
      },
    }),
    insert: (table: unknown) => ({
      values: (values: Record<string, unknown>) => {
        inserts.push({ table, values });
        return Promise.resolve(undefined);
      },
    }),
  };

  const updatesFor = (table: unknown) =>
    updates.filter((u) => u.table === table).map((u) => u.set);
  const insertsFor = (table: unknown) =>
    inserts.filter((i) => i.table === table).map((i) => i.values);

  return { tx: tx as unknown as TransactionType, updatesFor, insertsFor };
}

const SNAPSHOT = {
  configuration: { name: "Config A" },
  waterTanks: [],
  washBays: [],
} as unknown as OfferConfigSnapshot;

function baseState(overrides: Partial<TxState> = {}): TxState {
  return {
    offer: {
      id: 5,
      accepted_revision_id: null,
      revisions: [{ id: 500, revision_no: 1 }],
    },
    lines: [
      { lineId: 21, configId: 7, configStatus: "DRAFT" },
      { lineId: 22, configId: 8, configStatus: "DRAFT" },
    ],
    revisionUpdateReturns: [{ id: 500 }],
    ...overrides,
  };
}

const AS_SOLD = { 7: SNAPSHOT, 8: SNAPSHOT };

// --- Tests ---

describe("acceptOfferRevisionWithAudit", () => {
  beforeEach(() => vi.clearAllMocks());

  test("first acceptance: hands configs off, freezes as-sold, sets accepted_revision_id", async () => {
    const { tx, updatesFor, insertsFor } = makeTx(baseState());

    await acceptOfferRevisionWithAudit(5, 500, "actor", AS_SOLD, tx);

    // Revision SENT → ACCEPTED and the offer pointer set.
    expect(updatesFor(offerRevisions)[0]).toMatchObject({
      status: "ACCEPTED",
    });
    expect(updatesFor(offers)[0]).toMatchObject({
      accepted_revision_id: 500,
    });

    // The engineering hand-off: one status update per line config.
    expect(updatesFor(configurations)).toEqual([
      { status: "SALES_APPROVED" },
      { status: "SALES_APPROVED" },
    ]);

    // As-sold freeze written on both lines (snapshot + marker together).
    const lineUpdates = updatesFor(offerRevisionLines);
    expect(lineUpdates).toHaveLength(2);
    for (const update of lineUpdates) {
      expect(update.as_sold_snapshot).toBe(SNAPSHOT);
      expect(update.as_sold_frozen_at).toBeInstanceOf(Date);
    }

    // Audits: status change + freeze per line, then the acceptance itself.
    const logs = insertsFor(activityLogs);
    expect(
      logs.filter((l) => l.action === "CONFIG_STATUS_CHANGE"),
    ).toHaveLength(2);
    expect(
      logs.filter((l) => l.action === "CONFIG_AS_SOLD_FREEZE"),
    ).toHaveLength(2);
    expect(logs.at(-1)).toMatchObject({
      action: "OFFER_REVISION_ACCEPT",
      metadata: expect.objectContaining({
        revisionId: 500,
        renegotiation: false,
        previousAcceptedRevisionId: null,
      }),
    });
  });

  test("re-acceptance: re-freezes and moves the pointer WITHOUT touching config statuses", async () => {
    const { tx, updatesFor, insertsFor } = makeTx(
      baseState({
        // The offer is already accepted (rev 500 in force); rev 900 is the SENT
        // renegotiation being accepted. Its configs live post-handoff.
        offer: {
          id: 5,
          accepted_revision_id: 500,
          revisions: [
            { id: 900, revision_no: 2 },
            { id: 500, revision_no: 1 },
          ],
        },
        lines: [
          { lineId: 41, configId: 7, configStatus: "IN_TECH_REVIEW" },
          { lineId: 42, configId: 8, configStatus: "TECH_APPROVED" },
        ],
        revisionUpdateReturns: [{ id: 900 }],
      }),
    );

    await acceptOfferRevisionWithAudit(5, 900, "actor", AS_SOLD, tx);

    // The pointer moves forward to the renegotiation revision.
    expect(updatesFor(offers)[0]).toMatchObject({
      accepted_revision_id: 900,
    });

    // The config fan-out must NOT fire: no configurations update, no status audit.
    expect(updatesFor(configurations)).toEqual([]);
    const logs = insertsFor(activityLogs);
    expect(
      logs.filter((l) => l.action === "CONFIG_STATUS_CHANGE"),
    ).toHaveLength(0);

    // The as-sold re-freeze fires on the NEW revision's lines.
    expect(updatesFor(offerRevisionLines)).toHaveLength(2);
    expect(
      logs.filter((l) => l.action === "CONFIG_AS_SOLD_FREEZE"),
    ).toHaveLength(2);

    expect(logs.at(-1)).toMatchObject({
      action: "OFFER_REVISION_ACCEPT",
      metadata: expect.objectContaining({
        revisionId: 900,
        renegotiation: true,
        previousAcceptedRevisionId: 500,
      }),
    });
  });

  test("rejects re-accepting the revision that is already in force", async () => {
    const { tx } = makeTx(
      baseState({
        offer: {
          id: 5,
          accepted_revision_id: 500,
          revisions: [{ id: 500, revision_no: 1 }],
        },
      }),
    );

    await expect(
      acceptOfferRevisionWithAudit(5, 500, "actor", AS_SOLD, tx),
    ).rejects.toThrow(MSG.offer.alreadyAccepted);
  });

  test("rejects a first acceptance when a clone-forward revision committed in the race window", async () => {
    // Revision 500 was SENT and targeted for acceptance, but a concurrent
    // clone-forward committed DRAFT revision 501 before this tx acquired the offer
    // lock — accepting 500 would leave an accepted offer with an open working
    // revision. The post-lock latest-revision guard must refuse without writing.
    const { tx, updatesFor, insertsFor } = makeTx(
      baseState({
        offer: {
          id: 5,
          accepted_revision_id: null,
          revisions: [
            { id: 501, revision_no: 2 },
            { id: 500, revision_no: 1 },
          ],
        },
      }),
    );

    await expect(
      acceptOfferRevisionWithAudit(5, 500, "actor", AS_SOLD, tx),
    ).rejects.toThrow(MSG.offer.cannotAccept);

    expect(updatesFor(offerRevisions)).toEqual([]);
    expect(updatesFor(offers)).toEqual([]);
    expect(updatesFor(configurations)).toEqual([]);
    expect(insertsFor(activityLogs)).toEqual([]);
  });

  test("rejects a re-acceptance when a newer renegotiation revision committed in the race window", async () => {
    // Rev 500 is in force; SENT renegotiation 900 is being re-accepted, but a
    // concurrent createRenegotiationRevisionAction committed DRAFT revision 901.
    const { tx } = makeTx(
      baseState({
        offer: {
          id: 5,
          accepted_revision_id: 500,
          revisions: [
            { id: 901, revision_no: 3 },
            { id: 900, revision_no: 2 },
            { id: 500, revision_no: 1 },
          ],
        },
      }),
    );

    await expect(
      acceptOfferRevisionWithAudit(5, 900, "actor", AS_SOLD, tx),
    ).rejects.toThrow(MSG.offer.cannotAccept);
  });

  test("rejects when the target revision does not belong to the offer", async () => {
    const { tx } = makeTx(baseState());

    await expect(
      acceptOfferRevisionWithAudit(5, 999, "actor", AS_SOLD, tx),
    ).rejects.toThrow(MSG.offer.notFound);
  });

  test("rejects when the revision is not SENT (guarded update returns no row)", async () => {
    const { tx } = makeTx(baseState({ revisionUpdateReturns: [] }));

    await expect(
      acceptOfferRevisionWithAudit(5, 500, "actor", AS_SOLD, tx),
    ).rejects.toThrow(MSG.offer.cannotAccept);
  });

  test("rejects an empty revision", async () => {
    const { tx } = makeTx(baseState({ lines: [] }));

    await expect(
      acceptOfferRevisionWithAudit(5, 500, "actor", AS_SOLD, tx),
    ).rejects.toThrow(MSG.offer.cannotSendEmpty);
  });

  test("rejects when a line's as-sold snapshot is missing", async () => {
    const { tx } = makeTx(baseState());

    await expect(
      acceptOfferRevisionWithAudit(5, 500, "actor", { 7: SNAPSHOT }, tx),
    ).rejects.toThrow(MSG.config.notFound);
  });
});
