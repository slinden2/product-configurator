// @vitest-environment node
import { beforeEach, describe, expect, test, vi } from "vitest";

// --- Mocks ---
// We exercise the REAL createRenegotiationRevisionFrom; a hand-built `tx` records
// inserts and hands back deterministic ids. Only the db connection module is faked
// so importing @/db/queries doesn't open a connection.
vi.mock("@/db", () => ({ db: {} }));

import {
  createRenegotiationRevisionFrom,
  QueryError,
  type TransactionType,
} from "@/db/queries";
import {
  activityLogs,
  configurations,
  offerRevisionLines,
  offerRevisions,
  washBays,
  waterTanks,
} from "@/db/schemas";
import { MSG } from "@/lib/messages";

// --- tx stub ---

const NEW_REVISION_ID = 900;

function makeTx(offer: unknown) {
  const inserts: { table: unknown; values: Record<string, unknown> }[] = [];
  const mutations: string[] = [];

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
        result.returning = () => {
          if (table === offerRevisions)
            return Promise.resolve([{ id: NEW_REVISION_ID }]);
          return Promise.resolve([]);
        };
        return result;
      },
    }),
    // Any update/delete would mean an existing row was mutated — creation must not.
    update: () => {
      mutations.push("update");
      return {
        set: () => ({
          where: () => ({ returning: () => Promise.resolve([]) }),
        }),
      };
    },
    delete: () => {
      mutations.push("delete");
      return { where: () => Promise.resolve(undefined) };
    },
  };

  const valuesFor = (table: unknown) =>
    inserts.filter((i) => i.table === table).map((i) => i.values);

  return {
    tx: tx as unknown as TransactionType,
    inserts,
    mutations,
    valuesFor,
  };
}

/**
 * An accepted offer: rev 2 is the in-force accepted revision (frozen lines
 * referencing configs 7 and 8); rev 3 is a later renegotiation that the customer
 * rejected, proving the source is resolved via accepted_revision_id, not "latest".
 */
function acceptedOffer() {
  return {
    id: 5,
    accepted_revision_id: 200,
    revisions: [
      {
        id: 300,
        revision_no: 3,
        status: "REJECTED",
        discount_pct: "15.00",
        transport_amount: "300.00",
        transport_mode: "SEPARATE",
        installation_mode: "TBD",
        installation_items: [],
        show_net_total_only: false,
        valid_until: null,
        notes: "rejected renegotiation",
        lines: [
          {
            id: 31,
            configuration_id: 7,
            position: 0,
            quantity: 1,
            line_discount_percent: null,
          },
        ],
      },
      {
        id: 200,
        revision_no: 2,
        status: "ACCEPTED",
        discount_pct: "10.00",
        transport_amount: "250.00",
        transport_mode: "SEPARATE",
        installation_mode: "INCLUDED",
        installation_items: [
          { kind: "BASE_SYSTEM", amount: 0, included: true },
        ],
        show_net_total_only: true,
        valid_until: new Date("2026-01-01T00:00:00.000Z"),
        notes: "accepted terms",
        lines: [
          {
            id: 21,
            configuration_id: 7,
            position: 0,
            quantity: 3,
            line_discount_percent: null,
          },
          {
            id: 22,
            configuration_id: 8,
            position: 1,
            quantity: 1,
            line_discount_percent: "5.00",
          },
        ],
      },
      {
        id: 100,
        revision_no: 1,
        status: "REJECTED",
        discount_pct: "0.00",
        transport_amount: "0.00",
        transport_mode: "TBD",
        installation_mode: "TBD",
        installation_items: [],
        show_net_total_only: false,
        valid_until: null,
        notes: null,
        lines: [],
      },
    ],
  };
}

// --- Tests ---

describe("createRenegotiationRevisionFrom", () => {
  beforeEach(() => vi.clearAllMocks());

  test("creates a DRAFT revision referencing the accepted lines' configs — no clone", async () => {
    const { tx, valuesFor, mutations } = makeTx(acceptedOffer());

    const result = await createRenegotiationRevisionFrom(5, "actor", tx);

    expect(result).toEqual({
      revisionId: NEW_REVISION_ID,
      revisionNo: 4,
      configIds: [7, 8],
    });

    // Commercial header copied from the ACCEPTED revision (not the latest,
    // rejected one); validity re-established per send.
    const [revisionInsert] = valuesFor(offerRevisions);
    expect(revisionInsert).toMatchObject({
      offer_id: 5,
      revision_no: 4,
      status: "DRAFT",
      discount_pct: "10.00",
      transport_amount: "250.00",
      transport_mode: "SEPARATE",
      installation_mode: "INCLUDED",
      show_net_total_only: true,
      valid_until: null,
      notes: "accepted terms",
    });

    // The no-clone invariant: no configuration / water tank / wash bay inserts.
    expect(valuesFor(configurations)).toEqual([]);
    expect(valuesFor(waterTanks)).toEqual([]);
    expect(valuesFor(washBays)).toEqual([]);

    // Lines reference the SAME configuration ids, preserving position/quantity/
    // per-line discount, with placeholder pricing and clean snapshot columns.
    const [lineRows] = valuesFor(offerRevisionLines) as unknown as Record<
      string,
      unknown
    >[][];
    expect(lineRows).toHaveLength(2);
    expect(lineRows[0]).toMatchObject({
      offer_revision_id: NEW_REVISION_ID,
      configuration_id: 7,
      position: 0,
      quantity: 3,
      line_discount_percent: null,
      list_price: "0.00",
      net_price: "0.00",
      pricing_snapshot: null,
    });
    expect(lineRows[1]).toMatchObject({
      configuration_id: 8,
      position: 1,
      quantity: 1,
      line_discount_percent: "5.00",
    });

    // Audited as a renegotiation creation, sourced from the accepted revision.
    expect(valuesFor(activityLogs)[0]).toMatchObject({
      action: "OFFER_REVISION_CREATE",
      metadata: expect.objectContaining({
        revisionNo: 4,
        fromRevisionNo: 2,
        lineCount: 2,
        renegotiation: true,
      }),
    });

    // No existing row is ever mutated.
    expect(mutations).toEqual([]);
  });

  test("takes a row lock on the offer before reading it", async () => {
    const { tx } = makeTx(acceptedOffer());

    await createRenegotiationRevisionFrom(5, "actor", tx);

    expect(
      (tx as unknown as { execute: ReturnType<typeof vi.fn> }).execute,
    ).toHaveBeenCalledOnce();
  });

  test("rejects when the offer has not been accepted", async () => {
    const offer = acceptedOffer();
    offer.accepted_revision_id = null as unknown as number;
    const { tx } = makeTx(offer);

    await expect(
      createRenegotiationRevisionFrom(5, "actor", tx),
    ).rejects.toThrow(MSG.offer.renegotiationNotAccepted);
  });

  test("rejects when an open working revision already exists (one renegotiation at a time)", async () => {
    const offer = acceptedOffer();
    offer.revisions[0].status = "DRAFT";
    const { tx } = makeTx(offer);

    await expect(
      createRenegotiationRevisionFrom(5, "actor", tx),
    ).rejects.toThrow(MSG.offer.workingRevisionExists);
  });

  test("throws notFound when the offer is missing", async () => {
    const { tx } = makeTx(null);

    await expect(
      createRenegotiationRevisionFrom(5, "actor", tx),
    ).rejects.toThrow(QueryError);
  });
});
