// @vitest-environment jsdom

import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, test, vi } from "vitest";
import { MSG } from "@/lib/messages";
import { formatPct } from "@/lib/money";

// The absorb / renegotiate buttons import server actions, which transitively
// pull in the db client (throws without DATABASE_URL in jsdom) — mock them.
vi.mock("@/app/actions/margin-absorb-actions", () => ({
  absorbLineMarginAction: vi.fn(),
}));
vi.mock("@/app/actions/offer-revision-actions", () => ({
  createRenegotiationRevisionAction: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}));

import OfferMarginOverview, {
  type MarginOverviewRow,
  type ProjectedMarginOverview,
  type RenegotiationHubState,
} from "./offer-margin-overview";

const normSpaces = (s: string) => s.replace(/\s+/g, " ");

/** One row per margin state, in the five-state order. */
function makeRows(): MarginOverviewRow[] {
  return [
    {
      lineId: 1,
      configId: 101,
      position: 0,
      state: "ABOVE_THRESHOLD",
      marginPct: 45,
      thresholdPct: 30,
    },
    {
      lineId: 2,
      configId: 102,
      position: 1,
      state: "BELOW_THRESHOLD",
      marginPct: 20,
      thresholdPct: 30,
    },
    {
      lineId: 3,
      configId: 103,
      position: 2,
      state: "ABSORBED",
      marginPct: 25,
      thresholdPct: 30,
    },
    {
      lineId: 4,
      configId: 104,
      position: 3,
      state: "ABSORBED_ERODED",
      marginPct: 15,
      thresholdPct: 30,
    },
    {
      lineId: 5,
      configId: 105,
      position: 4,
      state: "MARGIN_UNAVAILABLE",
      marginPct: null,
      thresholdPct: 0,
    },
  ];
}

/** Two projected (working-revision) rows: one healthy, one below threshold. */
function makeProjectedRows(): MarginOverviewRow[] {
  return [
    {
      lineId: 11,
      configId: 201,
      position: 0,
      state: "ABOVE_THRESHOLD",
      marginPct: 34,
      thresholdPct: 30,
    },
    {
      lineId: 12,
      configId: 202,
      position: 1,
      state: "BELOW_THRESHOLD",
      marginPct: 22,
      thresholdPct: 30,
    },
  ];
}

function makeProjected(
  overrides: Partial<ProjectedMarginOverview> = {},
): ProjectedMarginOverview {
  return {
    revisionNo: 3,
    statusLabel: "Bozza",
    rows: makeProjectedRows(),
    ...overrides,
  };
}

function renderOverview(
  overrides: {
    rows?: MarginOverviewRow[];
    projected?: ProjectedMarginOverview | null;
    renegotiation?: RenegotiationHubState;
  } = {},
) {
  return render(
    <OfferMarginOverview
      offerId={7}
      acceptedRevisionNo={2}
      rows={overrides.rows ?? makeRows()}
      projected={overrides.projected ?? null}
      renegotiation={overrides.renegotiation ?? { kind: "none" }}
    />,
  );
}

/** The <tr> whose first cell is the label for a 1-based position. */
function rowFor(position1Based: number): HTMLElement {
  const cell = screen.getByText(MSG.marginReview.lineLabel(position1Based));
  const tr = cell.closest("tr");
  if (!tr) throw new Error(`No row for position ${position1Based}`);
  return tr as HTMLElement;
}

afterEach(() => {
  cleanup();
});

describe("OfferMarginOverview", () => {
  test("renders one row per line with its explicit state badge", () => {
    renderOverview();

    expect(
      screen.getByText(MSG.marginReview.state.aboveThreshold),
    ).toBeInTheDocument();
    expect(
      screen.getByText(MSG.marginReview.state.belowThreshold),
    ).toBeInTheDocument();
    expect(
      screen.getByText(MSG.marginReview.state.absorbed),
    ).toBeInTheDocument();
    expect(
      screen.getByText(MSG.marginReview.state.absorbedEroded),
    ).toBeInTheDocument();
    expect(
      screen.getByText(MSG.marginReview.state.unavailable),
    ).toBeInTheDocument();
  });

  test("shows the live margin for priced lines and an em dash for unavailable", () => {
    renderOverview();

    expect(
      within(rowFor(1)).getByText(
        (t) => normSpaces(t) === normSpaces(formatPct(45)),
      ),
    ).toBeInTheDocument();
    // The unavailable line shows a dash, never a phantom 100%.
    expect(within(rowFor(5)).getByText("—")).toBeInTheDocument();
    expect(within(rowFor(5)).queryByText(/%/)).not.toBeInTheDocument();
  });

  test("links every line to its config-keyed analysis page", () => {
    renderOverview();

    const analyze = screen.getAllByRole("link", {
      name: MSG.marginReview.analyzeLink,
    });
    expect(analyze).toHaveLength(5);
    expect(within(rowFor(2)).getByRole("link")).toHaveAttribute(
      "href",
      "/configurazioni/marginalita/102",
    );
  });

  test("offers absorb only on the two decision-required rows", () => {
    renderOverview();

    const absorbButtons = screen.getAllByRole("button", {
      name: MSG.marginReview.absorbButton,
    });
    expect(absorbButtons).toHaveLength(2);
    expect(
      within(rowFor(2)).getByRole("button", {
        name: MSG.marginReview.absorbButton,
      }),
    ).toBeInTheDocument();
    expect(
      within(rowFor(4)).getByRole("button", {
        name: MSG.marginReview.absorbButton,
      }),
    ).toBeInTheDocument();
    // Above threshold / absorbed / unavailable rows carry no absorb affordance.
    expect(
      within(rowFor(1)).queryByRole("button", {
        name: MSG.marginReview.absorbButton,
      }),
    ).not.toBeInTheDocument();
  });

  test("shows the renegotiate button when renegotiation is available", () => {
    renderOverview({ renegotiation: { kind: "available" } });

    expect(
      screen.getByRole("button", { name: MSG.marginReview.renegotiateButton }),
    ).toBeInTheDocument();
  });

  test("shows the open-renegotiation info (number + status) instead of the button", () => {
    renderOverview({
      renegotiation: { kind: "open", revisionNo: 3, statusLabel: "Inviata" },
    });

    expect(
      screen.getByText(MSG.marginReview.renegotiationOpenDetail(3, "Inviata")),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", {
        name: MSG.marginReview.renegotiateButton,
      }),
    ).not.toBeInTheDocument();
  });

  test("shows no renegotiation affordance when kind is none", () => {
    renderOverview({ renegotiation: { kind: "none" } });

    expect(
      screen.queryByRole("button", {
        name: MSG.marginReview.renegotiateButton,
      }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(/Rinegoziazione in corso/),
    ).not.toBeInTheDocument();
  });

  test("renders the empty state and no table when there are no rows", () => {
    renderOverview({ rows: [] });

    expect(
      screen.getByText(MSG.marginReview.overviewEmpty),
    ).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });
});

describe("OfferMarginOverview — revision selector", () => {
  test("shows no selector, subtitle stays the accepted one, when there is no projection", () => {
    renderOverview();

    expect(
      screen.queryByRole("tab", { name: MSG.marginReview.selectorProjected }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText(MSG.marginReview.overviewSubtitle(2)),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(MSG.marginReview.projectedNote),
    ).not.toBeInTheDocument();
  });

  test("defaults to the projected view: loud subtitle, note, projected rows, no absorb", () => {
    renderOverview({ projected: makeProjected() });

    // Loud "not yet accepted" subtitle + projected note.
    expect(
      screen.getByText(MSG.marginReview.overviewSubtitleProjected(3)),
    ).toBeInTheDocument();
    expect(
      screen.getByText(MSG.marginReview.projectedNote),
    ).toBeInTheDocument();
    // The accepted subtitle is not shown while projecting.
    expect(
      screen.queryByText(MSG.marginReview.overviewSubtitle(2)),
    ).not.toBeInTheDocument();

    // The projected rows are shown; their Analizza link carries the working param.
    expect(within(rowFor(2)).getByRole("link")).toHaveAttribute(
      "href",
      "/configurazioni/marginalita/202?revision=working",
    );

    // Absorb never appears on a projection, even for the below-threshold row.
    expect(
      screen.queryByRole("button", { name: MSG.marginReview.absorbButton }),
    ).not.toBeInTheDocument();
  });

  test("switching to the accepted tab restores the accepted rows, absorb, and links", async () => {
    const user = userEvent.setup();
    renderOverview({ projected: makeProjected() });

    await user.click(
      screen.getByRole("tab", { name: MSG.marginReview.selectorAccepted }),
    );

    // Accepted subtitle + no projected note.
    expect(
      screen.getByText(MSG.marginReview.overviewSubtitle(2)),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(MSG.marginReview.projectedNote),
    ).not.toBeInTheDocument();

    // The two accepted decision-required rows regain their absorb button.
    expect(
      screen.getAllByRole("button", { name: MSG.marginReview.absorbButton }),
    ).toHaveLength(2);

    // Analizza links now carry the accepted param.
    expect(within(rowFor(2)).getByRole("link")).toHaveAttribute(
      "href",
      "/configurazioni/marginalita/102?revision=accepted",
    );
  });
});
