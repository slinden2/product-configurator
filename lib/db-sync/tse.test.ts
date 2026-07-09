// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  // tse.ts validates these at module load — they must exist before import
  process.env.TSE_USER = "test-user";
  process.env.TSE_PW = "test-pw";
  process.env.TSE_SRV = "test-server";
  process.env.TSE_DB_NAME = "test-db";

  const close = vi.fn();
  const connect = vi.fn();
  const query = vi.fn();
  return { close, connect, query };
});

vi.mock("mssql", () => ({
  default: { connect: mocks.connect, query: mocks.query },
}));

import { fetchBomStructureFromTSE, fetchPartNumbersFromTSE } from "./tse";

const validPartRow = {
  pn: "PN-1",
  description: "Bracket",
  pn_type: 2,
  is_phantom: 0,
  cost: 12.5,
  is_subcontract: 1,
  family: "FAM",
  sub_family: null,
};

const validBomRow = {
  parent_pn: "ASSY-1",
  child_pn: "PN-1",
  qty: 2,
  sort_order: 10,
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  mocks.close.mockResolvedValue(undefined);
  mocks.connect.mockResolvedValue({ close: mocks.close });
  mocks.query.mockResolvedValue({ recordset: [] });
});

describe("fetchPartNumbersFromTSE", () => {
  it("returns the recordset when every row passes validation", async () => {
    mocks.query.mockResolvedValue({
      recordset: [validPartRow, { ...validPartRow, pn: "PN-2", cost: null }],
    });

    const rows = await fetchPartNumbersFromTSE();

    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual(validPartRow);
    expect(mocks.close).toHaveBeenCalledTimes(1);
  });

  it("rejects with the sample offending row when validation fails", async () => {
    const offending = { ...validPartRow, cost: "12.5" };
    mocks.query.mockResolvedValue({ recordset: [validPartRow, offending] });

    await expect(fetchPartNumbersFromTSE()).rejects.toThrow(
      /TSE part-number rows failed validation/,
    );
    await expect(fetchPartNumbersFromTSE()).rejects.toThrow(
      JSON.stringify(offending),
    );
  });

  it("closes the connection even when validation throws", async () => {
    mocks.query.mockResolvedValue({
      recordset: [{ ...validPartRow, is_phantom: true }],
    });

    await expect(fetchPartNumbersFromTSE()).rejects.toThrow();
    expect(mocks.close).toHaveBeenCalledTimes(1);
  });
});

describe("fetchBomStructureFromTSE", () => {
  it("returns the recordset when every row passes validation", async () => {
    mocks.query.mockResolvedValue({ recordset: [validBomRow] });

    const rows = await fetchBomStructureFromTSE();

    expect(rows).toEqual([validBomRow]);
    expect(mocks.close).toHaveBeenCalledTimes(1);
  });

  it("rejects with the sample offending row when validation fails", async () => {
    const offending = { ...validBomRow, qty: "2" };
    mocks.query.mockResolvedValue({ recordset: [offending] });

    await expect(fetchBomStructureFromTSE()).rejects.toThrow(
      /TSE BOM-structure rows failed validation/,
    );
    await expect(fetchBomStructureFromTSE()).rejects.toThrow(
      JSON.stringify(offending),
    );
  });

  it("closes the connection even when validation throws", async () => {
    mocks.query.mockResolvedValue({
      recordset: [{ ...validBomRow, sort_order: null }],
    });

    await expect(fetchBomStructureFromTSE()).rejects.toThrow();
    expect(mocks.close).toHaveBeenCalledTimes(1);
  });
});
