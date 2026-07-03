import { describe, expect, it } from "vitest";
import {
  firstAcceptedRevisionNo,
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
});
