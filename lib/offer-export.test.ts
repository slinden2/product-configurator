// @vitest-environment node
import { describe, expect, test, vi } from "vitest";

// lib/offer (imported transitively by the builder) pulls in @/db/queries and
// @/lib/BOM at module load; the builder itself only uses the pure display
// helpers, so stub the DB-backed modules to avoid the env-gated db/index import.
vi.mock("@/db/queries", () => ({ getPriceCoefficientsByArray: vi.fn() }));
vi.mock("@/lib/BOM", () => ({
  enrichWithCosts: vi.fn(),
  BOM: { init: vi.fn() },
}));

import type { OfferWithRevisionAndLines } from "@/db/queries";
import { buildOfferRevisionExportData } from "@/lib/offer-export";
import {
  localIsoDate,
  offerExportFilenameStem,
} from "@/lib/offer-export-filename";
import type { OfferLineItem } from "@/validation/offer/offer-pricing-schema";

type Revision = OfferWithRevisionAndLines["revisions"][number];
type Line = Revision["lines"][number];

function makeSnapshot(listPrice: number): OfferLineItem[] {
  return [
    {
      pn: "PN-1",
      description: "Telaio",
      qty: 1,
      coefficient: 1,
      list_price: listPrice,
      line_total: listPrice,
      tag: "FRAME",
      category: "GENERAL",
      category_index: 0,
    },
  ];
}

function makeLine(overrides: Partial<Line>): Line {
  return {
    id: 1,
    offer_revision_id: 1,
    configuration_id: 1,
    position: 0,
    quantity: 1,
    list_price: "100",
    net_price: "100",
    pricing_snapshot: makeSnapshot(100),
    configuration: {
      id: 1,
      name: "Config A",
      status: "DRAFT",
      origin: "OFFER",
    },
    ...overrides,
  } as unknown as Line;
}

function makeRevision(lines: Line[]): Revision {
  return {
    revision_no: 3,
    discount_pct: "0",
    transport_amount: "0",
    transport_mode: "TBD",
    installation_mode: "TBD",
    installation_items: [],
    show_net_total_only: false,
    lines,
  } as unknown as Revision;
}

const offer = {
  offer_number: "OFF-7",
  customer_name: "ACME",
  customer_address: "Via Roma 1",
  customer_email: "acme@example.com",
};

describe("buildOfferRevisionExportData", () => {
  test("renders one export line per snapshot line with a positional title", () => {
    const revision = makeRevision([
      makeLine({
        position: 0,
        configuration: {
          id: 1,
          name: "Config A",
          status: "DRAFT",
          origin: "OFFER",
        },
      }),
      makeLine({
        position: 1,
        configuration: {
          id: 2,
          name: "Config B",
          status: "DRAFT",
          origin: "OFFER",
        },
      }),
    ]);
    const data = buildOfferRevisionExportData(offer, revision);
    expect(data.lines.map((l) => l.title)).toEqual([
      "Pos. 1 — ACME",
      "Pos. 2 — ACME",
    ]);
    expect(data.offerNumber).toBe("OFF-7");
    expect(data.revisionNo).toBe(3);
  });

  test("sums offer totals from stored per-unit prices × quantity", () => {
    const revision = makeRevision([
      makeLine({ list_price: "100", net_price: "90", quantity: 2 }),
      makeLine({ list_price: "200", net_price: "180", quantity: 1 }),
    ]);
    const data = buildOfferRevisionExportData(offer, revision);
    expect(data.totalListPrice).toBe(400); // 100*2 + 200*1
    expect(data.discountedTotal).toBe(360); // 90*2 + 180*1
  });

  test("skips lines without a snapshot but still counts them in totals", () => {
    const revision = makeRevision([
      makeLine({ list_price: "100", net_price: "100" }),
      makeLine({ pricing_snapshot: null, list_price: "50", net_price: "50" }),
    ]);
    const data = buildOfferRevisionExportData(offer, revision);
    expect(data.lines).toHaveLength(1);
    expect(data.totalListPrice).toBe(150);
  });
});

describe("offerExportFilenameStem", () => {
  test("combines offer number, revision and date", () => {
    const data = buildOfferRevisionExportData(
      offer,
      makeRevision([makeLine({})]),
    );
    expect(offerExportFilenameStem(data, "2026-06-30")).toBe(
      "Offerta_OFF-7_Rev3_2026-06-30",
    );
  });
});

describe("localIsoDate", () => {
  test("formats the local date with zero-padded month and day", () => {
    expect(localIsoDate(new Date(2026, 5, 3, 0, 30))).toBe("2026-06-03");
  });
});
