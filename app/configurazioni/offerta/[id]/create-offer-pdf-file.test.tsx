import { isValidElement } from "react";
import { describe, expect, test, vi } from "vitest";

vi.mock("file-saver", () => ({ saveAs: vi.fn() }));

import { renderToBuffer } from "@react-pdf/renderer";
import type { ExportOfferData } from "@/app/configurazioni/offerta/[id]/create-offer-excel-file";
import {
  OfferPdfDocument,
  type OfferPdfMeta,
} from "@/app/configurazioni/offerta/[id]/create-offer-pdf-file";
import { formatEur } from "@/lib/utils";

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeMeta(overrides: Partial<OfferPdfMeta> = {}): OfferPdfMeta {
  return {
    confId: 12,
    clientName: "ACME Trasporti",
    generatedAt: "01/02/2026, 10:30",
    generatorEmail: "sales@iteco.it",
    sourceLabel: "distinta di commessa",
    ...overrides,
  };
}

function makeItem(pn = "PN-001", qty = 2) {
  return {
    pn,
    description: `Desc ${pn}`,
    qty,
    coefficient: 3,
    list_price: 10,
    line_total: qty * 10,
    tag: null as null,
    category: "GENERAL" as const,
    category_index: 0,
  };
}

function makeData(overrides: Partial<ExportOfferData> = {}): ExportOfferData {
  return {
    general: [
      {
        tag: "FRAME" as const,
        label: "Struttura",
        total: 500,
        items: [makeItem("PN-001"), makeItem("PN-002", 1)],
      },
    ],
    waterTanks: [],
    washBays: [],
    surcharges: [],
    total_list_price: 500,
    discounted_total: 500,
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

function renderText(
  data: ExportOfferData,
  discountPct = 0,
  meta = makeMeta(),
): string {
  const out: string[] = [];
  collectText(OfferPdfDocument({ data, meta, discountPct }), out);
  return out.join("");
}

function countOccurrences(haystack: string, needle: string): number {
  return haystack.split(needle).length - 1;
}

// ── Header metadata ───────────────────────────────────────────────────────────

describe("header metadata", () => {
  test("shows config id, client, generation info and source", () => {
    const text = renderText(makeData());
    expect(text).toContain("Offerta");
    expect(text).toContain("Configurazione #12");
    expect(text).toContain("Cliente: ACME Trasporti");
    expect(text).toContain(
      "Offerta generata il 01/02/2026, 10:30 da sales@iteco.it",
    );
    expect(text).toContain("Fonte: distinta di commessa");
  });

  test("omits generator suffix when email is missing", () => {
    const text = renderText(makeData(), 0, makeMeta({ generatorEmail: null }));
    expect(text).toContain("Offerta generata il 01/02/2026, 10:30");
    expect(text).not.toContain(" da sales@iteco.it");
  });

  test("generated line appears twice: header and footer", () => {
    const text = renderText(makeData());
    expect(
      countOccurrences(
        text,
        "Offerta generata il 01/02/2026, 10:30 da sales@iteco.it",
      ),
    ).toBe(2);
  });
});

// ── Summary section ───────────────────────────────────────────────────────────

describe("summary section — no discount", () => {
  test("shows title, headers and the four section rows", () => {
    const data = makeData({
      general: [
        { tag: "FRAME" as const, label: "Struttura", total: 300, items: [] },
      ],
      waterTanks: [{ index: 0, total: 150, items: [] }],
      washBays: [{ index: 0, total: 50, items: [] }],
      total_list_price: 500,
      discounted_total: 500,
    });
    const text = renderText(data);
    expect(text).toContain("Riepilogo offerta");
    expect(text).toContain("Sezione");
    expect(text).toContain("Distinta generale");
    expect(text).toContain("Serbatoi");
    expect(text).toContain("Piste");
    expect(text).toContain("Maggiorazioni");
    expect(text).toContain(formatEur(300));
    expect(text).toContain(formatEur(150));
    expect(text).toContain(formatEur(50));
  });

  test("shows grand list total", () => {
    const text = renderText(makeData());
    expect(text).toContain("TOTALE LISTINO");
    expect(text).toContain(formatEur(500));
  });

  test("no discount rows when discountPct is 0", () => {
    const text = renderText(makeData());
    expect(text).not.toContain("Sconto (");
    expect(text).not.toContain("TOTALE SCONTATO");
  });
});

describe("summary section — with discount", () => {
  const discounted = () =>
    makeData({ total_list_price: 1000, discounted_total: 900 });

  test("shows discount label with percentage and negative amount", () => {
    const text = renderText(discounted(), 10);
    expect(text).toContain("Sconto (10%)");
    expect(text).toContain(formatEur(-100));
  });

  test("shows discounted total", () => {
    const text = renderText(discounted(), 10);
    expect(text).toContain("TOTALE SCONTATO");
    expect(text).toContain(formatEur(900));
  });

  test("decimal discount percentage is formatted with comma", () => {
    const data = makeData({ total_list_price: 1000, discounted_total: 895 });
    const text = renderText(data, 10.5);
    expect(text).toContain("Sconto (10,50%)");
  });
});

// ── Body sections ─────────────────────────────────────────────────────────────

describe("body sections", () => {
  test("general group renders items, column headers and subtotal", () => {
    const data = makeData({
      general: [
        {
          tag: "FRAME" as const,
          label: "Struttura",
          total: 250,
          items: [makeItem("PN-X")],
        },
      ],
      total_list_price: 250,
      discounted_total: 250,
    });
    const text = renderText(data);
    expect(text).toContain("Codice");
    expect(text).toContain("Descrizione");
    expect(text).toContain("Qta");
    expect(text).toContain("Prezzo Listino");
    expect(text).toContain("PN-X");
    expect(text).toContain("Subtotale Struttura");
    expect(text).toContain(formatEur(250));
  });

  test("BOM item rows have an empty price cell", () => {
    const data = makeData({
      general: [
        {
          tag: "FRAME" as const,
          label: "Struttura",
          total: 100,
          items: [makeItem("PN-X", 5)],
        },
      ],
      total_list_price: 100,
      discounted_total: 100,
    });
    // list_price (10) and line_total (50) must not be rendered on item rows.
    const text = renderText(data);
    expect(text).not.toContain(formatEur(10));
    expect(text).not.toContain(formatEur(50));
  });

  test("water tank sub-section uses 1-based labels", () => {
    const data = makeData({
      general: [],
      waterTanks: [{ index: 0, total: 400, items: [makeItem("WT-001")] }],
      total_list_price: 400,
      discounted_total: 400,
    });
    const text = renderText(data);
    expect(text).toContain("Serbatoio 1");
    expect(text).toContain("Subtotale Serbatoio 1");
    expect(text).toContain(formatEur(400));
  });

  test("wash bay sub-section uses 1-based labels", () => {
    const data = makeData({
      general: [],
      washBays: [{ index: 1, total: 200, items: [makeItem("WB-002")] }],
      total_list_price: 200,
      discounted_total: 200,
    });
    const text = renderText(data);
    expect(text).toContain("Pista 2");
    expect(text).toContain("Subtotale Pista 2");
  });

  test("surcharge rows show description and line total", () => {
    const data = makeData({
      surcharges: [
        {
          surcharge_kind: "HEIGHT",
          description: "Altezza non standard",
          qty: 1,
          amount: 1500,
          line_total: 1500,
        },
      ],
      total_list_price: 2000,
      discounted_total: 2000,
    });
    const text = renderText(data);
    expect(text).toContain("Altezza non standard");
    expect(text).toContain(formatEur(1500));
    expect(text).toContain("Subtotale Maggiorazioni");
  });
});

// ── Empty section guards ──────────────────────────────────────────────────────

describe("empty section guards", () => {
  // Section names also appear once in the summary table; the body section
  // title would be a second occurrence.
  test("general body section is absent when general is empty", () => {
    const data = makeData({
      general: [],
      total_list_price: 0,
      discounted_total: 0,
    });
    const text = renderText(data);
    expect(countOccurrences(text, "Distinta generale")).toBe(1);
  });

  test("serbatoi body section is absent when waterTanks is empty", () => {
    const text = renderText(makeData());
    expect(countOccurrences(text, "Serbatoi")).toBe(1);
  });

  test("maggiorazioni body section is absent when there are no surcharges", () => {
    const text = renderText(makeData());
    expect(countOccurrences(text, "Maggiorazioni")).toBe(1);
  });
});

// ── Rendering smoke test ──────────────────────────────────────────────────────

describe("PDF rendering", () => {
  test("renders a valid PDF buffer", async () => {
    const buffer = await renderToBuffer(
      <OfferPdfDocument
        data={makeData({
          waterTanks: [{ index: 0, total: 150, items: [makeItem("WT-001")] }],
          surcharges: [
            {
              surcharge_kind: "PAINT",
              description: "Verniciatura personalizzata",
              qty: 1,
              amount: 1200,
              line_total: 1200,
            },
          ],
        })}
        meta={makeMeta()}
        discountPct={10}
      />,
    );
    expect(buffer.subarray(0, 5).toString()).toBe("%PDF-");
  });
});
