import { isValidElement } from "react";
import { describe, expect, test, vi } from "vitest";

vi.mock("file-saver", () => ({ saveAs: vi.fn() }));

import {
  OfferPdfDocument,
  type OfferPdfMeta,
} from "@/app/offerte/[id]/create-offer-pdf-file";
import type {
  OfferExportLine,
  OfferRevisionExportData,
} from "@/lib/offer-export";
import type { OfferSummaryExtras } from "@/lib/offer-settings";
import { formatEur } from "@/lib/utils";
import type {
  OfferBomLineItem,
  OfferSurchargeItem,
} from "@/validation/offer/offer-pricing-schema";

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeBomItem(
  pn = "PN-001",
  qty = 2,
  overrides: Partial<OfferBomLineItem> = {},
): OfferBomLineItem {
  return {
    pn,
    description: `Desc ${pn}`,
    qty,
    coefficient: 3,
    list_price: 10,
    line_total: qty * 10,
    tag: null,
    category: "GENERAL",
    category_index: 0,
    ...overrides,
  };
}

function makeExtras(
  overrides: Partial<OfferSummaryExtras> = {},
): OfferSummaryExtras {
  return {
    transportRow: { label: "Trasporto: da definire", amount: null },
    installationRow: { label: "Installazione: da definire", amount: null },
    net_total: 500,
    hasNetAdjustments: false,
    ...overrides,
  };
}

function makeLine(overrides: Partial<OfferExportLine> = {}): OfferExportLine {
  return {
    title: "Pos. 1 — Config A",
    quantity: 1,
    unitListPrice: 500,
    data: {
      general: [
        {
          tag: "FRAME",
          label: "Struttura",
          total: 500,
          items: [makeBomItem("PN-001"), makeBomItem("PN-002", 1)],
        },
      ],
      waterTanks: [],
      washBays: [],
      total_list_price: 500,
      discounted_total: 500,
    },
    surcharges: [],
    ...overrides,
  };
}

function makeData(
  overrides: Partial<OfferRevisionExportData> = {},
): OfferRevisionExportData {
  return {
    offerNumber: "OFF-1",
    customerName: "ACME Trasporti",
    customerAddress: "Via Roma 1",
    customerEmail: "acme@example.com",
    revisionNo: 2,
    discountPct: 0,
    showPrices: true,
    lines: [makeLine()],
    totalListPrice: 500,
    discountedTotal: 500,
    extras: makeExtras(),
    ...overrides,
  };
}

function makeMeta(overrides: Partial<OfferPdfMeta> = {}): OfferPdfMeta {
  return {
    offerNumber: "OFF-1",
    customerName: "ACME Trasporti",
    generatedAt: "01/02/2026, 10:30",
    generatorInitials: "SL",
    ...overrides,
  };
}

/**
 * Walks the React element tree of the PDF document, invoking function
 * components and concatenating every string/number leaf. react-pdf
 * primitives (Document, Page, Text, ...) are plain string types, so only
 * our own function components are expanded.
 */
function collectText(node: unknown, out: string[]): void {
  if (node == null || typeof node === "boolean") return;
  if (typeof node === "string" || typeof node === "number") {
    out.push(String(node));
    return;
  }
  if (Array.isArray(node)) {
    for (const child of node) collectText(child, out);
    return;
  }
  if (isValidElement(node)) {
    const { type, props } = node as React.ReactElement<{
      children?: React.ReactNode;
    }>;
    if (typeof type === "function") {
      collectText((type as (p: unknown) => React.ReactNode)(props), out);
      return;
    }
    collectText(props.children, out);
  }
}

function renderText(data: OfferRevisionExportData, meta = makeMeta()): string {
  const out: string[] = [];
  collectText(OfferPdfDocument({ data, meta }), out);
  return out.join("");
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe("OfferPdfDocument", () => {
  test("renders header, line titles and item descriptions", () => {
    const data = makeData({
      lines: [
        makeLine({ title: "Pos. 1 — Config A" }),
        makeLine({ title: "Pos. 2 — Config B" }),
      ],
    });
    const text = renderText(data);
    expect(text).toContain("Offerta OFF-1");
    expect(text).toContain("Revisione 2");
    expect(text).toContain("ACME Trasporti");
    expect(text).toContain("Pos. 1 — Config A");
    expect(text).toContain("Pos. 2 — Config B");
    expect(text).toContain("Struttura");
    expect(text).toContain("Desc PN-001");
  });

  test("renders water tank, wash bay and surcharge sections", () => {
    const surcharges: OfferSurchargeItem[] = [
      {
        surcharge_kind: "HEIGHT",
        description: "Sovracosto altezza",
        qty: 1,
        amount: 500,
        line_total: 500,
      },
    ];
    const line = makeLine({
      data: {
        general: [],
        waterTanks: [{ index: 0, total: 120, items: [makeBomItem("WT-1")] }],
        washBays: [{ index: 0, total: 80, items: [makeBomItem("WB-1")] }],
        total_list_price: 200,
        discounted_total: 200,
      },
      surcharges,
    });
    const text = renderText(makeData({ lines: [line] }));
    expect(text).toContain("Serbatoio 1");
    expect(text).toContain("Pista 1");
    expect(text).toContain("Maggiorazioni");
    expect(text).toContain("Sovracosto altezza");
  });

  test("renders the discount and net-total riepilogo", () => {
    const data = makeData({
      discountPct: 10,
      totalListPrice: 500,
      discountedTotal: 450,
      extras: makeExtras({
        transportRow: { label: "Trasporto a parte", amount: 300 },
        net_total: 750,
        hasNetAdjustments: true,
      }),
    });
    const text = renderText(data);
    expect(text).toContain("TOTALE LISTINO");
    expect(text).toContain("Sconto (10%)");
    expect(text).toContain("TOTALE SCONTATO");
    expect(text).toContain(formatEur(450));
    expect(text).toContain("Trasporto a parte");
    expect(text).toContain("TOTALE NETTO");
    expect(text).toContain(formatEur(750));
  });

  test("net-total-only mode hides prices but keeps the net total", () => {
    const data = makeData({
      showPrices: false,
      extras: makeExtras({ net_total: 500 }),
    });
    const text = renderText(data);
    expect(text).not.toContain("Prezzo Listino");
    expect(text).not.toContain("TOTALE LISTINO");
    expect(text).toContain("Desc PN-001");
    expect(text).toContain("TOTALE NETTO");
    expect(text).toContain(formatEur(500));
  });

  test("footer credits the exporting user's initials", () => {
    const text = renderText(makeData());
    expect(text).toContain("Generato il 01/02/2026, 10:30 da SL");
  });

  test("footer omits the author when initials are empty", () => {
    const text = renderText(makeData(), makeMeta({ generatorInitials: "" }));
    expect(text).toContain("Generato il 01/02/2026, 10:30");
    expect(text).not.toContain("10:30 da");
  });
});
