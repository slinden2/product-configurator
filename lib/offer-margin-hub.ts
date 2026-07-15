import {
  classifyMarginLineState,
  type LineMarginAlert,
  type MarginLineState,
} from "@/lib/margin-alerts";
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
