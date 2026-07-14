// @vitest-environment node
import { beforeEach, describe, expect, test, vi } from "vitest";

// --- Mocks ---
// We exercise the REAL discardDraftRevisionWithAudit (and the deleteConfiguration
// primitive it reuses); a hand-built `tx` records which tables were deleted, in order.
// Only the db connection module is faked so importing @/db/queries doesn't open one.
vi.mock("@/db", () => ({ db: {} }));

import {
  createOfferRevisionFrom,
  discardDraftRevisionWithAudit,
  QueryError,
  type TransactionType,
} from "@/db/queries";
import {
  activityLogs,
  configurations,
  offerRevisionLines,
  offerRevisions,
} from "@/db/schemas";
import { MSG } from "@/lib/messages";

// --- Fixtures ---

const OFFER_ID = 5;
const DRAFT_REVISION_ID = 502;
const NEW_REVISION_ID = 900;
// The two configs the DRAFT revision cloned for itself.
const OWNED_CONFIG_IDS = [71, 72];
// The live engineering config an accepted revision's frozen line points at.
const LIVE_CONFIG_ID = 61;

/** Offer whose working revision (rev 3) is an ordinary clone-forward DRAFT. */
function offerWithDraft() {
  return {
    id: OFFER_ID,
    revisions: [
      {
        id: DRAFT_REVISION_ID,
        revision_no: 3,
        status: "DRAFT",
        lines: OWNED_CONFIG_IDS.map((configId, i) => ({
          id: 90 + i,
          configuration_id: configId,
          as_sold_frozen_at: null,
        })),
      },
      {
        id: 501,
        revision_no: 2,
        status: "SENT",
        lines: [{ id: 80, configuration_id: 61, as_sold_frozen_at: null }],
      },
      { id: 500, revision_no: 1, status: "SENT", lines: [] },
    ],
  };
}

/**
 * Offer accepted at rev 2, with rev 3 an open renegotiation DRAFT. Its line references
 * the SAME live config as the accepted revision's frozen line — no deep-clone.
 */
function offerWithRenegotiationDraft() {
  return {
    id: OFFER_ID,
    revisions: [
      {
        id: DRAFT_REVISION_ID,
        revision_no: 3,
        status: "DRAFT",
        lines: [
          { id: 90, configuration_id: LIVE_CONFIG_ID, as_sold_frozen_at: null },
        ],
      },
      {
        id: 501,
        revision_no: 2,
        status: "ACCEPTED",
        lines: [
          {
            id: 80,
            configuration_id: LIVE_CONFIG_ID,
            as_sold_frozen_at: new Date("2026-01-01T00:00:00.000Z"),
          },
        ],
      },
      { id: 500, revision_no: 1, status: "SENT", lines: [] },
    ],
  };
}

// --- tx stub ---

function makeTx(
  offer: unknown,
  // `revisionDeleted: false` simulates the compare-and-swap losing the race: the row is
  // no longer DRAFT, so the guarded delete matches nothing.
  opts: { revisionDeleted?: boolean } = {},
) {
  const deletes: unknown[] = [];
  const inserts: { table: unknown; values: Record<string, unknown> }[] = [];

  const tx = {
    // The offer row lock (`select ... for update`) runs through tx.execute.
    execute: vi.fn().mockResolvedValue(undefined),
    query: { offers: { findFirst: vi.fn().mockResolvedValue(offer) } },
    insert: (table: unknown) => ({
      values: (values: Record<string, unknown>) => {
        inserts.push({ table, values });
        const result = Promise.resolve(undefined) as Promise<undefined> & {
          returning: () => Promise<{ id: number }[]>;
        };
        result.returning = () =>
          table === offerRevisions
            ? Promise.resolve([{ id: NEW_REVISION_ID }])
            : Promise.resolve([]);
        return result;
      },
    }),
    delete: (table: unknown) => ({
      where: () => {
        deletes.push(table);
        const rows =
          table === offerRevisions && opts.revisionDeleted === false
            ? []
            : [{ id: 1 }];
        const result = Promise.resolve(undefined) as Promise<undefined> & {
          returning: () => Promise<{ id: number }[]>;
        };
        result.returning = () => Promise.resolve(rows);
        return result;
      },
    }),
    update: () => ({
      set: () => ({ where: () => ({ returning: () => Promise.resolve([]) }) }),
    }),
  };

  const valuesFor = (table: unknown) =>
    inserts.filter((i) => i.table === table).map((i) => i.values);

  return { tx: tx as unknown as TransactionType, deletes, valuesFor };
}

/** The offer row lock must be the first statement: before the status read. */
function expectLockedBeforeStatusRead(tx: TransactionType) {
  const stub = tx as unknown as {
    execute: ReturnType<typeof vi.fn>;
    query: { offers: { findFirst: ReturnType<typeof vi.fn> } };
  };
  expect(stub.execute).toHaveBeenCalledOnce();
  expect(stub.execute.mock.invocationCallOrder[0]).toBeLessThan(
    stub.query.offers.findFirst.mock.invocationCallOrder[0],
  );
}

// --- Tests ---

describe("discardDraftRevisionWithAudit", () => {
  beforeEach(() => vi.clearAllMocks());

  test("deletes the DRAFT revision and the configurations it owns", async () => {
    const { tx, deletes } = makeTx(offerWithDraft());

    const result = await discardDraftRevisionWithAudit(
      OFFER_ID,
      DRAFT_REVISION_ID,
      "actor",
      false,
      tx,
    );

    expect(result).toEqual({
      revisionNo: 3,
      deletedConfigIds: OWNED_CONFIG_IDS,
    });
    // The revision goes first (its lines cascade with it), then one delete per owned
    // config. configuration_id is onDelete restrict, so any other order would fail.
    expect(deletes).toEqual([offerRevisions, configurations, configurations]);
    // The lines are never deleted by hand — the cascade does it.
    expect(deletes).not.toContain(offerRevisionLines);
  });

  test("audits the discard in the same transaction", async () => {
    const { tx, valuesFor } = makeTx(offerWithDraft());

    await discardDraftRevisionWithAudit(
      OFFER_ID,
      DRAFT_REVISION_ID,
      "actor",
      false,
      tx,
    );

    expect(valuesFor(activityLogs)[0]).toMatchObject({
      user_id: "actor",
      action: "OFFER_REVISION_DISCARD",
      target_entity: "offer",
      target_id: String(OFFER_ID),
      metadata: {
        revisionId: DRAFT_REVISION_ID,
        revisionNo: 3,
        renegotiation: false,
        lineCount: 2,
        deletedConfigIds: OWNED_CONFIG_IDS,
      },
    });
  });

  test("takes the offer row lock before reading the revision", async () => {
    const { tx } = makeTx(offerWithDraft());

    await discardDraftRevisionWithAudit(
      OFFER_ID,
      DRAFT_REVISION_ID,
      "actor",
      false,
      tx,
    );

    expectLockedBeforeStatusRead(tx);
  });

  test("a renegotiation draft drops its lines but never its configurations", async () => {
    const { tx, deletes } = makeTx(offerWithRenegotiationDraft());

    const result = await discardDraftRevisionWithAudit(
      OFFER_ID,
      DRAFT_REVISION_ID,
      "actor",
      true,
      tx,
    );

    // The line's config is a LIVE engineering config, shared with the accepted revision's
    // frozen line. Deleting it would destroy engineering's work and gut the as-sold record.
    expect(result.deletedConfigIds).toEqual([]);
    expect(deletes).toEqual([offerRevisions]);
    expect(deletes).not.toContain(configurations);
  });

  test("audits a renegotiation discard as such", async () => {
    const { tx, valuesFor } = makeTx(offerWithRenegotiationDraft());

    await discardDraftRevisionWithAudit(
      OFFER_ID,
      DRAFT_REVISION_ID,
      "actor",
      true,
      tx,
    );

    expect(valuesFor(activityLogs)[0]).toMatchObject({
      action: "OFFER_REVISION_DISCARD",
      metadata: expect.objectContaining({
        renegotiation: true,
        deletedConfigIds: [],
      }),
    });
  });

  test("refuses when the caller's renegotiation derivation disagrees with the locked row", async () => {
    // The action authorized a plain clone-forward discard, but under the lock the revision
    // derives as a renegotiation — deleting the live configs is exactly what must not happen.
    const { tx, deletes } = makeTx(offerWithRenegotiationDraft());

    await expect(
      discardDraftRevisionWithAudit(
        OFFER_ID,
        DRAFT_REVISION_ID,
        "actor",
        false,
        tx,
      ),
    ).rejects.toThrow(MSG.offer.cannotDiscard);
    expect(deletes).toEqual([]);
  });

  test("refuses to discard anything but the latest revision", async () => {
    const { tx, deletes } = makeTx(offerWithDraft());

    // 501 is rev 2 — history, not the working copy.
    await expect(
      discardDraftRevisionWithAudit(OFFER_ID, 501, "actor", false, tx),
    ).rejects.toThrow(MSG.offer.notFound);
    expect(deletes).toEqual([]);
  });

  test("refuses a revision that has left DRAFT", async () => {
    const offer = offerWithDraft();
    offer.revisions[0].status = "PENDING_APPROVAL";
    const { tx, deletes } = makeTx(offer);

    // The way back from PENDING_APPROVAL is a manager hand-back to DRAFT, not a discard.
    await expect(
      discardDraftRevisionWithAudit(
        OFFER_ID,
        DRAFT_REVISION_ID,
        "actor",
        false,
        tx,
      ),
    ).rejects.toThrow(MSG.offer.cannotDiscard);
    expect(deletes).toEqual([]);
  });

  test("refuses to discard the only revision (an offer is never left headless)", async () => {
    const offer = offerWithDraft();
    offer.revisions = [offer.revisions[0]];
    const { tx, deletes } = makeTx(offer);

    await expect(
      discardDraftRevisionWithAudit(
        OFFER_ID,
        DRAFT_REVISION_ID,
        "actor",
        false,
        tx,
      ),
    ).rejects.toThrow(MSG.offer.cannotDiscardFirstRevision);
    expect(deletes).toEqual([]);
  });

  test("surfaces the compare-and-swap conflict when the status moves under the lock", async () => {
    const { tx } = makeTx(offerWithDraft(), { revisionDeleted: false });

    await expect(
      discardDraftRevisionWithAudit(
        OFFER_ID,
        DRAFT_REVISION_ID,
        "actor",
        false,
        tx,
      ),
    ).rejects.toThrow(MSG.offer.cannotDiscard);
  });

  test("throws notFound when the offer is missing", async () => {
    const { tx } = makeTx(null);

    await expect(
      discardDraftRevisionWithAudit(
        OFFER_ID,
        DRAFT_REVISION_ID,
        "actor",
        false,
        tx,
      ),
    ).rejects.toThrow(QueryError);
  });

  test("frees the revision number: the next clone-forward reuses it (no gap)", async () => {
    // Discarding rev 3 leaves [2, 1]. createOfferRevisionFrom computes latest + 1, and
    // unique(offer_id, revision_no) released the number on delete — so the customer-facing
    // numbering has no hole.
    const surviving = {
      id: OFFER_ID,
      user_id: "owner",
      customer_name: "Cliente offerta",
      accepted_revision_id: null,
      revisions: [
        {
          id: 501,
          revision_no: 2,
          status: "SENT",
          discount_pct: "10.00",
          transport_amount: "0.00",
          transport_mode: "INCLUDED",
          installation_mode: "EXCLUDED",
          installation_items: [],
          show_net_total_only: false,
          valid_until: null,
          notes: null,
          lines: [],
        },
        { id: 500, revision_no: 1, status: "SENT", lines: [] },
      ],
    };
    const { tx, valuesFor } = makeTx(surviving);

    const result = await createOfferRevisionFrom(
      OFFER_ID,
      undefined,
      "actor",
      tx,
    );

    expect(result.revisionNo).toBe(3);
    expect(valuesFor(offerRevisions)[0]).toMatchObject({
      revision_no: 3,
      status: "DRAFT",
    });
  });
});
