// @vitest-environment node
import { beforeEach, describe, expect, test, vi } from "vitest";

// --- Mocks ---
// We exercise the REAL createOfferRevisionFrom (and the internal clone primitive); a
// hand-built `tx` records inserts and hands back deterministic ids. Only the db
// connection module is faked so importing @/db/queries doesn't open a connection.
vi.mock("@/db", () => ({ db: {} }));

import {
  createOfferRevisionFrom,
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
const FIRST_CLONED_CONFIG_ID = 1001;

function makeTx(offer: unknown) {
  const inserts: { table: unknown; values: Record<string, unknown> }[] = [];
  const mutations: string[] = [];
  let nextConfigId = FIRST_CLONED_CONFIG_ID;

  const tx = {
    // The offer row lock (`select ... for update`) runs through tx.execute.
    execute: vi.fn().mockResolvedValue(undefined),
    query: { offers: { findFirst: vi.fn().mockResolvedValue(offer) } },
    insert: (table: unknown) => ({
      values: (values: Record<string, unknown>) => {
        inserts.push({ table, values });
        // Both shapes are needed: `await tx.insert().values()` (returns a thenable)
        // and `tx.insert().values().returning()` (returns ids).
        const result = Promise.resolve(undefined) as Promise<undefined> & {
          returning: () => Promise<{ id: number }[]>;
        };
        result.returning = () => {
          if (table === configurations)
            return Promise.resolve([{ id: nextConfigId++ }]);
          if (table === offerRevisions)
            return Promise.resolve([{ id: NEW_REVISION_ID }]);
          return Promise.resolve([]);
        };
        return result;
      },
    }),
    // Any update/delete would mean a source row was mutated — a clone must not.
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

// A source configuration carrying one water tank and one wash bay, so we can assert
// the child tables are deep-cloned too.
function sourceConfig() {
  const stamp = { created_at: new Date(), updated_at: new Date() };
  return {
    id: 7,
    user_id: "owner",
    status: "SALES_APPROVED",
    origin: "OFFER",
    name: "Config A",
    machine_type: "STD",
    brush_qty: 2,
    ...stamp,
    water_tanks: [
      {
        id: 11,
        configuration_id: 7,
        type: "L2000",
        has_blower: true,
        ...stamp,
      },
    ],
    wash_bays: [
      {
        id: 21,
        configuration_id: 7,
        hp_lance_qty: 1,
        has_gantry: true,
        ...stamp,
      },
    ],
  };
}

function frozenOffer() {
  return {
    id: 5,
    user_id: "owner",
    customer_name: "Cliente offerta",
    accepted_revision_id: null,
    revisions: [
      // Latest (working) revision — frozen, so a new one may be cloned.
      {
        id: 500,
        revision_no: 2,
        status: "SENT",
        discount_pct: "10.00",
        transport_amount: "250.00",
        transport_mode: "SEPARATE",
        installation_mode: "INCLUDED",
        installation_items: [
          { kind: "BASE_SYSTEM", amount: 0, included: true },
        ],
        extra_discount_amount: "800.00",
        show_net_total_only: true,
        valid_until: null,
        notes: "carry me forward",
        lines: [
          {
            position: 0,
            quantity: 3,
            line_discount_percent: null,
            configuration: sourceConfig(),
          },
        ],
      },
    ],
  };
}

// --- Tests ---

describe("createOfferRevisionFrom", () => {
  beforeEach(() => vi.clearAllMocks());

  test("clones forward: new DRAFT revision, deep-cloned config + children, copied header", async () => {
    const { tx, valuesFor, mutations } = makeTx(frozenOffer());

    const result = await createOfferRevisionFrom(5, 2, "actor", tx);

    expect(result).toEqual({
      revisionId: NEW_REVISION_ID,
      revisionNo: 3,
      configIds: [FIRST_CLONED_CONFIG_ID],
    });

    // New revision: next number, DRAFT, commercial header carried forward.
    const [revisionInsert] = valuesFor(offerRevisions);
    expect(revisionInsert).toMatchObject({
      offer_id: 5,
      revision_no: 3,
      status: "DRAFT",
      discount_pct: "10.00",
      transport_amount: "250.00",
      transport_mode: "SEPARATE",
      installation_mode: "INCLUDED",
      extra_discount_amount: "800.00",
      show_net_total_only: true,
      notes: "carry me forward",
    });

    // Config is cloned into a fresh DRAFT, OFFER-owned row (owned by the offer owner).
    const [configInsert] = valuesFor(configurations);
    expect(configInsert).toMatchObject({
      name: "Cliente offerta",
      status: "DRAFT",
      origin: "OFFER",
      user_id: "owner",
      brush_qty: 2,
    });
    expect(configInsert).not.toHaveProperty("id");

    // Children re-pointed at the cloned config (inserted as arrays via bulk insert).
    const [tankRows] = valuesFor(waterTanks) as unknown as Record<
      string,
      unknown
    >[][];
    expect(tankRows[0]).toMatchObject({
      configuration_id: FIRST_CLONED_CONFIG_ID,
      type: "L2000",
    });
    const [bayRows] = valuesFor(washBays) as unknown as Record<
      string,
      unknown
    >[][];
    expect(bayRows[0]).toMatchObject({
      configuration_id: FIRST_CLONED_CONFIG_ID,
      hp_lance_qty: 1,
    });

    // Line points at the new revision + cloned config, preserving position/quantity.
    // Lines are bulk-inserted as an array, like the child tables.
    const [lineRows] = valuesFor(offerRevisionLines) as unknown as Record<
      string,
      unknown
    >[][];
    expect(lineRows[0]).toMatchObject({
      offer_revision_id: NEW_REVISION_ID,
      configuration_id: FIRST_CLONED_CONFIG_ID,
      position: 0,
      quantity: 3,
      pricing_snapshot: null,
    });

    // Audited, and the source revision's rows are never mutated.
    expect(valuesFor(activityLogs)[0]).toMatchObject({
      action: "OFFER_REVISION_CREATE",
    });
    expect(mutations).toEqual([]);
  });

  test("resets valid_until on the clone (validity is a per-send stamp, not carried forward)", async () => {
    const offer = frozenOffer();
    // Source revision had an (expired) validity date set.
    offer.revisions[0].valid_until = new Date(
      "2020-01-01T00:00:00.000Z",
    ) as unknown as null;
    const { tx, valuesFor } = makeTx(offer);

    await createOfferRevisionFrom(5, 2, "actor", tx);

    const [revisionInsert] = valuesFor(offerRevisions);
    expect(revisionInsert.valid_until).toBeNull();
  });

  test("defaults the source to the latest revision when no source number is given", async () => {
    const { tx, valuesFor } = makeTx(frozenOffer());

    const result = await createOfferRevisionFrom(5, undefined, "actor", tx);

    expect(result.revisionNo).toBe(3);
    // Audit records the resolved source (latest = revision_no 2).
    expect(valuesFor(activityLogs)[0]).toMatchObject({
      metadata: expect.objectContaining({ fromRevisionNo: 2, revisionNo: 3 }),
    });
  });

  test("takes a row lock on the offer before reading it", async () => {
    const { tx } = makeTx(frozenOffer());

    await createOfferRevisionFrom(5, 2, "actor", tx);

    expect(
      (tx as unknown as { execute: ReturnType<typeof vi.fn> }).execute,
    ).toHaveBeenCalledOnce();
  });

  test("rejects clone-forward on an accepted offer (renegotiation is the only post-acceptance path)", async () => {
    const offer = frozenOffer();
    offer.accepted_revision_id = 500 as unknown as null;
    offer.revisions[0].status = "ACCEPTED";
    const { tx } = makeTx(offer);

    await expect(createOfferRevisionFrom(5, 2, "actor", tx)).rejects.toThrow(
      MSG.offer.alreadyAccepted,
    );
  });

  test("rejects when the latest revision is still a DRAFT working copy", async () => {
    const offer = frozenOffer();
    offer.revisions[0].status = "DRAFT";
    const { tx } = makeTx(offer);

    await expect(createOfferRevisionFrom(5, 2, "actor", tx)).rejects.toThrow(
      MSG.offer.workingRevisionExists,
    );
  });

  test("throws notFound for an unknown source revision number", async () => {
    const { tx } = makeTx(frozenOffer());
    await expect(createOfferRevisionFrom(5, 99, "actor", tx)).rejects.toThrow(
      MSG.offer.notFound,
    );
  });

  test("throws notFound when the offer is missing", async () => {
    const { tx } = makeTx(null);
    await expect(createOfferRevisionFrom(5, 2, "actor", tx)).rejects.toThrow(
      QueryError,
    );
  });
});
