import {
  classifyMarginLineState,
  type LineMarginAlert,
  type MarginLineState,
} from "@/lib/margin-alerts";
import { TERMINAL_OUTCOME_STATUSES } from "@/lib/offer-renegotiation";
import {
  OfferStatusLabels,
  type OfferStatusType,
  OPEN_REVISION_STATUSES,
} from "@/types";

export type MarginOverviewRow = {
  lineId: number;
  configId: number;
  /** Zero-based position on the accepted revision; displayed 1-based. */
  position: number;
  state: MarginLineState;
  /** Live margin; null when the state is MARGIN_UNAVAILABLE. */
  marginPct: number | null;
  thresholdPct: number;
};

/**
 * The renegotiation affordance for the hub: an enabled button, an
 * already-open renegotiation to point at, or nothing.
 */
export type RenegotiationHubState =
  | { kind: "available" }
  | { kind: "open"; revisionNo: number; statusLabel: string }
  | { kind: "none" };

/** The line shape the overview rows need (a superset ships from the page). */
type HubLine = {
  id: number;
  position: number;
  configuration: { id: number };
};

/**
 * The in-force accepted revision to drive the margin hub, or null. Two gates in
 * one place:
 * - **Role gate** — null unless the viewer may see margin data (`canSeeMargin`),
 *   so margin figures are never computed or surfaced for unauthorized roles.
 * - **Superseded-safe selection** — matches on `accepted_revision_id`, never on
 *   `status === "ACCEPTED"`. After a renegotiation re-acceptance the prior
 *   revision keeps ACCEPTED status; only the one `accepted_revision_id` points at
 *   is in force.
 */
export function marginHubAcceptedRevision<R extends { id: number }>(
  canSeeMargin: boolean,
  revisions: R[],
  acceptedRevisionId: number | null,
): R | null {
  if (!canSeeMargin || acceptedRevisionId === null) return null;
  return revisions.find((rev) => rev.id === acceptedRevisionId) ?? null;
}

/**
 * One hub row per accepted-revision line, each with an explicit margin state.
 * Returns [] when there is no in-force accepted revision (gated / unauthorized).
 * Never surfaces the phantom 100% of a missing EBOM as a number — a line without
 * a real EBOM classifies as MARGIN_UNAVAILABLE with a null `marginPct`.
 */
export function buildMarginOverviewRows(
  acceptedRevision: { lines: HubLine[] } | null,
  alerts: Map<number, LineMarginAlert>,
): MarginOverviewRow[] {
  if (!acceptedRevision) return [];
  return acceptedRevision.lines.map((line) => {
    const alert = alerts.get(line.id);
    return {
      lineId: line.id,
      configId: line.configuration.id,
      position: line.position,
      state: classifyMarginLineState(alert),
      marginPct: alert?.hasEbom ? alert.marginPct : null,
      thresholdPct: alert?.thresholdPct ?? 0,
    };
  });
}

/**
 * The hub's renegotiation affordance: an enabled "renegotiate" button when
 * management may open one (`canRenegotiate` — accepted, no open working
 * revision, role, and at least one active margin alert), otherwise a read-only
 * note about the renegotiation already in progress (an open working revision on
 * an accepted offer), otherwise nothing. The two non-none arms are mutually
 * exclusive by construction: `canRenegotiate` requires a *non-open* working
 * revision, while the "open" arm requires an open one.
 */
export function deriveRenegotiationHubState(
  canRenegotiate: boolean,
  workingRevision: { revision_no: number; status: OfferStatusType } | undefined,
  workingIsRenegotiation: boolean,
): RenegotiationHubState {
  if (canRenegotiate) return { kind: "available" };
  if (
    workingIsRenegotiation &&
    workingRevision &&
    OPEN_REVISION_STATUSES.includes(workingRevision.status)
  ) {
    return {
      kind: "open",
      revisionNo: workingRevision.revision_no,
      statusLabel: OfferStatusLabels[workingRevision.status],
    };
  }
  return { kind: "none" };
}

/**
 * The projected (working-revision) margin overview shown behind the hub's
 * revision selector, next to the in-force accepted rows.
 */
export type ProjectedMarginOverview = {
  /** The working (renegotiation) revision's number. */
  revisionNo: number;
  /** Localized status label of the working revision (e.g. "Bozza", "Inviata"). */
  statusLabel: string;
  rows: MarginOverviewRow[];
};

/**
 * Whether the working revision is a *live* renegotiation whose margins are worth
 * projecting next to the accepted baseline: a renegotiation (derived), not the
 * in-force accepted revision itself (an accepted renegotiation *became* the
 * baseline), and not past a terminal customer outcome (a REJECTED/EXPIRED
 * proposal is dead). The page uses this to decide whether to compute projected
 * alerts at all — so the extra EBOM query only runs when the selector will show.
 */
export function hasProjectableRenegotiation(
  workingRevision: { id: number; status: OfferStatusType } | undefined,
  acceptedRevisionId: number | null,
  workingIsRenegotiation: boolean,
): boolean {
  return (
    !!workingRevision &&
    workingIsRenegotiation &&
    workingRevision.id !== acceptedRevisionId &&
    !TERMINAL_OUTCOME_STATUSES.includes(workingRevision.status)
  );
}

/**
 * Assembles the projected overview from the working revision and its projected
 * alerts (computed via `computeLineMarginAlerts(..., { requireFrozen: false })`).
 * Rows reuse {@link buildMarginOverviewRows}, so a draft line with no EBOM still
 * classifies as MARGIN_UNAVAILABLE rather than a phantom 100%. Call only when
 * {@link hasProjectableRenegotiation} is true.
 */
export function buildProjectedMarginOverview(
  workingRevision: {
    revision_no: number;
    status: OfferStatusType;
    lines: HubLine[];
  },
  alerts: Map<number, LineMarginAlert>,
): ProjectedMarginOverview {
  return {
    revisionNo: workingRevision.revision_no,
    statusLabel: OfferStatusLabels[workingRevision.status],
    rows: buildMarginOverviewRows(workingRevision, alerts),
  };
}
