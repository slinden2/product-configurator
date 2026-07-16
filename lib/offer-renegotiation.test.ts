import { describe, expect, it } from "vitest";
import type { OfferStatusType } from "@/types";
import {
  firstAcceptedRevisionNo,
  hasRenegotiationInFlight,
  isRenegotiationRevision,
} from "./offer-renegotiation";

function rev(revisionNo: number, frozen: boolean[]) {
  return {
    revision_no: revisionNo,
    lines: frozen.map((f) => ({
      as_sold_frozen_at: f ? new Date("2026-01-15T10:00:00Z") : null,
    })),
  };
}

function revWithStatus(
  revisionNo: number,
  status: OfferStatusType,
  frozen: boolean[],
) {
  return { ...rev(revisionNo, frozen), status };
}

describe("firstAcceptedRevisionNo", () => {
  it("returns null when no revision has frozen lines", () => {
    expect(firstAcceptedRevisionNo([])).toBeNull();
    expect(
      firstAcceptedRevisionNo([rev(1, [false, false]), rev(2, [false])]),
    ).toBeNull();
  });

  it("returns the revision_no of the single accepted revision", () => {
    expect(
      firstAcceptedRevisionNo([rev(1, [false]), rev(2, [true, true])]),
    ).toBe(2);
  });

  it("anchors on the first acceptance after a re-acceptance", () => {
    // Rev 1 accepted, rev 2 renegotiation rejected (never frozen), rev 3
    // renegotiation re-accepted: the anchor stays at rev 1.
    expect(
      firstAcceptedRevisionNo([
        rev(1, [true]),
        rev(2, [false]),
        rev(3, [true]),
      ]),
    ).toBe(1);
  });

  it("is order-independent (works on desc-ordered revision lists)", () => {
    expect(
      firstAcceptedRevisionNo([
        rev(3, [true]),
        rev(2, [false]),
        rev(1, [true]),
      ]),
    ).toBe(1);
  });
});

describe("isRenegotiationRevision", () => {
  it("is false for every revision before the first acceptance", () => {
    expect(isRenegotiationRevision(1, null)).toBe(false);
    expect(isRenegotiationRevision(5, null)).toBe(false);
  });

  it("is false for the accepted revision and earlier ones", () => {
    expect(isRenegotiationRevision(1, 2)).toBe(false);
    expect(isRenegotiationRevision(2, 2)).toBe(false);
  });

  it("is true for every revision created after the first acceptance", () => {
    expect(isRenegotiationRevision(3, 2)).toBe(true);
    // A rejected renegotiation between two acceptances still derives as one.
    expect(isRenegotiationRevision(2, 1)).toBe(true);
  });

  // workflow.md: "Renegotiation-ness is derived, never stored" — the whole
  // derivation is this one comparison against the first-acceptance anchor.
  // Exhaustive sweep over revision numbers × anchors so no boundary is sampled.
  describe("exhaustive revisionNo × anchor sweep", () => {
    const REVISION_NOS = [1, 2, 3, 4, 5, 6];
    const ANCHORS = [null, 1, 2, 3, 4, 5, 6];

    const cells = REVISION_NOS.flatMap((no) =>
      ANCHORS.map(
        (anchor) => [no, anchor, anchor !== null && no > anchor] as const,
      ),
    );

    it.each(
      cells,
    )("isRenegotiationRevision(%s, anchor=%s) → %s", (no, anchor, expected) => {
      expect(isRenegotiationRevision(no, anchor)).toBe(expected);
    });
  });
});

describe("hasRenegotiationInFlight", () => {
  it("is false with no revisions", () => {
    expect(hasRenegotiationInFlight([])).toBe(false);
  });

  it("is false pre-acceptance, whatever the working status", () => {
    // Working revisions before any acceptance are normal working copies /
    // sent quotes, never renegotiations.
    expect(hasRenegotiationInFlight([revWithStatus(1, "DRAFT", [false])])).toBe(
      false,
    );
    expect(
      hasRenegotiationInFlight([
        revWithStatus(1, "SENT", [false]),
        revWithStatus(2, "DRAFT", [false]),
      ]),
    ).toBe(false);
  });

  it("is false when the working revision is the accepted one itself", () => {
    expect(
      hasRenegotiationInFlight([
        revWithStatus(1, "SENT", [false]),
        revWithStatus(2, "ACCEPTED", [true]),
      ]),
    ).toBe(false);
  });

  it.each([
    "DRAFT",
    "PENDING_APPROVAL",
    "APPROVED_TO_SEND",
    "SENT",
  ] as OfferStatusType[])("is true for a %s renegotiation — SENT is still pending the customer", (status) => {
    expect(
      hasRenegotiationInFlight([
        revWithStatus(1, "ACCEPTED", [true]),
        revWithStatus(2, status, [false]),
      ]),
    ).toBe(true);
  });

  it.each([
    "REJECTED",
    "EXPIRED",
  ] as OfferStatusType[])("is false once the renegotiation is %s (the decision point returns)", (status) => {
    expect(
      hasRenegotiationInFlight([
        revWithStatus(1, "ACCEPTED", [true]),
        revWithStatus(2, status, [false]),
      ]),
    ).toBe(false);
  });

  it("is false after a re-acceptance (the renegotiation became the baseline)", () => {
    expect(
      hasRenegotiationInFlight([
        revWithStatus(1, "ACCEPTED", [true]),
        revWithStatus(2, "ACCEPTED", [true]),
      ]),
    ).toBe(false);
  });

  it("keys on the working (highest-numbered) revision, order-independently", () => {
    // A rejected renegotiation sitting between the acceptance and the working
    // draft must not mask the in-flight one — and vice versa.
    const inFlight = [
      revWithStatus(3, "DRAFT", [false]),
      revWithStatus(2, "REJECTED", [false]),
      revWithStatus(1, "ACCEPTED", [true]),
    ];
    expect(hasRenegotiationInFlight(inFlight)).toBe(true);
    expect(hasRenegotiationInFlight([...inFlight].reverse())).toBe(true);
  });
});
