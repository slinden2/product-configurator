// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { makeTestUser } from "@/test/user-test-utils";
import type { Role } from "@/types";

// --- Mocks (references defined before vi.mock factories run) ---
const mockGetAcceptedOfferLinesForMarginSweep = vi.fn();
const mockComputeLineMarginAlertsBatch = vi.fn();

vi.mock("@/db/queries", () => ({
  getAcceptedOfferLinesForMarginSweep: () =>
    mockGetAcceptedOfferLinesForMarginSweep(),
}));

// classifyMarginLineState is stubbed to read a `state` field off the test
// alert, so each test declares the classification it exercises; the real
// classification logic is covered by lib/margin-alerts' own tests.
vi.mock("@/lib/margin-alerts", () => ({
  computeLineMarginAlertsBatch: (...args: unknown[]) =>
    mockComputeLineMarginAlertsBatch(...args),
  classifyMarginLineState: (alert?: { state?: string }) =>
    alert?.state ?? "MARGIN_UNAVAILABLE",
}));

import { MarginDecisionsCard } from "./margin-decisions-card";

const makeSweepLine = (overrides: Record<string, unknown> = {}) => ({
  id: 11,
  configuration_id: 7,
  pricing_snapshot: {},
  as_sold_frozen_at: new Date("2026-07-01"),
  absorbed_margin_percent: null,
  position: 0,
  offerId: 3,
  offerNumber: "OF-2026-001",
  discountPct: 10,
  ...overrides,
});

const makeAlert = (state: string, overrides: Record<string, unknown> = {}) => ({
  lineId: 11,
  configurationId: 7,
  marginPct: 12.3,
  thresholdPct: 20,
  alertActive: true,
  hasEbom: true,
  absorbedMarginPct: null,
  state,
  ...overrides,
});

const renderCard = async (role: Role) =>
  render(await MarginDecisionsCard({ user: makeTestUser(role) }));

afterEach(cleanup);

beforeEach(() => {
  vi.clearAllMocks();
  mockGetAcceptedOfferLinesForMarginSweep.mockResolvedValue([]);
  mockComputeLineMarginAlertsBatch.mockResolvedValue(new Map());
});

describe("MarginDecisionsCard role gate", () => {
  test.each([
    "SALES",
    "SALES_MANAGER",
    "ENGINEER",
  ] as const)("%s renders nothing and never triggers the sweep", async (role) => {
    await renderCard(role);

    expect(screen.queryByText("Decisioni margine")).not.toBeInTheDocument();
    expect(mockGetAcceptedOfferLinesForMarginSweep).not.toHaveBeenCalled();
  });

  test.each([
    "ADMIN",
    "SALES_DIRECTOR",
  ] as const)("%s sees the card", async (role) => {
    await renderCard(role);

    expect(screen.getByText("Decisioni margine")).toBeInTheDocument();
    expect(mockGetAcceptedOfferLinesForMarginSweep).toHaveBeenCalledTimes(1);
  });
});

describe("MarginDecisionsCard content", () => {
  test("no accepted offers → dedicated empty message", async () => {
    await renderCard("ADMIN");

    expect(
      screen.getByText("Nessuna offerta accettata da analizzare."),
    ).toBeInTheDocument();
  });

  test("accepted offers without actionable alerts → no-decision message", async () => {
    mockGetAcceptedOfferLinesForMarginSweep.mockResolvedValue([
      makeSweepLine(),
    ]);

    await renderCard("ADMIN");

    expect(
      screen.getByText("Nessuna decisione margine richiesta."),
    ).toBeInTheDocument();
  });

  test("a below-threshold line renders a 1-based row label and both links", async () => {
    mockGetAcceptedOfferLinesForMarginSweep.mockResolvedValue([
      makeSweepLine(),
    ]);
    mockComputeLineMarginAlertsBatch.mockResolvedValue(
      new Map([[11, makeAlert("BELOW_THRESHOLD")]]),
    );

    await renderCard("SALES_DIRECTOR");

    // position 0 displays 1-based, matching the offer margin page.
    expect(screen.getByText("riga 1")).toBeInTheDocument();
    expect(screen.getByText("Sotto soglia")).toBeInTheDocument();
    expect(screen.getByText("OF-2026-001").closest("a")).toHaveAttribute(
      "href",
      "/offerte/3",
    );
    expect(screen.getByText("Analizza").closest("a")).toHaveAttribute(
      "href",
      "/configurazioni/marginalita/7",
    );
  });

  test("lines are grouped per offer for the batch computation", async () => {
    mockGetAcceptedOfferLinesForMarginSweep.mockResolvedValue([
      makeSweepLine({ id: 11, offerId: 3 }),
      makeSweepLine({ id: 12, position: 1, offerId: 3 }),
      makeSweepLine({ id: 21, offerId: 4, offerNumber: "OF-2026-002" }),
    ]);

    await renderCard("ADMIN");

    const groups = mockComputeLineMarginAlertsBatch.mock.calls[0][0];
    expect(groups).toHaveLength(2);
    expect(groups[0].lines.map((l: { id: number }) => l.id)).toEqual([11, 12]);
    expect(groups[1].lines.map((l: { id: number }) => l.id)).toEqual([21]);
  });
});
