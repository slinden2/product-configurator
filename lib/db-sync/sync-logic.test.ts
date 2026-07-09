// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { BomStructureRow, DBData } from "@/lib/db-sync/tse";

const mocks = vi.hoisted(() => {
  const onConflictDoUpdate = vi.fn();
  const insertValues = vi.fn((_rows: unknown[]) => ({ onConflictDoUpdate }));
  const insert = vi.fn(() => ({ values: insertValues }));
  const selectWhere = vi.fn();
  const selectFrom = vi.fn(() => ({ where: selectWhere }));
  const select = vi.fn(() => ({ from: selectFrom }));
  const updateWhere = vi.fn();
  const updateSet = vi.fn(() => ({ where: updateWhere }));
  const update = vi.fn(() => ({ set: updateSet }));
  const txDeleteWhere = vi.fn();
  const txDelete = vi.fn(() => ({ where: txDeleteWhere }));
  const txInsertValues = vi.fn();
  const txInsert = vi.fn(() => ({ values: txInsertValues }));
  const txSelectDistinctFrom = vi.fn();
  const txSelectDistinct = vi.fn(() => ({ from: txSelectDistinctFrom }));
  const tx = {
    delete: txDelete,
    insert: txInsert,
    selectDistinct: txSelectDistinct,
  };
  const transaction = vi.fn();
  const fetchPartNumbersFromTSE = vi.fn();
  const fetchBomStructureFromTSE = vi.fn();
  return {
    onConflictDoUpdate,
    insertValues,
    insert,
    selectWhere,
    selectFrom,
    select,
    updateWhere,
    updateSet,
    update,
    txDeleteWhere,
    txDelete,
    txInsertValues,
    txInsert,
    txSelectDistinctFrom,
    txSelectDistinct,
    tx,
    transaction,
    fetchPartNumbersFromTSE,
    fetchBomStructureFromTSE,
  };
});

vi.mock("@/db", () => ({
  db: {
    insert: mocks.insert,
    select: mocks.select,
    update: mocks.update,
    transaction: mocks.transaction,
  },
}));

vi.mock("@/lib/db-sync/tse", () => ({
  fetchPartNumbersFromTSE: mocks.fetchPartNumbersFromTSE,
  fetchBomStructureFromTSE: mocks.fetchBomStructureFromTSE,
}));

import {
  batchUpsertBomStructure,
  batchUpsertPartNumbers,
  isBomLineInsertArray,
  isPartNumberArray,
  mapPnType,
} from "@/lib/db-sync/sync-logic";

function makeRawPn(overrides: Partial<DBData> = {}): DBData {
  return {
    pn: "PN-1",
    description: "Bracket",
    pn_type: 2,
    is_phantom: 0,
    cost: 12.5,
    is_subcontract: 0,
    family: "FAM",
    sub_family: "SUB",
    ...overrides,
  };
}

function makeRawBomRow(
  overrides: Partial<BomStructureRow> = {},
): BomStructureRow {
  return {
    parent_pn: "ASSY-1",
    child_pn: "PN-1",
    qty: 1,
    sort_order: 10,
    ...overrides,
  };
}

const validCleanPn = {
  pn: "PN-1",
  description: "Bracket",
  cost: "12.50",
  pn_type: "PART",
  is_phantom: false,
  is_subcontract: false,
  family: null,
  sub_family: null,
};

const validCleanBomLine = {
  parent_pn: "ASSY-1",
  child_pn: "PN-1",
  qty: "1",
  sort_order: 10,
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "time").mockImplementation(() => {});
  vi.spyOn(console, "timeEnd").mockImplementation(() => {});
  mocks.onConflictDoUpdate.mockResolvedValue(undefined);
  mocks.selectWhere.mockResolvedValue([]);
  mocks.updateWhere.mockResolvedValue(undefined);
  mocks.txDeleteWhere.mockResolvedValue(undefined);
  mocks.txInsertValues.mockResolvedValue(undefined);
  mocks.txSelectDistinctFrom.mockResolvedValue([]);
  mocks.transaction.mockImplementation(
    async (cb: (t: typeof mocks.tx) => Promise<void>) => cb(mocks.tx),
  );
  mocks.fetchPartNumbersFromTSE.mockResolvedValue([]);
  mocks.fetchBomStructureFromTSE.mockResolvedValue([]);
});

describe("mapPnType", () => {
  it("maps 1 to ASSY", () => {
    expect(mapPnType(1)).toBe("ASSY");
  });

  it("maps 2 to PART", () => {
    expect(mapPnType(2)).toBe("PART");
  });

  it("throws on any other value", () => {
    expect(() => mapPnType(0)).toThrow(/Invalid pn_type value: 0/);
    expect(() => mapPnType(3)).toThrow(/Invalid pn_type value: 3/);
  });
});

describe("isPartNumberArray", () => {
  it("accepts a fully valid cleaned row and an empty array", () => {
    expect(isPartNumberArray([validCleanPn])).toBe(true);
    expect(isPartNumberArray([])).toBe(true);
  });

  it("rejects a non-string cost", () => {
    expect(isPartNumberArray([{ ...validCleanPn, cost: 12.5 }])).toBe(false);
  });

  it("rejects a numeric is_phantom", () => {
    expect(isPartNumberArray([{ ...validCleanPn, is_phantom: 1 }])).toBe(false);
  });

  it("rejects an unknown pn_type", () => {
    expect(isPartNumberArray([{ ...validCleanPn, pn_type: "KIT" }])).toBe(
      false,
    );
  });

  it("rejects an undefined family", () => {
    expect(isPartNumberArray([{ ...validCleanPn, family: undefined }])).toBe(
      false,
    );
  });
});

describe("isBomLineInsertArray", () => {
  it("accepts a fully valid cleaned row and an empty array", () => {
    expect(isBomLineInsertArray([validCleanBomLine])).toBe(true);
    expect(isBomLineInsertArray([])).toBe(true);
  });

  it("rejects a numeric qty", () => {
    expect(isBomLineInsertArray([{ ...validCleanBomLine, qty: 1 }])).toBe(
      false,
    );
  });

  it("rejects a string sort_order", () => {
    expect(
      isBomLineInsertArray([{ ...validCleanBomLine, sort_order: "10" }]),
    ).toBe(false);
  });

  it("rejects a missing child_pn", () => {
    expect(
      isBomLineInsertArray([{ ...validCleanBomLine, child_pn: undefined }]),
    ).toBe(false);
  });
});

describe("batchUpsertPartNumbers", () => {
  it("cleans raw ERP rows before upserting", async () => {
    mocks.fetchPartNumbersFromTSE.mockResolvedValue([
      makeRawPn({
        pn: " A1 ",
        description: " Nozzle ",
        cost: null,
        pn_type: 1,
        is_phantom: 1,
        is_subcontract: 0,
        family: "",
        sub_family: " X ",
      }),
    ]);

    await batchUpsertPartNumbers();

    expect(mocks.insertValues).toHaveBeenCalledTimes(1);
    expect(mocks.insertValues).toHaveBeenCalledWith([
      {
        pn: "A1",
        description: "Nozzle",
        cost: "0",
        pn_type: "ASSY",
        is_phantom: true,
        is_subcontract: false,
        family: null,
        sub_family: "X",
      },
    ]);
  });

  it("re-activates conflicting rows via is_active: true in the upsert set", async () => {
    mocks.fetchPartNumbersFromTSE.mockResolvedValue([makeRawPn()]);

    await batchUpsertPartNumbers();

    expect(mocks.onConflictDoUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        set: expect.objectContaining({ is_active: true }),
      }),
    );
  });

  it("skips the sync entirely when the fetch returns no rows", async () => {
    mocks.fetchPartNumbersFromTSE.mockResolvedValue([]);

    await batchUpsertPartNumbers();

    expect(console.warn).toHaveBeenCalledWith(
      "No records fetched from TSE — sync skipped.",
    );
    expect(mocks.insert).not.toHaveBeenCalled();
    expect(mocks.select).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("rejects when a raw row carries an invalid pn_type", async () => {
    mocks.fetchPartNumbersFromTSE.mockResolvedValue([
      makeRawPn({ pn_type: 7 as unknown as DBData["pn_type"] }),
    ]);

    await expect(batchUpsertPartNumbers()).rejects.toThrow(
      /Invalid pn_type value: 7/,
    );
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it("chunks the upsert into batches of 1000", async () => {
    mocks.fetchPartNumbersFromTSE.mockResolvedValue(
      Array.from({ length: 1500 }, (_, i) => makeRawPn({ pn: `PN-${i}` })),
    );

    await batchUpsertPartNumbers();

    expect(mocks.insert).toHaveBeenCalledTimes(2);
    expect(mocks.insertValues.mock.calls[0][0]).toHaveLength(1000);
    expect(mocks.insertValues.mock.calls[1][0]).toHaveLength(500);
  });

  it("deactivates active local pns absent from the ERP extract", async () => {
    mocks.fetchPartNumbersFromTSE.mockResolvedValue([
      makeRawPn({ pn: "PN-KEPT" }),
    ]);
    mocks.selectWhere.mockResolvedValue([
      { pn: "PN-KEPT" },
      { pn: "PN-OLD-1" },
      { pn: "PN-OLD-2" },
    ]);

    await batchUpsertPartNumbers();

    expect(mocks.update).toHaveBeenCalledTimes(1);
    expect(mocks.updateSet).toHaveBeenCalledWith({ is_active: false });
    expect(console.log).toHaveBeenCalledWith(
      "Deactivated 2 part number(s) no longer present in the ERP extract.",
    );
  });

  it("chunks the deactivation update into batches of 1000", async () => {
    mocks.fetchPartNumbersFromTSE.mockResolvedValue([
      makeRawPn({ pn: "PN-KEPT" }),
    ]);
    mocks.selectWhere.mockResolvedValue(
      Array.from({ length: 2500 }, (_, i) => ({ pn: `PN-OLD-${i}` })),
    );

    await batchUpsertPartNumbers();

    expect(mocks.update).toHaveBeenCalledTimes(3);
  });

  it("issues no update when every active local pn is still in the extract", async () => {
    mocks.fetchPartNumbersFromTSE.mockResolvedValue([
      makeRawPn({ pn: "PN-KEPT" }),
    ]);
    mocks.selectWhere.mockResolvedValue([{ pn: "PN-KEPT" }]);

    await batchUpsertPartNumbers();

    expect(mocks.update).not.toHaveBeenCalled();
    expect(console.log).toHaveBeenCalledWith(
      "Deactivated 0 part number(s) no longer present in the ERP extract.",
    );
  });
});

describe("batchUpsertBomStructure", () => {
  it("cleans raw ERP rows before inserting", async () => {
    mocks.fetchBomStructureFromTSE.mockResolvedValue([
      makeRawBomRow({
        parent_pn: " ASSY-1 ",
        child_pn: " PN-1 ",
        qty: 2.5,
        sort_order: 30,
      }),
    ]);

    await batchUpsertBomStructure();

    expect(mocks.txInsertValues).toHaveBeenCalledTimes(1);
    expect(mocks.txInsertValues).toHaveBeenCalledWith([
      { parent_pn: "ASSY-1", child_pn: "PN-1", qty: "2.5", sort_order: 30 },
    ]);
  });

  it("skips the sync entirely when the fetch returns no rows", async () => {
    mocks.fetchBomStructureFromTSE.mockResolvedValue([]);

    await batchUpsertBomStructure();

    expect(console.warn).toHaveBeenCalledWith(
      "No BOM structure rows fetched from TSE — structure sync skipped.",
    );
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("runs the replace inside a single transaction", async () => {
    mocks.fetchBomStructureFromTSE.mockResolvedValue([makeRawBomRow()]);

    await batchUpsertBomStructure();

    expect(mocks.transaction).toHaveBeenCalledTimes(1);
    expect(mocks.txDelete).toHaveBeenCalledTimes(1);
    expect(mocks.txInsert).toHaveBeenCalledTimes(1);
  });

  it("chunks the incoming-parent delete into batches of 1000", async () => {
    mocks.fetchBomStructureFromTSE.mockResolvedValue(
      Array.from({ length: 1500 }, (_, i) =>
        makeRawBomRow({ parent_pn: `ASSY-${i}` }),
      ),
    );

    await batchUpsertBomStructure();

    // 2 chunked deletes for 1500 incoming parents, none for stale parents
    expect(mocks.txDelete).toHaveBeenCalledTimes(2);
    expect(mocks.txInsert).toHaveBeenCalledTimes(2);
  });

  it("also deletes lines of local parents absent from the ERP extract", async () => {
    mocks.fetchBomStructureFromTSE.mockResolvedValue([
      makeRawBomRow({ parent_pn: "ASSY-KEPT" }),
    ]);
    mocks.txSelectDistinctFrom.mockResolvedValue([
      { parent_pn: "ASSY-KEPT" },
      { parent_pn: "ASSY-GONE" },
    ]);

    await batchUpsertBomStructure();

    // 1 delete for the incoming parent + 1 for the stale parent
    expect(mocks.txDelete).toHaveBeenCalledTimes(2);
    expect(console.log).toHaveBeenCalledWith(
      "Removed BOM lines for 1 stale parent(s) deleted in the ERP.",
    );
  });

  it("issues no stale delete when every local parent is still in the extract", async () => {
    mocks.fetchBomStructureFromTSE.mockResolvedValue([
      makeRawBomRow({ parent_pn: "ASSY-KEPT" }),
    ]);
    mocks.txSelectDistinctFrom.mockResolvedValue([{ parent_pn: "ASSY-KEPT" }]);

    await batchUpsertBomStructure();

    expect(mocks.txDelete).toHaveBeenCalledTimes(1);
    expect(console.log).toHaveBeenCalledWith(
      "Removed BOM lines for 0 stale parent(s) deleted in the ERP.",
    );
  });
});
