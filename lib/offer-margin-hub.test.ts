// @vitest-environment node
import { describe, expect, test, vi } from "vitest";

// --- Mocks ---
// lib/offer-margin-hub → lib/margin-alerts pulls in the db client + BOM/offer
// helpers at import. The hub helpers under test are pure and never call them, so
// stub the modules to keep this a node unit test.
vi.mock("@/db/queries", () => ({
  getEngineeringBomItemsForConfigs: vi.fn(),
}));
vi.mock("@/lib/BOM", () => ({
  enrichWithCosts: vi.fn(),
}));
vi.mock("@/lib/offer", () => ({
  prepareOfferDisplayData: vi.fn(),
}));

// --- Imports (after mocks) ---
import type { LineMarginAlert } from "@/lib/margin-alerts";
import {
  buildMarginOverviewRows,
  buildProjectedMarginOverview,
  deriveRenegotiationHubState,
  hasProjectableRenegotiation,
  marginHubAcceptedRevision,
} from "@/lib/offer-margin-hub";

/** A LineMarginAlert with healthy defaults; override per case. */
function makeAlert(overrides: Partial<LineMarginAlert> = {}): LineMarginAlert {
  return {
    lineId: 1,
    configurationId: 101,
    marginPct: 40,
    thresholdPct: 30,
    alertActive: false,
    hasEbom: true,
    absorbedMarginPct: null,
    ...overrides,
  };
}

/** A minimal accepted-revision line (the page ships a superset of this shape). */
function makeLine(id: number, configId: number, position: number) {
  return { id, position, configuration: { id: configId } };
}

describe("marginHubAcceptedRevision", () => {
  const revisions = [
    { id: 7, label: "renegotiation" },
    { id: 5, label: "first-accepted" },
    { id: 3, label: "older" },
  ];

  test("returns null when the viewer may not see margin data (role gate)", () => {
    // SALES / SALES_MANAGER: canSeeMargin=false → no revision, so the page never
    // computes or surfaces margin figures for them.
    expect(marginHubAcceptedRevision(false, revisions, 5)).toBeNull();
  });

  test("returns null when the offer has no accepted revision", () => {
    expect(marginHubAcceptedRevision(true, revisions, null)).toBeNull();
  });

  test("selects the revision accepted_revision_id points at", () => {
    expect(marginHubAcceptedRevision(true, revisions, 5)).toEqual({
      id: 5,
      label: "first-accepted",
    });
  });

  test("excludes a superseded ACCEPTED revision — matches id, not status", () => {
    // After a renegotiation re-acceptance the prior revision keeps ACCEPTED
    // status; only the one accepted_revision_id points at is in force. Matching
    // on status would wrongly pick the superseded revision (id 7).
    const withStatus = [
      { id: 7, status: "ACCEPTED" as const }, // superseded, still ACCEPTED
      { id: 5, status: "ACCEPTED" as const }, // the in-force one
    ];
    const result = marginHubAcceptedRevision(true, withStatus, 5);
    expect(result).toEqual({ id: 5, status: "ACCEPTED" });
    expect(result?.id).not.toBe(7);
  });

  test("returns null when accepted_revision_id matches no revision", () => {
    expect(marginHubAcceptedRevision(true, revisions, 999)).toBeNull();
  });
});

describe("buildMarginOverviewRows", () => {
  test("returns [] when there is no in-force accepted revision (gated/unauthorized)", () => {
    expect(buildMarginOverviewRows(null, new Map())).toEqual([]);
  });

  test("one row per line, carrying lineId / configId / position", () => {
    const rows = buildMarginOverviewRows(
      { lines: [makeLine(1, 101, 0), makeLine(2, 102, 1)] },
      new Map(),
    );
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ lineId: 1, configId: 101, position: 0 });
    expect(rows[1]).toMatchObject({ lineId: 2, configId: 102, position: 1 });
  });

  test("derives each row's state from its alert", () => {
    const alerts = new Map<number, LineMarginAlert>([
      [1, makeAlert({ lineId: 1, alertActive: true, absorbedMarginPct: null })],
      [2, makeAlert({ lineId: 2, alertActive: false, absorbedMarginPct: 20 })],
    ]);
    const rows = buildMarginOverviewRows(
      { lines: [makeLine(1, 101, 0), makeLine(2, 102, 1)] },
      alerts,
    );
    expect(rows[0].state).toBe("BELOW_THRESHOLD");
    expect(rows[1].state).toBe("ABSORBED");
  });

  test("a line with no EBOM is MARGIN_UNAVAILABLE with a null margin (never phantom 100%)", () => {
    const alerts = new Map<number, LineMarginAlert>([
      [1, makeAlert({ lineId: 1, hasEbom: false, marginPct: 100 })],
    ]);
    const [row] = buildMarginOverviewRows(
      { lines: [makeLine(1, 101, 0)] },
      alerts,
    );
    expect(row.state).toBe("MARGIN_UNAVAILABLE");
    expect(row.marginPct).toBeNull();
  });

  test("a line with no alert entry (skipped: no snapshot) is unavailable, null margin, 0 threshold", () => {
    const [row] = buildMarginOverviewRows(
      { lines: [makeLine(1, 101, 0)] },
      new Map(),
    );
    expect(row.state).toBe("MARGIN_UNAVAILABLE");
    expect(row.marginPct).toBeNull();
    expect(row.thresholdPct).toBe(0);
  });

  test("a priced line carries its live margin and threshold", () => {
    const alerts = new Map<number, LineMarginAlert>([
      [
        1,
        makeAlert({
          lineId: 1,
          hasEbom: true,
          marginPct: 42,
          thresholdPct: 30,
        }),
      ],
    ]);
    const [row] = buildMarginOverviewRows(
      { lines: [makeLine(1, 101, 0)] },
      alerts,
    );
    expect(row.marginPct).toBe(42);
    expect(row.thresholdPct).toBe(30);
  });
});

describe("deriveRenegotiationHubState", () => {
  const draft = { revision_no: 3, status: "DRAFT" as const };
  const sent = { revision_no: 3, status: "SENT" as const };

  test("available when a renegotiation may be opened", () => {
    expect(deriveRenegotiationHubState(true, sent, false)).toEqual({
      kind: "available",
    });
  });

  test("available takes precedence over the open arm", () => {
    // canRenegotiate can't actually coincide with an open working revision, but
    // the derivation must still prioritize the available arm regardless.
    expect(deriveRenegotiationHubState(true, draft, true)).toEqual({
      kind: "available",
    });
  });

  test("open when a renegotiation working revision is in an open state", () => {
    expect(deriveRenegotiationHubState(false, draft, true)).toEqual({
      kind: "open",
      revisionNo: 3,
      statusLabel: "Bozza",
    });
  });

  test("none when the open working revision is not a renegotiation", () => {
    expect(deriveRenegotiationHubState(false, draft, false)).toEqual({
      kind: "none",
    });
  });

  test("none when the renegotiation has left the open states (SENT, awaiting customer)", () => {
    expect(deriveRenegotiationHubState(false, sent, true)).toEqual({
      kind: "none",
    });
  });

  test("none when there is no working revision", () => {
    expect(deriveRenegotiationHubState(false, undefined, true)).toEqual({
      kind: "none",
    });
  });
});

describe("hasProjectableRenegotiation", () => {
  // Working revision id 7; the in-force accepted revision is id 5.
  const draft = { id: 7, status: "DRAFT" as const };

  test("true for a DRAFT renegotiation distinct from the accepted revision", () => {
    expect(hasProjectableRenegotiation(draft, 5, true)).toBe(true);
  });

  test("true for a SENT renegotiation (in flight, not yet a customer outcome)", () => {
    // SENT is not in OPEN_REVISION_STATUSES, but it is still a live proposal.
    expect(
      hasProjectableRenegotiation({ id: 7, status: "SENT" }, 5, true),
    ).toBe(true);
  });

  test("false when the working revision is not a renegotiation", () => {
    expect(hasProjectableRenegotiation(draft, 5, false)).toBe(false);
  });

  test("false when the working revision IS the in-force accepted one (accepted renegotiation)", () => {
    // A re-accepted renegotiation became the baseline: nothing to project against.
    expect(
      hasProjectableRenegotiation({ id: 5, status: "ACCEPTED" }, 5, true),
    ).toBe(false);
  });

  test.each([
    "ACCEPTED",
    "REJECTED",
    "EXPIRED",
  ] as const)("false for the terminal customer outcome %s", (status) => {
    expect(hasProjectableRenegotiation({ id: 7, status }, 5, true)).toBe(false);
  });

  test("false when there is no working revision", () => {
    expect(hasProjectableRenegotiation(undefined, 5, true)).toBe(false);
  });
});

describe("buildProjectedMarginOverview", () => {
  test("carries the working revision number, localized status, and rows", () => {
    const alerts = new Map<number, LineMarginAlert>([
      [1, makeAlert({ lineId: 1, alertActive: true })],
    ]);
    const overview = buildProjectedMarginOverview(
      { revision_no: 3, status: "DRAFT", lines: [makeLine(1, 101, 0)] },
      alerts,
    );
    expect(overview.revisionNo).toBe(3);
    expect(overview.statusLabel).toBe("Bozza");
    expect(overview.rows).toHaveLength(1);
    expect(overview.rows[0]).toMatchObject({
      lineId: 1,
      configId: 101,
      state: "BELOW_THRESHOLD",
    });
  });
});
