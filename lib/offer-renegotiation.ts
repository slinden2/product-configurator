/**
 * Renegotiation derivation (#85).
 *
 * A renegotiation revision is any revision created after the offer's first
 * acceptance: a post-acceptance, commercial-only revision whose lines reference
 * the current engineering configurations read-only instead of deep-cloning them.
 * Renegotiation-ness is derived, never stored.
 *
 * The anchor is the at-acceptance as-sold freeze: `as_sold_frozen_at` is written
 * exactly when a revision is accepted and never cleared, so the minimum
 * `revision_no` among revisions carrying a frozen line marks the first
 * acceptance. Anchoring on `offers.accepted_revision_id` instead would mislabel
 * history after a re-acceptance (a rejected renegotiation sitting between two
 * acceptances would stop deriving as renegotiation once the pointer moves).
 */

import type { OfferStatusType } from "@/types";

/**
 * Terminal customer outcomes of a revision. A renegotiation that has reached
 * one of these is no longer in flight: ACCEPTED became the new baseline, while
 * REJECTED/EXPIRED are dead proposals (the margin decision point returns).
 */
export const TERMINAL_OUTCOME_STATUSES: OfferStatusType[] = [
  "ACCEPTED",
  "REJECTED",
  "EXPIRED",
];

interface RevisionForDerivation {
  revision_no: number;
  lines: { as_sold_frozen_at: Date | null }[];
}

interface RevisionForInFlightCheck extends RevisionForDerivation {
  status: OfferStatusType;
}

/**
 * `revision_no` of the first-accepted revision — the minimum `revision_no` among
 * revisions with at least one as-sold-frozen line — or `null` before the first
 * acceptance.
 */
export function firstAcceptedRevisionNo(
  revisions: RevisionForDerivation[],
): number | null {
  const frozen = revisions
    .filter((rev) => rev.lines.some((line) => line.as_sold_frozen_at !== null))
    .map((rev) => rev.revision_no);
  return frozen.length > 0 ? Math.min(...frozen) : null;
}

/**
 * A revision is a renegotiation revision iff it was created after the first
 * acceptance, i.e. its `revision_no` is greater than
 * {@link firstAcceptedRevisionNo}.
 */
export function isRenegotiationRevision(
  revisionNo: number,
  firstAcceptedNo: number | null,
): boolean {
  return firstAcceptedNo !== null && revisionNo > firstAcceptedNo;
}

/**
 * Whether the offer has a renegotiation **in flight**: its working revision
 * (the highest `revision_no`) derives as a renegotiation and has not reached a
 * terminal customer outcome. Deliberately wider than `OPEN_REVISION_STATUSES`
 * — a SENT renegotiation is still pending the customer's answer. Absorb and
 * renegotiate are the two branches of one margin decision point, so while this
 * is true the absorb sign-off is suspended; it returns when the renegotiation
 * is discarded, rejected or expires (on re-acceptance the baseline resets
 * instead).
 */
export function hasRenegotiationInFlight(
  revisions: RevisionForInFlightCheck[],
): boolean {
  if (revisions.length === 0) return false;
  const working = revisions.reduce((latest, rev) =>
    rev.revision_no > latest.revision_no ? rev : latest,
  );
  return (
    isRenegotiationRevision(
      working.revision_no,
      firstAcceptedRevisionNo(revisions),
    ) && !TERMINAL_OUTCOME_STATUSES.includes(working.status)
  );
}
