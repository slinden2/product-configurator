import { describe, expect, it } from "vitest";
import type { BomTag } from "@/types";
import type { OfferBomLineItem } from "@/validation/offer/offer-pricing-schema";
import {
  buildLineDiff,
  buildMarginComparison,
  buildTagBreakdown,
  computeEbomCost,
  computeMargin,
  computeOfferBomCost,
  type EbomCostItem,
  getConfigurationProductCategory,
  getMarginThresholdForCategory,
  isMarginAlertActive,
  isMarginBelowThreshold,
  MARGIN_EPSILON,
  offerLineCost,
} from "./margin";

/** The current (single) category's threshold — the default judged against. */
const CATEGORY_THRESHOLD = getMarginThresholdForCategory(
  getConfigurationProductCategory(),
);

function makeOfferItem(
  overrides: Partial<OfferBomLineItem> & { pn: string },
): OfferBomLineItem {
  const qty = overrides.qty ?? 1;
  const coefficient = overrides.coefficient ?? 3;
  // Default a self-consistent line_total = unitCost * coefficient * qty.
  const unitCost = overrides.line_total
    ? 0
    : (overrides.list_price ?? coefficient) / coefficient;
  return {
    pn: overrides.pn,
    description: overrides.description ?? `desc ${overrides.pn}`,
    qty,
    coefficient,
    list_price: overrides.list_price ?? unitCost * coefficient,
    line_total: overrides.line_total ?? unitCost * coefficient * qty,
    tag: overrides.tag ?? null,
    category: overrides.category ?? "GENERAL",
    category_index: overrides.category_index ?? 0,
  };
}

function makeEbomItem(
  overrides: Partial<EbomCostItem> & { pn: string },
): EbomCostItem {
  return {
    pn: overrides.pn,
    description: overrides.description ?? `desc ${overrides.pn}`,
    qty: overrides.qty ?? 1,
    cost: overrides.cost ?? 0,
    tag: overrides.tag ?? null,
    is_deleted: overrides.is_deleted ?? false,
  };
}

describe("offerLineCost", () => {
  it("back-computes cost as line_total / coefficient", () => {
    const item = makeOfferItem({ pn: "A", coefficient: 3, line_total: 300 });
    expect(offerLineCost(item)).toBe(100);
  });

  it("returns 0 when coefficient is 0 (guard against divide-by-zero)", () => {
    const item = makeOfferItem({ pn: "A", coefficient: 0, line_total: 300 });
    expect(offerLineCost(item)).toBe(0);
  });
});

describe("computeOfferBomCost", () => {
  it("sums back-computed costs of all lines", () => {
    const items = [
      makeOfferItem({ pn: "A", coefficient: 3, line_total: 300 }),
      makeOfferItem({ pn: "B", coefficient: 2, line_total: 200 }),
    ];
    expect(computeOfferBomCost(items)).toBe(200); // 100 + 100
  });
});

describe("computeEbomCost", () => {
  it("sums cost * qty over non-deleted items", () => {
    const items = [
      makeEbomItem({ pn: "A", cost: 50, qty: 2 }),
      makeEbomItem({ pn: "B", cost: 30, qty: 1 }),
    ];
    expect(computeEbomCost(items)).toBe(130);
  });

  it("excludes soft-deleted items", () => {
    const items = [
      makeEbomItem({ pn: "A", cost: 50, qty: 2 }),
      makeEbomItem({ pn: "B", cost: 999, qty: 1, is_deleted: true }),
    ];
    expect(computeEbomCost(items)).toBe(100);
  });
});

describe("computeMargin", () => {
  it("computes margin value and percentage", () => {
    const result = computeMargin(1000, 600);
    expect(result.marginValue).toBe(400);
    expect(result.marginPct).toBe(40);
  });

  it("returns 0% when revenue is non-positive", () => {
    expect(computeMargin(0, 100).marginPct).toBe(0);
  });

  it("can be negative when cost exceeds revenue", () => {
    expect(computeMargin(100, 150).marginPct).toBe(-50);
  });
});

describe("buildTagBreakdown", () => {
  it("groups offer and ebom cost by tag and computes delta", () => {
    const offer = [
      makeOfferItem({
        pn: "A",
        tag: "FRAME",
        coefficient: 2,
        line_total: 200,
      }),
    ];
    const ebom = [makeEbomItem({ pn: "A", tag: "FRAME", cost: 150, qty: 1 })];
    const rows = buildTagBreakdown(offer, ebom);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      tag: "FRAME",
      offerCost: 100,
      ebomCost: 150,
      delta: 50,
    });
  });

  it("normalizes unknown/null tags to MISC", () => {
    const ebom = [
      makeEbomItem({ pn: "A", tag: "NOT_A_REAL_TAG", cost: 10, qty: 1 }),
      makeEbomItem({ pn: "B", tag: null, cost: 5, qty: 1 }),
    ];
    const rows = buildTagBreakdown([], ebom);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.tag).toBe<BomTag>("MISC");
    expect(rows[0]?.ebomCost).toBe(15);
  });

  it("omits tags with no cost on either side", () => {
    const rows = buildTagBreakdown([], []);
    expect(rows).toHaveLength(0);
  });
});

describe("buildLineDiff", () => {
  it("flags added, removed, changed and unchanged parts", () => {
    const offer = [
      makeOfferItem({ pn: "KEEP", coefficient: 2, qty: 1, line_total: 200 }),
      makeOfferItem({ pn: "CHANGED", coefficient: 2, qty: 1, line_total: 200 }),
      makeOfferItem({ pn: "REMOVED", coefficient: 2, qty: 1, line_total: 200 }),
    ];
    const ebom = [
      makeEbomItem({ pn: "KEEP", cost: 100, qty: 1 }), // same cost → unchanged
      makeEbomItem({ pn: "CHANGED", cost: 100, qty: 2 }), // qty changed
      makeEbomItem({ pn: "ADDED", cost: 80, qty: 1 }),
    ];
    const diff = buildLineDiff(offer, ebom);
    const byPn = new Map(diff.map((r) => [r.pn, r]));
    expect(byPn.get("KEEP")?.status).toBe("unchanged");
    expect(byPn.get("CHANGED")?.status).toBe("changed");
    expect(byPn.get("REMOVED")?.status).toBe("removed");
    expect(byPn.get("ADDED")?.status).toBe("added");
  });

  it("flags a qty-only change with qtyChanged but not costChanged", () => {
    // offer: qty 2, aggregated cost 100 — ebom: qty 4 × cost 25 = 100
    const offer = [
      makeOfferItem({ pn: "A", coefficient: 2, qty: 2, line_total: 200 }),
    ];
    const ebom = [makeEbomItem({ pn: "A", cost: 25, qty: 4 })];
    const diff = buildLineDiff(offer, ebom);
    expect(diff[0]).toMatchObject({
      status: "changed",
      qtyChanged: true,
      costChanged: false,
    });
  });

  it("flags a cost-only change with costChanged but not qtyChanged", () => {
    // Same qty, catalog price moved: offer cost 100 vs ebom cost 150.
    const offer = [
      makeOfferItem({ pn: "A", coefficient: 2, qty: 1, line_total: 200 }),
    ];
    const ebom = [makeEbomItem({ pn: "A", cost: 150, qty: 1 })];
    const diff = buildLineDiff(offer, ebom);
    expect(diff[0]).toMatchObject({
      status: "changed",
      qtyChanged: false,
      costChanged: true,
    });
  });

  it("flags both when qty and cost differ", () => {
    const offer = [
      makeOfferItem({ pn: "A", coefficient: 2, qty: 1, line_total: 200 }),
    ];
    const ebom = [makeEbomItem({ pn: "A", cost: 150, qty: 2 })];
    const diff = buildLineDiff(offer, ebom);
    expect(diff[0]).toMatchObject({
      status: "changed",
      qtyChanged: true,
      costChanged: true,
    });
  });

  it("keeps both change flags false on added, removed and unchanged rows", () => {
    const offer = [
      makeOfferItem({ pn: "KEEP", coefficient: 2, qty: 1, line_total: 200 }),
      makeOfferItem({ pn: "REMOVED", coefficient: 2, qty: 1, line_total: 200 }),
    ];
    const ebom = [
      makeEbomItem({ pn: "KEEP", cost: 100, qty: 1 }),
      makeEbomItem({ pn: "ADDED", cost: 80, qty: 1 }),
    ];
    const diff = buildLineDiff(offer, ebom);
    for (const row of diff) {
      expect(row).toMatchObject({ qtyChanged: false, costChanged: false });
    }
  });

  it("treats a sub-epsilon cost difference as unchanged", () => {
    const offer = [
      makeOfferItem({ pn: "A", coefficient: 2, qty: 1, line_total: 200 }),
    ];
    const ebom = [makeEbomItem({ pn: "A", cost: 100.004, qty: 1 })];
    const diff = buildLineDiff(offer, ebom);
    expect(diff[0]).toMatchObject({
      status: "unchanged",
      qtyChanged: false,
      costChanged: false,
    });
  });

  it("aggregates the same pn across categories", () => {
    const offer = [
      makeOfferItem({
        pn: "A",
        category: "WASH_BAY",
        category_index: 0,
        coefficient: 2,
        qty: 1,
        line_total: 200,
      }),
      makeOfferItem({
        pn: "A",
        category: "WASH_BAY",
        category_index: 1,
        coefficient: 2,
        qty: 2,
        line_total: 400,
      }),
    ];
    const diff = buildLineDiff(offer, []);
    expect(diff).toHaveLength(1);
    expect(diff[0]).toMatchObject({ pn: "A", offerQty: 3, offerCost: 300 });
  });

  it("sorts changes before unchanged rows", () => {
    const offer = [
      makeOfferItem({ pn: "KEEP", coefficient: 2, qty: 1, line_total: 200 }),
    ];
    const ebom = [
      makeEbomItem({ pn: "KEEP", cost: 100, qty: 1 }),
      makeEbomItem({ pn: "ADDED", cost: 80, qty: 1 }),
    ];
    const diff = buildLineDiff(offer, ebom);
    expect(diff[0]?.status).toBe("added");
    expect(diff[diff.length - 1]?.status).toBe("unchanged");
  });
});

describe("buildMarginComparison", () => {
  const offer = [
    makeOfferItem({ pn: "A", tag: "FRAME", coefficient: 2, line_total: 200 }),
  ]; // offer cost = 100

  it("flags belowThreshold when current margin drops under the product-category threshold", () => {
    // revenue 1000, ebom cost 800 → 20% margin < 30%
    const ebom = [makeEbomItem({ pn: "A", tag: "FRAME", cost: 800, qty: 1 })];
    const result = buildMarginComparison(1000, offer, ebom);
    expect(result.hasEbom).toBe(true);
    expect(result.offerMargin.marginPct).toBe(90); // (1000-100)/1000
    expect(result.currentMargin.marginPct).toBe(20);
    expect(result.marginPctDrop).toBe(70);
    expect(result.costDelta).toBe(700);
    expect(result.thresholdPct).toBe(CATEGORY_THRESHOLD);
    expect(result.belowThreshold).toBe(true);
  });

  it("zeroes the engineering side and never flags when no EBOM exists", () => {
    const result = buildMarginComparison(1000, offer, []);
    expect(result.hasEbom).toBe(false);
    expect(result.ebomCost).toBe(0);
    // offer side stays real...
    expect(result.offerCost).toBe(100);
    expect(result.offerMargin.marginPct).toBe(90);
    // ...engineering side is a forced 0 placeholder (not 100%)
    expect(result.currentMargin.cost).toBe(0);
    expect(result.currentMargin.marginValue).toBe(0);
    expect(result.currentMargin.marginPct).toBe(0);
    expect(result.belowThreshold).toBe(false);
  });

  it("does not flag when current margin is at or above the threshold", () => {
    // revenue 1000, ebom cost 700 → exactly 30%
    const ebom = [makeEbomItem({ pn: "A", tag: "FRAME", cost: 700, qty: 1 })];
    const result = buildMarginComparison(1000, offer, ebom);
    expect(result.currentMargin.marginPct).toBe(CATEGORY_THRESHOLD);
    expect(result.belowThreshold).toBe(false);
  });

  it("judges against an explicit threshold instead of the category default", () => {
    // revenue 1000, ebom cost 800 → 20% margin
    const ebom = [makeEbomItem({ pn: "A", tag: "FRAME", cost: 800, qty: 1 })];
    const strict = buildMarginComparison(1000, offer, ebom, 25);
    expect(strict.thresholdPct).toBe(25);
    expect(strict.belowThreshold).toBe(true);
    const lenient = buildMarginComparison(1000, offer, ebom, 15);
    expect(lenient.thresholdPct).toBe(15);
    expect(lenient.belowThreshold).toBe(false);
  });

  it("raises alertActive without a sign-off and defaults absorbedMarginPct to null", () => {
    // revenue 1000, ebom cost 800 → 20% margin < 30%
    const ebom = [makeEbomItem({ pn: "A", tag: "FRAME", cost: 800, qty: 1 })];
    const result = buildMarginComparison(1000, offer, ebom);
    expect(result.absorbedMarginPct).toBeNull();
    expect(result.alertActive).toBe(true);
  });

  it("silences alertActive when a sign-off covers the live margin, keeping belowThreshold true", () => {
    // live margin 20%, absorbed at 20% → below threshold but no active alert
    const ebom = [makeEbomItem({ pn: "A", tag: "FRAME", cost: 800, qty: 1 })];
    const result = buildMarginComparison(1000, offer, ebom, undefined, 20);
    expect(result.belowThreshold).toBe(true);
    expect(result.absorbedMarginPct).toBe(20);
    expect(result.alertActive).toBe(false);
  });

  it("re-raises alertActive when the live margin drops below the absorbed margin", () => {
    // live margin 15%, absorbed at 20% → further drift re-opens the question
    const ebom = [makeEbomItem({ pn: "A", tag: "FRAME", cost: 850, qty: 1 })];
    const result = buildMarginComparison(1000, offer, ebom, undefined, 20);
    expect(result.alertActive).toBe(true);
  });
});

describe("isMarginAlertActive", () => {
  // revenue 1000, cost 800 → 20% live margin, threshold 30
  const ebom = [makeEbomItem({ pn: "A", cost: 800, qty: 1 })];

  it("is active below threshold without a sign-off", () => {
    expect(isMarginAlertActive(1000, ebom, 30, null)).toBe(true);
  });

  it("is inactive at or above the threshold regardless of any sign-off", () => {
    const healthy = [makeEbomItem({ pn: "A", cost: 600, qty: 1 })]; // 40%
    expect(isMarginAlertActive(1000, healthy, 30, null)).toBe(false);
    expect(isMarginAlertActive(1000, healthy, 30, 45)).toBe(false);
  });

  it("is silenced by a sign-off at the live margin", () => {
    expect(isMarginAlertActive(1000, ebom, 30, 20)).toBe(false);
  });

  it("tolerates the 2-decimal rounding of the stored absorbed margin", () => {
    // live 24.126% stored as 24.13: live < stored but within epsilon → silenced
    const rounded = [makeEbomItem({ pn: "A", cost: 758.74, qty: 1 })]; // 24.126%
    expect(isMarginAlertActive(1000, rounded, 30, 24.13)).toBe(false);
  });

  it("re-alerts when the live margin drops below the absorbed margin beyond epsilon", () => {
    expect(isMarginAlertActive(1000, ebom, 30, 20 + MARGIN_EPSILON * 2)).toBe(
      true,
    );
    // absorbed at 25%, live at 20% → clearly re-alerts
    expect(isMarginAlertActive(1000, ebom, 30, 25)).toBe(true);
  });

  it("never alerts without a live EBOM, even with a stale sign-off", () => {
    expect(isMarginAlertActive(1000, [], 30, 20)).toBe(false);
  });
});

describe("isMarginBelowThreshold", () => {
  it("flips as the threshold crosses the computed margin", () => {
    // revenue 1000, cost 800 → 20% margin
    const ebom = [makeEbomItem({ pn: "A", cost: 800, qty: 1 })];
    expect(isMarginBelowThreshold(1000, ebom, 25)).toBe(true);
    expect(isMarginBelowThreshold(1000, ebom, 15)).toBe(false);
  });

  it("flips as the EBOM cost changes against a fixed threshold", () => {
    const cheap = [makeEbomItem({ pn: "A", cost: 600, qty: 1 })]; // 40%
    const pricey = [makeEbomItem({ pn: "A", cost: 800, qty: 1 })]; // 20%
    expect(isMarginBelowThreshold(1000, cheap, 30)).toBe(false);
    expect(isMarginBelowThreshold(1000, pricey, 30)).toBe(true);
  });

  it("is not below at the exact boundary (strict less-than)", () => {
    // revenue 1000, cost 700 → exactly 30%
    const ebom = [makeEbomItem({ pn: "A", cost: 700, qty: 1 })];
    expect(isMarginBelowThreshold(1000, ebom, 30)).toBe(false);
  });

  it("never flags without a live EBOM (empty or all-deleted)", () => {
    expect(isMarginBelowThreshold(1000, [], 30)).toBe(false);
    const deleted = [
      makeEbomItem({ pn: "A", cost: 900, qty: 1, is_deleted: true }),
    ];
    expect(isMarginBelowThreshold(1000, deleted, 30)).toBe(false);
  });

  it("flags zero revenue (0% margin) against any positive threshold", () => {
    const ebom = [makeEbomItem({ pn: "A", cost: 100, qty: 1 })];
    expect(isMarginBelowThreshold(0, ebom, 30)).toBe(true);
  });
});

describe("product category threshold", () => {
  it("resolves the current configuration category to rollover gantries", () => {
    expect(getConfigurationProductCategory()).toBe("ROLLOVER_GANTRY");
  });

  it("picks the rollover gantry threshold from the category map", () => {
    expect(getMarginThresholdForCategory("ROLLOVER_GANTRY")).toBe(30);
  });
});
