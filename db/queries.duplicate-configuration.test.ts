// @vitest-environment node
import { beforeEach, describe, expect, test, vi } from "vitest";

// --- Mocks ---
// We exercise the REAL duplicateConfigurationRecord (and the internal clone
// primitive); a hand-built `tx` records inserts and hands back deterministic
// ids. Only the db connection module is faked — its `transaction` delegates to
// the per-test tx stub installed via `setTx`.
let currentTx: unknown;
const setTx = (tx: unknown) => {
  currentTx = tx;
};

vi.mock("@/db", () => ({
  db: {
    transaction: (cb: (tx: unknown) => Promise<unknown>) => cb(currentTx),
  },
}));

import { duplicateConfigurationRecord } from "@/db/queries";
import type { ConfigurationWithWaterTanksAndWashBays } from "@/db/schemas";
import { configurations, washBays, waterTanks } from "@/db/schemas";

// --- tx stub ---

const NEW_CONFIG_ID = 99;

function makeTx() {
  const inserts: { table: unknown; values: Record<string, unknown> }[] = [];

  const tx = {
    insert: (table: unknown) => ({
      values: (values: Record<string, unknown>) => {
        inserts.push({ table, values });
        // Both shapes are needed: `await tx.insert().values()` (returns a thenable)
        // and `tx.insert().values().returning()` (returns ids).
        const result = Promise.resolve(undefined) as Promise<undefined> & {
          returning: () => Promise<{ id: number }[]>;
        };
        result.returning = () =>
          table === configurations
            ? Promise.resolve([{ id: NEW_CONFIG_ID }])
            : Promise.resolve([]);
        return result;
      },
    }),
  };

  const valuesFor = (table: unknown) =>
    inserts.filter((i) => i.table === table).map((i) => i.values);

  return { tx, valuesFor };
}

// A handed-off OFFER source carrying one water tank and one wash bay, so we can
// assert the duplicate re-points the children and never inherits the source's
// origin/status/owner.
function sourceConfig() {
  const stamp = { created_at: new Date(), updated_at: new Date() };
  return {
    id: 7,
    user_id: "sales-owner",
    status: "SALES_APPROVED",
    origin: "OFFER",
    name: "Config A",
    brush_qty: 2,
    ...stamp,
    water_tanks: [
      {
        id: 11,
        configuration_id: 7,
        type: "L2000",
        ...stamp,
      },
    ],
    wash_bays: [
      {
        id: 21,
        configuration_id: 7,
        hp_lance_qty: 1,
        ...stamp,
      },
    ],
  } as unknown as ConfigurationWithWaterTanksAndWashBays;
}

// --- Tests ---

describe("duplicateConfigurationRecord", () => {
  beforeEach(() => vi.clearAllMocks());

  test("duplicates as a fresh STANDALONE DRAFT owned by the actor, even from an OFFER source (#243)", async () => {
    const { tx, valuesFor } = makeTx();
    setTx(tx);

    const result = await duplicateConfigurationRecord(
      sourceConfig(),
      "engineer-1",
    );

    expect(result).toEqual({ id: NEW_CONFIG_ID });

    const [configInsert] = valuesFor(configurations);
    expect(configInsert).toMatchObject({
      name: "Copia di Config A",
      status: "DRAFT",
      origin: "STANDALONE",
      user_id: "engineer-1",
      brush_qty: 2,
    });
    expect(configInsert).not.toHaveProperty("id");
  });

  test("re-points cloned water tanks and wash bays at the new config", async () => {
    const { tx, valuesFor } = makeTx();
    setTx(tx);

    await duplicateConfigurationRecord(sourceConfig(), "engineer-1");

    // Children are bulk-inserted as arrays.
    const [tankRows] = valuesFor(waterTanks) as unknown as Record<
      string,
      unknown
    >[][];
    expect(tankRows[0]).toMatchObject({
      configuration_id: NEW_CONFIG_ID,
      type: "L2000",
    });
    const [bayRows] = valuesFor(washBays) as unknown as Record<
      string,
      unknown
    >[][];
    expect(bayRows[0]).toMatchObject({
      configuration_id: NEW_CONFIG_ID,
      hp_lance_qty: 1,
    });
  });
});
