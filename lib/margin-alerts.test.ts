// @vitest-environment node
import { beforeEach, describe, expect, test, vi } from "vitest";

// --- Mocks ---

const mockGetEngineeringBomItemsForConfigs = vi.fn();
const mockEnrichWithCosts = vi.fn();
const mockPrepareOfferDisplayData = vi.fn();

vi.mock("@/db/queries", () => ({
  getEngineeringBomItemsForConfigs: (...args: unknown[]) =>
    mockGetEngineeringBomItemsForConfigs(...args),
}));

vi.mock("@/lib/BOM", () => ({
  enrichWithCosts: (...args: unknown[]) => mockEnrichWithCosts(...args),
}));

vi.mock("@/lib/offer", () => ({
  prepareOfferDisplayData: (...args: unknown[]) =>
    mockPrepareOfferDisplayData(...args),
}));

// --- Imports (after mocks) ---

import { buildMarginComparison, type EbomCostItem } from "@/lib/margin";
import {
  classifyMarginLineState,
  computeLineMarginAlerts,
  hasActiveMarginAlert,
  type LineMarginAlert,
} from "@/lib/margin-alerts";

const CONF_ID = 42;
const LINE_ID = 11;

/** A frozen, snapshot-bearing line — the only kind that reaches the alert map. */
function makeLine(overrides: Record<string, unknown> = {}) {
  return {
    id: LINE_ID,
    configuration_id: CONF_ID,
    pricing_snapshot: [{ pn: "A" }],
    as_sold_frozen_at: new Date("2026-06-01T09:00:00Z"),
    absorbed_margin_percent: null,
    ...overrides,
  };
}

/** One enriched EBOM row for `configId`, costing `cost` (revenue is fixed 1000). */
function makeEnrichedRow(configId: number, cost: number, isDeleted = false) {
  return {
    configuration_id: configId,
    pn: "A",
    description: "desc A",
    qty: 1,
    cost,
    tag: null,
    is_deleted: isDeleted,
  };
}

/** A LineMarginAlert with sensible defaults for classifier unit tests. */
function makeAlert(overrides: Partial<LineMarginAlert> = {}): LineMarginAlert {
  return {
    lineId: LINE_ID,
    configurationId: CONF_ID,
    marginPct: 40,
    thresholdPct: 30,
    alertActive: false,
    hasEbom: true,
    absorbedMarginPct: null,
    ...overrides,
  };
}

describe("classifyMarginLineState", () => {
  test("undefined (line skipped, no snapshot) → MARGIN_UNAVAILABLE", () => {
    expect(classifyMarginLineState(undefined)).toBe("MARGIN_UNAVAILABLE");
  });

  test("no EBOM → MARGIN_UNAVAILABLE (never a phantom 100%)", () => {
    expect(
      classifyMarginLineState(makeAlert({ hasEbom: false, marginPct: 100 })),
    ).toBe("MARGIN_UNAVAILABLE");
  });

  test("healthy, no sign-off → ABOVE_THRESHOLD", () => {
    expect(classifyMarginLineState(makeAlert({ alertActive: false }))).toBe(
      "ABOVE_THRESHOLD",
    );
  });

  test("below threshold, no sign-off → BELOW_THRESHOLD", () => {
    expect(classifyMarginLineState(makeAlert({ alertActive: true }))).toBe(
      "BELOW_THRESHOLD",
    );
  });

  test("absorbed and covered (not re-alerting) → ABSORBED", () => {
    expect(
      classifyMarginLineState(
        makeAlert({ alertActive: false, absorbedMarginPct: 20 }),
      ),
    ).toBe("ABSORBED");
  });

  test("absorbed but eroded again → ABSORBED_ERODED", () => {
    expect(
      classifyMarginLineState(
        makeAlert({ alertActive: true, absorbedMarginPct: 25 }),
      ),
    ).toBe("ABSORBED_ERODED");
  });

  test("sign-off on record while live margin recovered above threshold stays ABSORBED", () => {
    // A decision is on record; it does not silently disappear when the margin recovers.
    expect(
      classifyMarginLineState(
        makeAlert({ alertActive: false, absorbedMarginPct: 22, marginPct: 45 }),
      ),
    ).toBe("ABSORBED");
  });
});

describe("hasActiveMarginAlert", () => {
  test("true when any alert is raised", () => {
    expect(
      hasActiveMarginAlert([
        makeAlert({ alertActive: false }),
        makeAlert({ alertActive: true }),
      ]),
    ).toBe(true);
  });

  test("false when none is raised", () => {
    expect(
      hasActiveMarginAlert([
        makeAlert({ alertActive: false }),
        makeAlert({ alertActive: false }),
      ]),
    ).toBe(false);
  });

  test("false for an empty set", () => {
    expect(hasActiveMarginAlert([])).toBe(false);
  });
});

describe("computeLineMarginAlerts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetEngineeringBomItemsForConfigs.mockResolvedValue([{ any: "row" }]);
    mockPrepareOfferDisplayData.mockReturnValue({
      displayData: { discounted_total: 1000 },
    });
  });

  test("healthy line: hasEbom true, no alert, real margin", async () => {
    mockEnrichWithCosts.mockResolvedValue([makeEnrichedRow(CONF_ID, 600)]); // 40%
    const alerts = await computeLineMarginAlerts([makeLine()], 10);
    const alert = alerts.get(LINE_ID);
    expect(alert).toMatchObject({
      hasEbom: true,
      alertActive: false,
      marginPct: 40,
      absorbedMarginPct: null,
    });
    expect(classifyMarginLineState(alert)).toBe("ABOVE_THRESHOLD");
  });

  test("below-threshold line: alert raised", async () => {
    mockEnrichWithCosts.mockResolvedValue([makeEnrichedRow(CONF_ID, 800)]); // 20%
    const alerts = await computeLineMarginAlerts([makeLine()], 10);
    const alert = alerts.get(LINE_ID);
    expect(alert).toMatchObject({ hasEbom: true, alertActive: true });
    expect(classifyMarginLineState(alert)).toBe("BELOW_THRESHOLD");
  });

  test("no EBOM rows → hasEbom false → MARGIN_UNAVAILABLE (not 100%)", async () => {
    mockEnrichWithCosts.mockResolvedValue([]);
    const alerts = await computeLineMarginAlerts([makeLine()], 10);
    const alert = alerts.get(LINE_ID);
    expect(alert?.hasEbom).toBe(false);
    expect(alert?.alertActive).toBe(false);
    expect(classifyMarginLineState(alert)).toBe("MARGIN_UNAVAILABLE");
  });

  test("all-deleted EBOM rows → hasEbom false → MARGIN_UNAVAILABLE", async () => {
    // The batch fetch keeps soft-deleted rows; an all-deleted BOM must not read
    // as a healthy margin.
    mockEnrichWithCosts.mockResolvedValue([
      makeEnrichedRow(CONF_ID, 800, true),
    ]);
    const alerts = await computeLineMarginAlerts([makeLine()], 10);
    const alert = alerts.get(LINE_ID);
    expect(alert?.hasEbom).toBe(false);
    expect(classifyMarginLineState(alert)).toBe("MARGIN_UNAVAILABLE");
  });

  test("carries the absorbed margin baseline through", async () => {
    mockEnrichWithCosts.mockResolvedValue([makeEnrichedRow(CONF_ID, 800)]);
    const alerts = await computeLineMarginAlerts(
      [makeLine({ absorbed_margin_percent: "25.00" })],
      10,
    );
    expect(alerts.get(LINE_ID)?.absorbedMarginPct).toBe(25);
  });

  test("skips a line without the as-sold freeze (no map entry → unavailable)", async () => {
    const alerts = await computeLineMarginAlerts(
      [makeLine({ as_sold_frozen_at: null })],
      10,
    );
    expect(alerts.get(LINE_ID)).toBeUndefined();
    expect(classifyMarginLineState(alerts.get(LINE_ID))).toBe(
      "MARGIN_UNAVAILABLE",
    );
  });

  test("marginPct agrees with buildMarginComparison for the same basis", async () => {
    // Consistency: the offer hub (this fn) and the detail page (buildMarginComparison)
    // must never disagree on the same revenue + EBOM.
    const ebomItems: EbomCostItem[] = [
      {
        pn: "A",
        description: "desc A",
        qty: 1,
        cost: 800,
        tag: null,
        is_deleted: false,
      },
    ];
    mockEnrichWithCosts.mockResolvedValue([makeEnrichedRow(CONF_ID, 800)]);
    const alerts = await computeLineMarginAlerts([makeLine()], 10);
    const comparison = buildMarginComparison(1000, [], ebomItems);
    expect(alerts.get(LINE_ID)?.marginPct).toBe(
      comparison.currentMargin.marginPct,
    );
  });

  test("projected mode (requireFrozen: false): a non-frozen line is included", async () => {
    // The working (renegotiation) DRAFT line has no as-sold freeze but carries
    // live pricing; requireFrozen: false lets it produce a projected alert.
    mockEnrichWithCosts.mockResolvedValue([makeEnrichedRow(CONF_ID, 800)]); // 20%
    const alerts = await computeLineMarginAlerts(
      [makeLine({ as_sold_frozen_at: null })],
      10,
      { requireFrozen: false },
    );
    const alert = alerts.get(LINE_ID);
    expect(alert).toMatchObject({ hasEbom: true, alertActive: true });
    expect(classifyMarginLineState(alert)).toBe("BELOW_THRESHOLD");
  });

  test("projected mode: a healthy non-frozen line is ABOVE_THRESHOLD", async () => {
    mockEnrichWithCosts.mockResolvedValue([makeEnrichedRow(CONF_ID, 600)]); // 40%
    const alerts = await computeLineMarginAlerts(
      [makeLine({ as_sold_frozen_at: null })],
      10,
      { requireFrozen: false },
    );
    expect(classifyMarginLineState(alerts.get(LINE_ID))).toBe(
      "ABOVE_THRESHOLD",
    );
  });

  test("projected mode still skips a line without a snapshot", async () => {
    const alerts = await computeLineMarginAlerts(
      [makeLine({ as_sold_frozen_at: null, pricing_snapshot: null })],
      10,
      { requireFrozen: false },
    );
    expect(alerts.get(LINE_ID)).toBeUndefined();
  });
});
