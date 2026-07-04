// @vitest-environment node
import { beforeEach, describe, expect, test, vi } from "vitest";

// --- Mocks ---
// We exercise the REAL unacceptOfferRevisionWithAudit; a hand-built `tx` answers the
// relational offer load (query.offers.findFirst), the revision-lines join, and records
// every update/insert. Only the db connection module is faked so importing
// @/db/queries doesn't open a connection.
vi.mock("@/db", () => ({ db: {} }));

import {
  type TransactionType,
  unacceptOfferRevisionWithAudit,
} from "@/db/queries";
import {
  activityLogs,
  configurations,
  offerRevisionLines,
  offerRevisions,
  offers,
} from "@/db/schemas";
import { MSG } from "@/lib/messages";

// --- tx stub ---

interface OfferLoad {
  id: number;
  accepted_revision_id: number | null;
  revisions: {
    id: number;
    revision_no: number;
    lines: { as_sold_frozen_at: Date | null }[];
  }[];
}

interface TxState {
  offer: OfferLoad | null;
  lines: { lineId: number; configId: number; configStatus: string }[];
  /** Rows returned by the status-guarded revision UPDATE (empty = guard failed). */
  revisionUpdateReturns: { id: number }[];
  /** Rows returned by the status-guarded config UPDATE (empty = a config raced off
   *  SALES_APPROVED). Same value for every config update in the loop. */
  configUpdateReturns: { id: number }[];
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
              table === offerRevisions
                ? state.revisionUpdateReturns
                : table === configurations
                  ? state.configUpdateReturns
                  : [],
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

const FROZEN = { as_sold_frozen_at: new Date("2026-01-01") };

// The ordinary case: rev 500 is the in-force first acceptance, its two line configs
// still cleanly handed off (SALES_APPROVED), no earlier accepted revision.
function baseState(overrides: Partial<TxState> = {}): TxState {
  return {
    offer: {
      id: 5,
      accepted_revision_id: 500,
      revisions: [{ id: 500, revision_no: 1, lines: [FROZEN, FROZEN] }],
    },
    lines: [
      { lineId: 21, configId: 7, configStatus: "SALES_APPROVED" },
      { lineId: 22, configId: 8, configStatus: "SALES_APPROVED" },
    ],
    revisionUpdateReturns: [{ id: 500 }],
    configUpdateReturns: [{ id: 1 }],
    ...overrides,
  };
}

// --- Tests ---

describe("unacceptOfferRevisionWithAudit", () => {
  beforeEach(() => vi.clearAllMocks());

  test("first acceptance: reverts to SENT, clears the pointer, unwinds freeze and hand-off", async () => {
    const { tx, updatesFor, insertsFor } = makeTx(baseState());

    await unacceptOfferRevisionWithAudit(5, 500, "actor", tx);

    // Revision ACCEPTED → SENT and the offer pointer cleared.
    expect(updatesFor(offerRevisions)[0]).toMatchObject({ status: "SENT" });
    expect(updatesFor(offers)[0]).toMatchObject({
      accepted_revision_id: null,
    });

    // The engineering hand-off is reverted: each line config back to DRAFT.
    expect(updatesFor(configurations)).toEqual([
      { status: "DRAFT" },
      { status: "DRAFT" },
    ]);

    // As-sold freeze cleared on both lines (snapshot + marker together).
    const lineUpdates = updatesFor(offerRevisionLines);
    expect(lineUpdates).toHaveLength(2);
    for (const update of lineUpdates) {
      expect(update.as_sold_snapshot).toBeNull();
      expect(update.as_sold_frozen_at).toBeNull();
    }

    // Audits: unfreeze + status change per line, then the un-acceptance itself.
    const logs = insertsFor(activityLogs);
    expect(
      logs.filter((l) => l.action === "CONFIG_AS_SOLD_UNFREEZE"),
    ).toHaveLength(2);
    expect(
      logs.filter((l) => l.action === "CONFIG_STATUS_CHANGE"),
    ).toHaveLength(2);
    expect(logs.at(-1)).toMatchObject({
      action: "OFFER_REVISION_UNACCEPT",
      metadata: expect.objectContaining({ revisionId: 500 }),
    });
  });

  test("blocks when engineering has started (a config past SALES_APPROVED)", async () => {
    const { tx, updatesFor } = makeTx(
      baseState({
        lines: [
          { lineId: 21, configId: 7, configStatus: "SALES_APPROVED" },
          { lineId: 22, configId: 8, configStatus: "IN_TECH_REVIEW" },
        ],
      }),
    );

    await expect(
      unacceptOfferRevisionWithAudit(5, 500, "actor", tx),
    ).rejects.toThrow(MSG.offer.unacceptEngineeringStarted);
    // Nothing was mutated.
    expect(updatesFor(offerRevisions)).toEqual([]);
  });

  test("blocks a renegotiation re-acceptance (an earlier revision is already frozen)", async () => {
    const { tx } = makeTx(
      baseState({
        // rev 900 (in force) is a renegotiation accepted after rev 500.
        offer: {
          id: 5,
          accepted_revision_id: 900,
          revisions: [
            { id: 900, revision_no: 2, lines: [FROZEN, FROZEN] },
            { id: 500, revision_no: 1, lines: [FROZEN, FROZEN] },
          ],
        },
      }),
    );

    await expect(
      unacceptOfferRevisionWithAudit(5, 900, "actor", tx),
    ).rejects.toThrow(MSG.offer.unacceptRenegotiation);
  });

  test("blocks when a later revision exists (a renegotiation opened after acceptance)", async () => {
    const { tx, updatesFor } = makeTx(
      baseState({
        // rev 500 is still the in-force first acceptance, but rev 900 (a DRAFT
        // renegotiation, unfrozen lines) was opened after it.
        offer: {
          id: 5,
          accepted_revision_id: 500,
          revisions: [
            {
              id: 900,
              revision_no: 2,
              lines: [{ as_sold_frozen_at: null }, { as_sold_frozen_at: null }],
            },
            { id: 500, revision_no: 1, lines: [FROZEN, FROZEN] },
          ],
        },
      }),
    );

    await expect(
      unacceptOfferRevisionWithAudit(5, 500, "actor", tx),
    ).rejects.toThrow(MSG.offer.cannotUnaccept);
    // Nothing was mutated — the first freeze stays intact.
    expect(updatesFor(offerRevisions)).toEqual([]);
  });

  test("blocks when a config raced off SALES_APPROVED after the read (guarded update matches no row)", async () => {
    // The bulk read still shows SALES_APPROVED, but the per-config status-guarded
    // update matches nothing (a concurrent engineer transition committed first).
    const { tx, updatesFor } = makeTx(baseState({ configUpdateReturns: [] }));

    await expect(
      unacceptOfferRevisionWithAudit(5, 500, "actor", tx),
    ).rejects.toThrow(MSG.offer.unacceptEngineeringStarted);
    // The revision flip happened first, but the whole tx rolls back on the throw —
    // the guard fires on the first config, before the second is touched.
    expect(updatesFor(configurations)).toHaveLength(1);
  });

  test("rejects when the target is not the in-force accepted revision", async () => {
    const { tx } = makeTx(baseState());

    await expect(
      unacceptOfferRevisionWithAudit(5, 999, "actor", tx),
    ).rejects.toThrow(MSG.offer.cannotUnaccept);
  });

  test("rejects when the guarded ACCEPTED → SENT update returns no row", async () => {
    const { tx } = makeTx(baseState({ revisionUpdateReturns: [] }));

    await expect(
      unacceptOfferRevisionWithAudit(5, 500, "actor", tx),
    ).rejects.toThrow(MSG.offer.cannotUnaccept);
  });
});
