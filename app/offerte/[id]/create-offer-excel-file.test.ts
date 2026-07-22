// @vitest-environment jsdom
import type ExcelJS from "exceljs";
import { describe, expect, test, vi } from "vitest";

vi.mock("file-saver", () => ({ saveAs: vi.fn() }));

import { buildOfferWorkbook } from "@/app/offerte/[id]/create-offer-excel-file";
import type {
  OfferExportLine,
  OfferRevisionExportData,
} from "@/lib/offer-export";
import type { OfferSummaryExtras } from "@/lib/offer-settings";
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
    supplyConditions: [
      { label: "IVA esclusa", value: null },
      { label: "Data di consegna", value: "Da definire" },
      { label: "Destinazione", value: "Via Roma 1" },
      { label: "Modalità di pagamento", value: "Da definire" },
      { label: "Garanzia", value: "12 mesi" },
    ],
    ...overrides,
  };
}

function getSheet(wb: ExcelJS.Workbook) {
  const sheet = wb.getWorksheet("Offerta");
  if (!sheet) throw new Error('Worksheet "Offerta" not found');
  return sheet;
}

/** Last row whose first cell equals `label` (labels are unique in the sheet). */
function findRow(
  sheet: ExcelJS.Worksheet,
  label: string,
): ExcelJS.Row | undefined {
  let found: ExcelJS.Row | undefined;
  sheet.eachRow((row) => {
    if (row.getCell(1).value === label) found = row;
  });
  return found;
}

function hasCellValue(sheet: ExcelJS.Worksheet, value: string): boolean {
  let present = false;
  sheet.eachRow((row) => {
    row.eachCell((cell) => {
      if (cell.value === value) present = true;
    });
  });
  return present;
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe("document header", () => {
  test("renders offer number, revision and customer", () => {
    const sheet = getSheet(buildOfferWorkbook(makeData(), "SL"));
    expect(sheet.getRow(1).getCell(1).value).toBe("Offerta OFF-1 — Rev 2");
    expect(hasCellValue(sheet, "ACME Trasporti")).toBe(true);
    expect(hasCellValue(sheet, "Via Roma 1")).toBe(true);
    expect(hasCellValue(sheet, "acme@example.com")).toBe(true);
  });
});

describe("line sections", () => {
  test("renders a section title per line", () => {
    const data = makeData({
      lines: [
        makeLine({ title: "Pos. 1 — Config A" }),
        makeLine({ title: "Pos. 2 — Config B" }),
      ],
    });
    const sheet = getSheet(buildOfferWorkbook(data, "SL"));
    expect(findRow(sheet, "Pos. 1 — Config A")).toBeDefined();
    expect(findRow(sheet, "Pos. 2 — Config B")).toBeDefined();
  });

  test("renders general group with item rows and subtotal", () => {
    const sheet = getSheet(buildOfferWorkbook(makeData(), "SL"));
    expect(findRow(sheet, "Struttura")).toBeDefined();
    const item = findRow(sheet, "PN-001");
    expect(item).toBeDefined();
    expect(item?.getCell(3).value).toBe(2); // qty
    const subtotal = findRow(sheet, "Subtotale Struttura");
    expect(subtotal?.getCell(4).value).toBe(500);
  });

  test("renders water tank and wash bay sections", () => {
    const line = makeLine({
      data: {
        general: [],
        waterTanks: [{ index: 0, total: 120, items: [makeBomItem("WT-1")] }],
        washBays: [{ index: 0, total: 80, items: [makeBomItem("WB-1")] }],
        total_list_price: 200,
        discounted_total: 200,
      },
    });
    const sheet = getSheet(
      buildOfferWorkbook(makeData({ lines: [line] }), "SL"),
    );
    expect(findRow(sheet, "Serbatoio 1")).toBeDefined();
    expect(findRow(sheet, "Subtotale Serbatoio 1")?.getCell(4).value).toBe(120);
    expect(findRow(sheet, "Pista 1")).toBeDefined();
    expect(findRow(sheet, "Subtotale Pista 1")?.getCell(4).value).toBe(80);
  });

  test("renders surcharges sub-section with line totals", () => {
    const surcharges: OfferSurchargeItem[] = [
      {
        surcharge_kind: "HEIGHT",
        description: "Sovracosto altezza",
        qty: 1,
        amount: 500,
        line_total: 500,
      },
    ];
    const sheet = getSheet(
      buildOfferWorkbook(makeData({ lines: [makeLine({ surcharges })] }), "SL"),
    );
    expect(findRow(sheet, "Maggiorazioni")).toBeDefined();
    // The surcharge row has an empty PN; assert the description cell instead.
    expect(hasCellValue(sheet, "Sovracosto altezza")).toBe(true);
    expect(findRow(sheet, "Subtotale Maggiorazioni")?.getCell(4).value).toBe(
      500,
    );
  });

  test("renders a per-line total", () => {
    const sheet = getSheet(buildOfferWorkbook(makeData(), "SL"));
    expect(findRow(sheet, "Totale Pos. 1 — Config A")?.getCell(4).value).toBe(
      500,
    );
  });
});

describe("riepilogo", () => {
  test("shows list total, discount and discounted total", () => {
    const data = makeData({
      discountPct: 10,
      totalListPrice: 500,
      discountedTotal: 450,
      extras: makeExtras({ net_total: 450 }),
    });
    const sheet = getSheet(buildOfferWorkbook(data, "SL"));
    expect(findRow(sheet, "TOTALE LISTINO")?.getCell(4).value).toBe(500);
    expect(findRow(sheet, "Sconto (10%)")?.getCell(4).value).toBe(-50);
    expect(findRow(sheet, "TOTALE SCONTATO")?.getCell(4).value).toBe(450);
  });

  test("omits the discount rows when there is no discount", () => {
    const sheet = getSheet(buildOfferWorkbook(makeData(), "SL"));
    expect(findRow(sheet, "TOTALE LISTINO")?.getCell(4).value).toBe(500);
    expect(hasCellValue(sheet, "TOTALE SCONTATO")).toBe(false);
  });

  test("renders transport and installation rows with amounts", () => {
    const data = makeData({
      extras: makeExtras({
        transportRow: { label: "Trasporto a parte", amount: 300 },
        installationRow: { label: "Installazione a parte", amount: 200 },
        net_total: 1000,
        hasNetAdjustments: true,
      }),
    });
    const sheet = getSheet(buildOfferWorkbook(data, "SL"));
    expect(findRow(sheet, "Trasporto a parte")?.getCell(4).value).toBe(300);
    expect(findRow(sheet, "Installazione a parte")?.getCell(4).value).toBe(200);
    expect(findRow(sheet, "TOTALE NETTO")?.getCell(4).value).toBe(1000);
  });
});

describe("condizioni di fornitura", () => {
  test("renders the section with one row per condition", () => {
    const sheet = getSheet(buildOfferWorkbook(makeData(), "SL"));
    expect(findRow(sheet, "Condizioni di fornitura")).toBeDefined();
    // The static line has no value; the others render "label: value".
    expect(findRow(sheet, "IVA esclusa")).toBeDefined();
    expect(findRow(sheet, "Data di consegna: Da definire")).toBeDefined();
    expect(findRow(sheet, "Destinazione: Via Roma 1")).toBeDefined();
    expect(findRow(sheet, "Modalità di pagamento: Da definire")).toBeDefined();
    expect(findRow(sheet, "Garanzia: 12 mesi")).toBeDefined();
  });
});

describe("net-total-only mode", () => {
  test("drops price column, per-section subtotals and list totals, keeps net total", () => {
    const data = makeData({
      showPrices: false,
      extras: makeExtras({ net_total: 500 }),
    });
    const sheet = getSheet(buildOfferWorkbook(data, "SL"));
    expect(hasCellValue(sheet, "Prezzo Listino")).toBe(false);
    expect(hasCellValue(sheet, "Subtotale Struttura")).toBe(false);
    expect(hasCellValue(sheet, "TOTALE LISTINO")).toBe(false);
    // Items are still listed (the customer sees scope, not prices).
    expect(findRow(sheet, "PN-001")).toBeDefined();
    expect(findRow(sheet, "TOTALE NETTO")?.getCell(4).value).toBe(500);
  });
});
