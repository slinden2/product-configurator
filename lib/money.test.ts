// @vitest-environment node
import { describe, expect, test } from "vitest";

import {
  computeNetPrice,
  formatDelta,
  formatDiscountPctLabel,
  formatPct,
  round2,
} from "@/lib/money";

describe("round2", () => {
  test("rounds to 2 decimals", () => {
    expect(round2(169.9915)).toBe(169.99);
    expect(round2(169.996)).toBe(170);
  });

  test("rounds half away from zero for non-negative values (SQL parity)", () => {
    // 0.125 and 12.375 are exactly representable in binary floating point, so
    // the halfway case is genuine: Math.round(12.5) must match Postgres
    // round(0.125, 2) = 0.13 — the contract documented on computeNetPrice.
    expect(round2(0.125)).toBe(0.13);
    expect(round2(12.375)).toBe(12.38);
  });
});

describe("computeNetPrice", () => {
  test("applies the header discount and rounds to cents", () => {
    expect(computeNetPrice(100, 10)).toBe(90);
    expect(computeNetPrice(199.99, 15)).toBe(169.99);
    expect(computeNetPrice(0, 25)).toBe(0);
  });

  test("zero discount returns the list price unchanged", () => {
    expect(computeNetPrice(17202.72, 0)).toBe(17202.72);
  });

  test("half-away-from-zero cases match the SQL recompute in updateRevisionDiscountWithAudit", () => {
    // Postgres: round(0.25 * 0.5, 2) = round(0.125, 2) = 0.13
    expect(computeNetPrice(0.25, 50)).toBe(0.13);
    // Postgres: round(24.75 * 0.5, 2) = round(12.375, 2) = 12.38
    expect(computeNetPrice(24.75, 50)).toBe(12.38);
  });
});

describe("formatDiscountPctLabel", () => {
  test("whole percentages render without decimals", () => {
    expect(formatDiscountPctLabel(10)).toBe("10");
    expect(formatDiscountPctLabel(0)).toBe("0");
  });

  test("fractional percentages render with Italian decimal comma", () => {
    expect(formatDiscountPctLabel(10.5)).toBe("10,50");
  });
});

describe("formatPct", () => {
  test("formats Italian-style with one decimal", () => {
    expect(formatPct(42.5)).toBe("42,5%");
    expect(formatPct(0)).toBe("0,0%");
  });
});

describe("formatDelta", () => {
  test("prefixes positive deltas with +", () => {
    expect(formatDelta(100)).toMatch(/^\+100,00/);
  });

  test("negative deltas keep the minus sign", () => {
    expect(formatDelta(-50)).toMatch(/^-50,00/);
  });
});
