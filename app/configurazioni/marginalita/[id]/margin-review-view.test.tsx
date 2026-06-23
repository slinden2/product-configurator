// @vitest-environment jsdom

import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, test } from "vitest";
import type { MarginComparison } from "@/lib/margin";
import { formatDelta, formatEur, formatPct } from "@/lib/utils";
import MarginReviewView from "./margin-review-view";

// --- Helpers ---

const BELOW_THRESHOLD_TITLE = "Marginalità sotto la soglia minima";

// Intl currency strings use a (narrow) non-breaking space; testing-library
// normalizes DOM text to a regular space, so match against the same form.
const normSpaces = (s: string) => s.replace(/\s+/g, " ");
const eur = (n: number) => normSpaces(formatEur(n));
const delta = (n: number) => normSpaces(formatDelta(n));

/** A healthy (above-threshold) comparison with an EBOM present. */
function makeComparison(
  overrides: Partial<MarginComparison> = {},
): MarginComparison {
  return {
    hasEbom: true,
    revenue: 1000,
    offerCost: 400,
    ebomCost: 500,
    offerMargin: { revenue: 1000, cost: 400, marginValue: 600, marginPct: 60 },
    currentMargin: {
      revenue: 1000,
      cost: 500,
      marginValue: 500,
      marginPct: 50,
    },
    marginPctDrop: 10,
    costDelta: 100,
    belowThreshold: false,
    tagBreakdown: [
      {
        tag: "FRAME",
        label: "Struttura",
        offerCost: 400,
        ebomCost: 500,
        delta: 100,
      },
    ],
    lineDiff: [],
    ...overrides,
  };
}

/** Comparison with no EBOM: engineering side is a 0 placeholder, deltas truthful (-offer). */
function makeNoEbomComparison(): MarginComparison {
  return makeComparison({
    hasEbom: false,
    ebomCost: 0,
    currentMargin: { revenue: 1000, cost: 0, marginValue: 0, marginPct: 0 },
    marginPctDrop: 60,
    costDelta: -400,
    belowThreshold: false,
    tagBreakdown: [
      {
        tag: "FRAME",
        label: "Struttura",
        offerCost: 400,
        ebomCost: 0,
        delta: -400,
      },
    ],
  });
}

/**
 * Returns the StatTile container <div> for a given label. Scoped to <div> so
 * labels that collide with table column headers (<th>) resolve to the tile.
 */
function tileFor(label: string): HTMLElement {
  const labelEl = screen.getByText(label, { selector: "div" });
  const tile = labelEl.parentElement;
  if (!tile) throw new Error(`No tile for ${label}`);
  return tile;
}

afterEach(() => {
  cleanup();
});

describe("MarginReviewView", () => {
  describe("with an EBOM", () => {
    test("shows all five summary stats including Costo offerta", () => {
      render(
        <MarginReviewView comparison={makeComparison()} discountPct={0} />,
      );

      // Scoped to <div> because "Costo offerta"/"Costo progettazione" also
      // appear as table column headers (<th>).
      expect(tileFor("Prezzo offerta")).toBeInTheDocument();
      expect(tileFor("Costo offerta")).toBeInTheDocument();
      expect(tileFor("Marginalità all'offerta")).toBeInTheDocument();
      expect(tileFor("Costo progettazione")).toBeInTheDocument();
      expect(tileFor("Marginalità dopo progettazione")).toBeInTheDocument();
    });

    test("renders the Variazione rows and no below-threshold banner", () => {
      render(
        <MarginReviewView comparison={makeComparison()} discountPct={0} />,
      );

      expect(screen.getByText(/Variazione marginalità/)).toBeInTheDocument();
      expect(screen.getByText(/Variazione costo:/)).toBeInTheDocument();
      expect(screen.queryByText(BELOW_THRESHOLD_TITLE)).not.toBeInTheDocument();
    });

    test("shows the real per-category variation, not zero", () => {
      render(
        <MarginReviewView comparison={makeComparison()} discountPct={0} />,
      );

      // delta = +100 appears for both the FRAME row and the Totale footer.
      expect(screen.getAllByText(delta(100)).length).toBeGreaterThan(0);
    });

    test("fires the below-threshold banner when belowThreshold is set", () => {
      render(
        <MarginReviewView
          comparison={makeComparison({
            belowThreshold: true,
            currentMargin: {
              revenue: 1000,
              cost: 800,
              marginValue: 200,
              marginPct: 20,
            },
          })}
          discountPct={0}
        />,
      );

      expect(screen.getByText(BELOW_THRESHOLD_TITLE)).toBeInTheDocument();
    });
  });

  describe("without an EBOM", () => {
    test("still shows the five stats, with engineering side at 0", () => {
      render(
        <MarginReviewView
          comparison={makeNoEbomComparison()}
          discountPct={0}
        />,
      );

      expect(tileFor("Costo offerta")).toBeInTheDocument();
      // Costo progettazione = 0
      expect(
        within(tileFor("Costo progettazione")).getByText(eur(0)),
      ).toBeInTheDocument();
      // Marginalità dopo progettazione = 0,0%
      expect(
        within(tileFor("Marginalità dopo progettazione")).getByText(
          formatPct(0),
        ),
      ).toBeInTheDocument();
    });

    test("hides the Variazione rows and the below-threshold banner", () => {
      render(
        <MarginReviewView
          comparison={makeNoEbomComparison()}
          discountPct={0}
        />,
      );

      expect(
        screen.queryByText(/Variazione marginalità/),
      ).not.toBeInTheDocument();
      expect(screen.queryByText(/Variazione costo:/)).not.toBeInTheDocument();
      expect(screen.queryByText(BELOW_THRESHOLD_TITLE)).not.toBeInTheDocument();
    });

    test("zeroes the per-category variation instead of showing -offerCost", () => {
      render(
        <MarginReviewView
          comparison={makeNoEbomComparison()}
          discountPct={0}
        />,
      );

      // The truthful (non-zeroed) delta would be -400; it must NOT be rendered.
      expect(screen.queryByText(delta(-400))).not.toBeInTheDocument();

      // The Totale footer's variation cell shows 0.
      const totaleRow = screen.getByText("Totale").closest("tr");
      expect(totaleRow).not.toBeNull();
      expect(
        within(totaleRow as HTMLElement).getAllByText(eur(0)).length,
      ).toBeGreaterThan(0);
    });
  });
});
