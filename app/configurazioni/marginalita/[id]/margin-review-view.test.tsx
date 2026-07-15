// @vitest-environment jsdom

import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, test } from "vitest";
import type { AsSoldDiff } from "@/lib/configuration/build-as-sold-diff";
import type { LineDiffRow, MarginComparison } from "@/lib/margin";
import { MSG } from "@/lib/messages";
import { formatDelta, formatPct } from "@/lib/money";
import { formatEur } from "@/lib/utils";
// Analysis-only page: the decision actions (absorb / renegotiate) moved to the
// offer margin hub, so this view no longer imports any server action.
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
    thresholdPct: 30,
    belowThreshold: false,
    absorbedMarginPct: null,
    alertActive: false,
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

/** A changed (cost-only) BOM diff row; override for other statuses. */
function makeLineDiffRow(
  overrides: Partial<LineDiffRow> & { pn: string },
): LineDiffRow {
  return {
    description: `desc ${overrides.pn}`,
    offerQty: 1,
    ebomQty: 1,
    offerCost: 100,
    ebomCost: 150,
    costDelta: 50,
    qtyChanged: false,
    costChanged: true,
    status: "changed",
    ...overrides,
  };
}

/** A drifted diff: one changed field, one removed tank row. */
function makeAsSoldDiff(overrides: Partial<AsSoldDiff> = {}): AsSoldDiff {
  return {
    hasChanges: true,
    sections: [
      {
        title: "Spazzole",
        rows: [
          {
            key: "brush_qty",
            label: "Numero di spazzole",
            asSoldValue: "2",
            currentValue: "3",
            status: "changed",
          },
        ],
      },
      {
        title: "Serbatoio 1 (rimosso)",
        rows: [
          {
            key: "type",
            label: "Tipo di serbatoio",
            asSoldValue: "L2000",
            currentValue: null,
            status: "removed",
          },
        ],
      },
    ],
    ...overrides,
  };
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

    test("fires the below-threshold banner when the alert is active", () => {
      render(
        <MarginReviewView
          comparison={makeComparison({
            belowThreshold: true,
            alertActive: true,
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

    test("hides the banner when below threshold but absorbed (alert not active)", () => {
      render(
        <MarginReviewView
          comparison={makeComparison({
            belowThreshold: true,
            alertActive: false,
            absorbedMarginPct: 20,
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

      expect(screen.queryByText(BELOW_THRESHOLD_TITLE)).not.toBeInTheDocument();
    });
  });

  describe("absorb sign-off", () => {
    const SIGN_OFF = {
      byLabel: "director@iteco.it",
      at: new Date("2026-06-01T09:00:00Z"),
      marginPct: 22.5,
      note: "Cliente strategico",
    };

    test("renders the sign-off (who / when / margin / note) even without an active alert", () => {
      render(
        <MarginReviewView
          comparison={makeComparison()}
          discountPct={0}
          absorb={{ signOff: SIGN_OFF }}
        />,
      );

      expect(
        screen.getByText(MSG.marginReview.signOffTitle),
      ).toBeInTheDocument();
      expect(screen.getByText(/director@iteco\.it/)).toBeInTheDocument();
      expect(screen.getByText(/Cliente strategico/)).toBeInTheDocument();
    });

    test("keeps the sign-off visible alongside a re-alert", () => {
      render(
        <MarginReviewView
          comparison={makeComparison({
            belowThreshold: true,
            alertActive: true,
            absorbedMarginPct: 22.5,
          })}
          discountPct={0}
          absorb={{ signOff: SIGN_OFF }}
        />,
      );

      expect(screen.getByText(BELOW_THRESHOLD_TITLE)).toBeInTheDocument();
      expect(
        screen.getByText(MSG.marginReview.signOffTitle),
      ).toBeInTheDocument();
    });

    test("omits the sign-off block when no decision was recorded", () => {
      render(
        <MarginReviewView
          comparison={makeComparison()}
          discountPct={0}
          absorb={{ signOff: null }}
        />,
      );

      expect(
        screen.queryByText(MSG.marginReview.signOffTitle),
      ).not.toBeInTheDocument();
    });
  });

  describe("as-sold freeze indicator", () => {
    test("renders the frozen-as-sold note when asSoldFrozenAt is set", () => {
      render(
        <MarginReviewView
          comparison={makeComparison()}
          discountPct={0}
          asSoldFrozenAt={new Date("2026-01-15T10:30:00Z")}
        />,
      );

      expect(
        screen.getByText(/Configurazione congelata come venduta il/),
      ).toBeInTheDocument();
    });

    test("omits the note when asSoldFrozenAt is null/undefined", () => {
      render(
        <MarginReviewView
          comparison={makeComparison()}
          discountPct={0}
          asSoldFrozenAt={null}
        />,
      );

      expect(
        screen.queryByText(/Configurazione congelata come venduta il/),
      ).not.toBeInTheDocument();
    });
  });

  describe("as-sold drift diff card", () => {
    const FROZEN_AT = new Date("2026-01-15T10:30:00Z");

    test("renders sections, values and status badges alongside the freeze note", () => {
      render(
        <MarginReviewView
          comparison={makeComparison()}
          discountPct={0}
          asSoldFrozenAt={FROZEN_AT}
          asSoldDiff={makeAsSoldDiff()}
        />,
      );

      expect(
        screen.getByText(MSG.marginReview.asSoldDiffTitle),
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Configurazione congelata come venduta il/),
      ).toBeInTheDocument();

      expect(screen.getByText("Spazzole")).toBeInTheDocument();
      const changedRow = screen
        .getByText("Numero di spazzole")
        .closest("tr") as HTMLElement;
      expect(within(changedRow).getByText("2")).toBeInTheDocument();
      expect(within(changedRow).getByText("3")).toBeInTheDocument();
      expect(within(changedRow).getByText("Modificato")).toBeInTheDocument();

      expect(screen.getByText("Serbatoio 1 (rimosso)")).toBeInTheDocument();
      const removedRow = screen
        .getByText("Tipo di serbatoio")
        .closest("tr") as HTMLElement;
      expect(within(removedRow).getByText("L2000")).toBeInTheDocument();
      expect(within(removedRow).getByText("—")).toBeInTheDocument();
      expect(within(removedRow).getByText("Rimosso")).toBeInTheDocument();
    });

    test("shows the empty state when there is no drift", () => {
      render(
        <MarginReviewView
          comparison={makeComparison()}
          discountPct={0}
          asSoldFrozenAt={FROZEN_AT}
          asSoldDiff={makeAsSoldDiff({ hasChanges: false, sections: [] })}
        />,
      );

      expect(
        screen.getByText(MSG.marginReview.asSoldNoChanges),
      ).toBeInTheDocument();
    });

    test("shows the unavailable message when the snapshot cannot be compared", () => {
      render(
        <MarginReviewView
          comparison={makeComparison()}
          discountPct={0}
          asSoldFrozenAt={FROZEN_AT}
          asSoldDiff={null}
          asSoldDiffUnavailable
        />,
      );

      expect(
        screen.getByText(MSG.marginReview.asSoldDiffUnavailable),
      ).toBeInTheDocument();
    });

    test("omits the card entirely when there is no as-sold freeze", () => {
      render(
        <MarginReviewView
          comparison={makeComparison()}
          discountPct={0}
          asSoldFrozenAt={null}
          asSoldDiff={null}
        />,
      );

      expect(
        screen.queryByText(MSG.marginReview.asSoldDiffTitle),
      ).not.toBeInTheDocument();
    });

    test("pins the configuration-drift wording of title and empty state", () => {
      render(
        <MarginReviewView
          comparison={makeComparison()}
          discountPct={0}
          asSoldFrozenAt={FROZEN_AT}
          asSoldDiff={makeAsSoldDiff({ hasChanges: false, sections: [] })}
        />,
      );

      expect(
        screen.getByText("Variazioni di configurazione rispetto al venduto"),
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          "Nessuna variazione di configurazione rispetto al venduto.",
        ),
      ).toBeInTheDocument();
    });
  });

  describe("BOM line diff card", () => {
    const FROZEN_AT = new Date("2026-01-15T10:30:00Z");

    test("renders added and removed rows with costs, delta and status badges", () => {
      render(
        <MarginReviewView
          comparison={makeComparison({
            lineDiff: [
              makeLineDiffRow({
                pn: "PN-ADD",
                offerQty: null,
                ebomQty: 2,
                offerCost: 0,
                ebomCost: 80,
                costDelta: 80,
                costChanged: false,
                status: "added",
              }),
              makeLineDiffRow({
                pn: "PN-REM",
                offerQty: 3,
                ebomQty: null,
                offerCost: 120,
                ebomCost: 0,
                costDelta: -120,
                costChanged: false,
                status: "removed",
              }),
            ],
          })}
          discountPct={0}
          asSoldFrozenAt={FROZEN_AT}
          asSoldDiff={makeAsSoldDiff()}
        />,
      );

      expect(
        screen.getByText(MSG.marginReview.lineDiffTitleFrozen),
      ).toBeInTheDocument();

      const addedRow = screen.getByText("PN-ADD").closest("tr") as HTMLElement;
      expect(within(addedRow).getByText("desc PN-ADD")).toBeInTheDocument();
      expect(within(addedRow).getByText("2")).toBeInTheDocument();
      expect(within(addedRow).getByText(eur(0))).toBeInTheDocument();
      expect(within(addedRow).getByText(eur(80))).toBeInTheDocument();
      expect(within(addedRow).getByText(delta(80))).toBeInTheDocument();
      expect(within(addedRow).getByText("Aggiunto")).toBeInTheDocument();

      const removedRow = screen
        .getByText("PN-REM")
        .closest("tr") as HTMLElement;
      expect(within(removedRow).getByText("3")).toBeInTheDocument();
      expect(within(removedRow).getByText(eur(120))).toBeInTheDocument();
      expect(within(removedRow).getByText(delta(-120))).toBeInTheDocument();
      expect(within(removedRow).getByText("Rimosso")).toBeInTheDocument();
    });

    test("distinguishes a qty change from a pure cost change", () => {
      render(
        <MarginReviewView
          comparison={makeComparison({
            lineDiff: [
              makeLineDiffRow({
                pn: "PN-QTY",
                offerQty: 2,
                ebomQty: 3,
                qtyChanged: true,
                costChanged: true,
              }),
              makeLineDiffRow({ pn: "PN-COST", offerQty: 5, ebomQty: 5 }),
            ],
          })}
          discountPct={0}
        />,
      );

      const qtyRow = screen.getByText("PN-QTY").closest("tr") as HTMLElement;
      expect(within(qtyRow).getByText("2 → 3")).toBeInTheDocument();
      expect(within(qtyRow).getByText("Q.tà modificata")).toBeInTheDocument();

      const costRow = screen.getByText("PN-COST").closest("tr") as HTMLElement;
      expect(within(costRow).getByText("5")).toBeInTheDocument();
      expect(within(costRow).queryByText(/→/)).not.toBeInTheDocument();
      expect(within(costRow).getByText("Costo aggiornato")).toBeInTheDocument();
    });

    test("filters out unchanged rows", () => {
      render(
        <MarginReviewView
          comparison={makeComparison({
            lineDiff: [
              makeLineDiffRow({ pn: "PN-CHANGED" }),
              makeLineDiffRow({
                pn: "PN-SAME",
                offerCost: 100,
                ebomCost: 100,
                costDelta: 0,
                costChanged: false,
                status: "unchanged",
              }),
            ],
          })}
          discountPct={0}
        />,
      );

      expect(screen.getByText("PN-CHANGED")).toBeInTheDocument();
      expect(screen.queryByText("PN-SAME")).not.toBeInTheDocument();
    });

    test("shows the as-sold empty state when nothing drifted after the freeze", () => {
      render(
        <MarginReviewView
          comparison={makeComparison()}
          discountPct={0}
          asSoldFrozenAt={FROZEN_AT}
          asSoldDiff={makeAsSoldDiff({ hasChanges: false, sections: [] })}
        />,
      );

      expect(
        screen.getByText(MSG.marginReview.lineDiffNoChangesFrozen),
      ).toBeInTheDocument();
    });

    test("phrases title and empty state against the offer before the freeze", () => {
      render(
        <MarginReviewView
          comparison={makeComparison()}
          discountPct={0}
          asSoldFrozenAt={null}
        />,
      );

      expect(
        screen.getByText(MSG.marginReview.lineDiffTitleQuote),
      ).toBeInTheDocument();
      expect(
        screen.getByText(MSG.marginReview.lineDiffNoChangesQuote),
      ).toBeInTheDocument();
      expect(
        screen.queryByText(MSG.marginReview.lineDiffTitleFrozen),
      ).not.toBeInTheDocument();
    });

    test("omits the card entirely when there is no EBOM", () => {
      render(
        <MarginReviewView
          comparison={{
            ...makeNoEbomComparison(),
            lineDiff: [makeLineDiffRow({ pn: "PN-X" })],
          }}
          discountPct={0}
        />,
      );

      expect(
        screen.queryByText(MSG.marginReview.lineDiffTitleQuote),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByText(MSG.marginReview.lineDiffTitleFrozen),
      ).not.toBeInTheDocument();
      expect(screen.queryByText("PN-X")).not.toBeInTheDocument();
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
