// @vitest-environment jsdom
import { describe, expect, test, vi } from "vitest";

vi.mock("file-saver", () => ({ saveAs: vi.fn() }));

vi.mock("@/lib/offer", () => ({
  sumSurchargeTotal: (surcharges: { line_total: number }[]) =>
    surcharges.reduce((sum, s) => sum + s.line_total, 0),
}));

import type ExcelJS from "exceljs";
import {
  buildOfferWorkbook,
  type ExportOfferData,
} from "@/app/configurazioni/offerta/[id]/create-offer-excel-file";
import type { UserData } from "@/db/queries";
import type { OfferSnapshotSettings } from "@/lib/offer-settings";

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeUser(): NonNullable<UserData> {
  return { id: "user-1", role: "SALES", initials: "SL", manager_id: null };
}

function makeSettings(
  overrides: Partial<OfferSnapshotSettings> = {},
): OfferSnapshotSettings {
  return {
    show_net_total_only: false,
    transport_amount: 0,
    transport_mode: "TBD",
    installation_mode: "TBD",
    installation_items: [],
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

function getSheet(wb: ExcelJS.Workbook) {
  const sheet = wb.getWorksheet("Offerta");
  if (!sheet) throw new Error('Worksheet "Offerta" not found');
  return sheet;
}

function cellValue(sheet: ExcelJS.Worksheet, row: number, col: number) {
  return sheet.getRow(row).getCell(col).value;
}

function cellFillArgb(sheet: ExcelJS.Worksheet, row: number, col: number) {
  const fill = sheet.getRow(row).getCell(col).fill as
    | { fgColor?: { argb?: string } }
    | undefined;
  return fill?.fgColor?.argb;
}

// ── Summary section ───────────────────────────────────────────────────────────

describe("summary section — no discount", () => {
  test("row 1 is the title", () => {
    const wb = buildOfferWorkbook(makeData(), makeUser(), 0, makeSettings());
    const sheet = getSheet(wb);
    expect(cellValue(sheet, 1, 1)).toBe("Riepilogo offerta");
  });

  test("row 3 has section/price headers", () => {
    const wb = buildOfferWorkbook(makeData(), makeUser(), 0, makeSettings());
    const sheet = getSheet(wb);
    expect(cellValue(sheet, 3, 1)).toBe("Sezione");
    expect(cellValue(sheet, 3, 4)).toBe("Prezzo Listino");
  });

  test("rows 4–6 show section totals", () => {
    const data = makeData({
      general: [
        { tag: "FRAME" as const, label: "Struttura", total: 300, items: [] },
      ],
      waterTanks: [{ index: 0, total: 150, items: [] }],
      washBays: [{ index: 0, total: 50, items: [] }],
      total_list_price: 500,
      discounted_total: 500,
    });
    const wb = buildOfferWorkbook(data, makeUser(), 0, makeSettings());
    const sheet = getSheet(wb);
    expect(cellValue(sheet, 4, 1)).toBe("Distinta generale");
    expect(cellValue(sheet, 4, 4)).toBe(300);
    expect(cellValue(sheet, 5, 1)).toBe("Serbatoi");
    expect(cellValue(sheet, 5, 4)).toBe(150);
    expect(cellValue(sheet, 6, 1)).toBe("Piste");
    expect(cellValue(sheet, 6, 4)).toBe(50);
  });

  test("row 7 is Maggiorazioni (always present)", () => {
    const wb = buildOfferWorkbook(makeData(), makeUser(), 0, makeSettings());
    const sheet = getSheet(wb);
    expect(cellValue(sheet, 7, 1)).toBe("Maggiorazioni");
    expect(cellValue(sheet, 7, 4)).toBe(0);
  });

  test("row 8 is grand total with gold background", () => {
    const wb = buildOfferWorkbook(
      makeData({ total_list_price: 500, discounted_total: 500 }),
      makeUser(),
      0,
      makeSettings(),
    );
    const sheet = getSheet(wb);
    expect(cellValue(sheet, 8, 1)).toBe("TOTALE LISTINO");
    expect(cellValue(sheet, 8, 4)).toBe(500);
    expect(cellFillArgb(sheet, 8, 1)).toBe("FFD966");
  });

  test("no discount rows when discountPct is 0", () => {
    const wb = buildOfferWorkbook(makeData(), makeUser(), 0, makeSettings());
    const sheet = getSheet(wb);
    const row9val = cellValue(sheet, 9, 1);
    expect(row9val).not.toBe("TOTALE SCONTATO");
    const row10val = cellValue(sheet, 10, 1);
    expect(row10val).not.toBe("TOTALE SCONTATO");
  });
});

describe("summary section — with discount", () => {
  test("row 9 shows discount label with percentage and negative amount", () => {
    const wb = buildOfferWorkbook(
      makeData({ total_list_price: 1000, discounted_total: 900 }),
      makeUser(),
      10,
      makeSettings(),
    );
    const sheet = getSheet(wb);
    expect(cellValue(sheet, 9, 1)).toBe("Sconto (10%)");
    expect(cellValue(sheet, 9, 4)).toBe(-100);
  });

  test("row 10 shows discounted total with gold background", () => {
    const wb = buildOfferWorkbook(
      makeData({ total_list_price: 1000, discounted_total: 900 }),
      makeUser(),
      10,
      makeSettings(),
    );
    const sheet = getSheet(wb);
    expect(cellValue(sheet, 10, 1)).toBe("TOTALE SCONTATO");
    expect(cellValue(sheet, 10, 4)).toBe(900);
    expect(cellFillArgb(sheet, 10, 1)).toBe("FFD966");
  });

  test("decimal discount percentage is formatted with comma", () => {
    const wb = buildOfferWorkbook(
      makeData({ total_list_price: 1000, discounted_total: 895 }),
      makeUser(),
      10.5,
      makeSettings(),
    );
    const sheet = getSheet(wb);
    expect(cellValue(sheet, 9, 1)).toBe("Sconto (10,50%)");
  });
});

// ── Body sections ─────────────────────────────────────────────────────────────

describe("body — general section", () => {
  test("subtotal row carries group total in col 4", () => {
    const data = makeData({
      general: [
        {
          tag: "FRAME" as const,
          label: "Struttura",
          total: 250,
          items: [makeItem()],
        },
      ],
      total_list_price: 250,
      discounted_total: 250,
    });
    const wb = buildOfferWorkbook(data, makeUser(), 0, makeSettings());
    const sheet = getSheet(wb);

    // Find the subtotal row by looking for its label in col 1
    let subtotalValue: ExcelJS.CellValue = null;
    sheet.eachRow((row) => {
      if (row.getCell(1).value === "Subtotale Struttura") {
        subtotalValue = row.getCell(4).value;
      }
    });
    expect(subtotalValue).toBe(250);
  });

  test("item rows have blank price column (col 4)", () => {
    const data = makeData({
      general: [
        {
          tag: "FRAME" as const,
          label: "Struttura",
          total: 100,
          items: [makeItem("PN-X")],
        },
      ],
      total_list_price: 100,
      discounted_total: 100,
    });
    const wb = buildOfferWorkbook(data, makeUser(), 0, makeSettings());
    const sheet = getSheet(wb);

    let itemRowPriceValue: ExcelJS.CellValue = "NOT_FOUND";
    sheet.eachRow((row) => {
      if (row.getCell(1).value === "PN-X") {
        itemRowPriceValue = row.getCell(4).value;
      }
    });
    expect(itemRowPriceValue).toBeNull();
  });
});

describe("body — water tanks and wash bays", () => {
  test("water tank subtotal row has correct label and total", () => {
    const data = makeData({
      general: [],
      waterTanks: [{ index: 0, total: 400, items: [makeItem("WT-001")] }],
      total_list_price: 400,
      discounted_total: 400,
    });
    const wb = buildOfferWorkbook(data, makeUser(), 0, makeSettings());
    const sheet = getSheet(wb);

    let subtotalValue: ExcelJS.CellValue = null;
    sheet.eachRow((row) => {
      if (row.getCell(1).value === "Subtotale Serbatoio 1") {
        subtotalValue = row.getCell(4).value;
      }
    });
    expect(subtotalValue).toBe(400);
  });

  test("wash bay subtotal row has correct label and total", () => {
    const data = makeData({
      general: [],
      washBays: [{ index: 1, total: 200, items: [makeItem("WB-002")] }],
      total_list_price: 200,
      discounted_total: 200,
    });
    const wb = buildOfferWorkbook(data, makeUser(), 0, makeSettings());
    const sheet = getSheet(wb);

    let subtotalValue: ExcelJS.CellValue = null;
    sheet.eachRow((row) => {
      if (row.getCell(1).value === "Subtotale Pista 2") {
        subtotalValue = row.getCell(4).value;
      }
    });
    expect(subtotalValue).toBe(200);
  });
});

describe("body — surcharges", () => {
  test("surcharge item row sets col 4 to the surcharge amount", () => {
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
    const wb = buildOfferWorkbook(data, makeUser(), 0, makeSettings());
    const sheet = getSheet(wb);

    let priceValue: ExcelJS.CellValue = "NOT_FOUND";
    sheet.eachRow((row) => {
      if (row.getCell(2).value === "Altezza non standard") {
        priceValue = row.getCell(4).value;
      }
    });
    expect(priceValue).toBe(1500);
  });

  test("surcharge subtotal row carries the surcharge total", () => {
    const data = makeData({
      surcharges: [
        {
          surcharge_kind: "PAINT",
          description: "Verniciatura personalizzata",
          qty: 1,
          amount: 1200,
          line_total: 1200,
        },
      ],
      total_list_price: 1700,
      discounted_total: 1700,
    });
    const wb = buildOfferWorkbook(data, makeUser(), 0, makeSettings());
    const sheet = getSheet(wb);

    let subtotalValue: ExcelJS.CellValue = null;
    sheet.eachRow((row) => {
      if (row.getCell(1).value === "Subtotale Maggiorazioni") {
        subtotalValue = row.getCell(4).value;
      }
    });
    expect(subtotalValue).toBe(1200);
  });
});

describe("empty section guards", () => {
  // "Distinta generale" and "Serbatoi" also appear as labels in the summary.
  // The body section title is distinguished by its blue fill (sectionTitleBg).
  const SECTION_TITLE_BG = "4472C4";

  test("general body section title is absent when general is empty", () => {
    const data = makeData({
      general: [],
      total_list_price: 0,
      discounted_total: 0,
    });
    const wb = buildOfferWorkbook(data, makeUser(), 0, makeSettings());
    const sheet = getSheet(wb);

    let bodyTitleFound = false;
    sheet.eachRow((row) => {
      const cell = row.getCell(1);
      if (cell.value === "Distinta generale") {
        const fill = cell.fill as { fgColor?: { argb?: string } } | undefined;
        if (fill?.fgColor?.argb === SECTION_TITLE_BG) bodyTitleFound = true;
      }
    });
    expect(bodyTitleFound).toBe(false);
  });

  test("serbatoi body section title is absent when waterTanks is empty", () => {
    const wb = buildOfferWorkbook(makeData(), makeUser(), 0, makeSettings());
    const sheet = getSheet(wb);

    let bodyTitleFound = false;
    sheet.eachRow((row) => {
      const cell = row.getCell(1);
      if (cell.value === "Serbatoi") {
        const fill = cell.fill as { fgColor?: { argb?: string } } | undefined;
        if (fill?.fgColor?.argb === SECTION_TITLE_BG) bodyTitleFound = true;
      }
    });
    expect(bodyTitleFound).toBe(false);
  });
});

// ── Offer settings: transport, installation, net total ───────────────────────

function findRowByLabel(sheet: ExcelJS.Worksheet, label: string) {
  let found: ExcelJS.Row | null = null;
  sheet.eachRow((row) => {
    if (row.getCell(1).value === label) found = row;
  });
  return found as ExcelJS.Row | null;
}

describe("summary — transport row", () => {
  test("TBD mode shows 'da definire' without amount and no net total row", () => {
    const wb = buildOfferWorkbook(
      makeData(),
      makeUser(),
      0,
      makeSettings({ transport_mode: "TBD", transport_amount: 300 }),
    );
    const sheet = getSheet(wb);
    expect(cellValue(sheet, 9, 1)).toBe("Trasporto: da definire");
    expect(cellValue(sheet, 9, 4)).toBeNull();
    expect(findRowByLabel(sheet, "TOTALE NETTO")).toBeNull();
  });

  test("SEPARATE mode shows the amount but does not add it to the total", () => {
    const wb = buildOfferWorkbook(
      makeData(),
      makeUser(),
      0,
      makeSettings({ transport_mode: "SEPARATE", transport_amount: 300 }),
    );
    const sheet = getSheet(wb);
    expect(cellValue(sheet, 9, 1)).toBe("Trasporto a parte");
    expect(cellValue(sheet, 9, 4)).toBe(300);
    expect(findRowByLabel(sheet, "TOTALE NETTO")).toBeNull();
  });

  test("INCLUDED mode hides the amount and adds it to the net total", () => {
    const wb = buildOfferWorkbook(
      makeData(),
      makeUser(),
      0,
      makeSettings({ transport_mode: "INCLUDED", transport_amount: 300 }),
    );
    const sheet = getSheet(wb);
    expect(cellValue(sheet, 9, 1)).toBe("Trasporto compreso");
    expect(cellValue(sheet, 9, 4)).toBeNull();
    expect(cellValue(sheet, 10, 1)).toBe("Installazione: da definire");
    expect(cellValue(sheet, 11, 1)).toBe("TOTALE NETTO");
    expect(cellValue(sheet, 11, 4)).toBe(800);
  });

  test("transport row comes after the discount rows", () => {
    const wb = buildOfferWorkbook(
      makeData({ total_list_price: 1000, discounted_total: 900 }),
      makeUser(),
      10,
      makeSettings({ transport_mode: "INCLUDED", transport_amount: 100 }),
    );
    const sheet = getSheet(wb);
    expect(cellValue(sheet, 10, 1)).toBe("TOTALE SCONTATO");
    expect(cellValue(sheet, 11, 1)).toBe("Trasporto compreso");
    expect(cellValue(sheet, 12, 1)).toBe("Installazione: da definire");
    expect(cellValue(sheet, 13, 1)).toBe("TOTALE NETTO");
    expect(cellValue(sheet, 13, 4)).toBe(1000);
  });
});

describe("summary — installation row", () => {
  const items = [
    { kind: "BASE_SYSTEM" as const, amount: 1000, included: true },
    { kind: "HP_ROOF_BAR" as const, amount: 500, included: false },
  ];

  test("INCLUDED mode hides the amount and adds it to the net total", () => {
    const wb = buildOfferWorkbook(
      makeData(),
      makeUser(),
      0,
      makeSettings({
        installation_mode: "INCLUDED",
        installation_items: items,
      }),
    );
    const sheet = getSheet(wb);
    expect(cellValue(sheet, 10, 1)).toBe("Installazione compresa");
    expect(cellValue(sheet, 10, 4)).toBeNull();
    expect(cellValue(sheet, 11, 1)).toBe("TOTALE NETTO");
    expect(cellValue(sheet, 11, 4)).toBe(1500);
  });

  test("SEPARATE mode shows the included items total without adding it", () => {
    const wb = buildOfferWorkbook(
      makeData(),
      makeUser(),
      0,
      makeSettings({
        installation_mode: "SEPARATE",
        installation_items: items,
      }),
    );
    const sheet = getSheet(wb);
    expect(cellValue(sheet, 10, 1)).toBe("Installazione a parte");
    expect(cellValue(sheet, 10, 4)).toBe(1000);
    expect(findRowByLabel(sheet, "TOTALE NETTO")).toBeNull();
  });

  test("TBD mode excludes installation even when items are flagged", () => {
    const wb = buildOfferWorkbook(
      makeData(),
      makeUser(),
      0,
      makeSettings({ installation_mode: "TBD", installation_items: items }),
    );
    const sheet = getSheet(wb);
    expect(cellValue(sheet, 10, 1)).toBe("Installazione: da definire");
    expect(cellValue(sheet, 10, 4)).toBeNull();
    expect(findRowByLabel(sheet, "TOTALE NETTO")).toBeNull();
  });
});

describe("net-total-only mode", () => {
  const netOnlySettings = makeSettings({
    show_net_total_only: true,
    transport_mode: "INCLUDED",
    transport_amount: 200,
  });

  test("summary shows only transport, installation and the net total", () => {
    const wb = buildOfferWorkbook(makeData(), makeUser(), 0, netOnlySettings);
    const sheet = getSheet(wb);
    expect(cellValue(sheet, 1, 1)).toBe("Riepilogo offerta");
    expect(cellValue(sheet, 3, 1)).toBe("Trasporto compreso");
    expect(cellValue(sheet, 4, 1)).toBe("Installazione: da definire");
    expect(cellValue(sheet, 5, 1)).toBe("TOTALE NETTO");
    expect(cellValue(sheet, 5, 4)).toBe(700);
    expect(findRowByLabel(sheet, "Sezione")).toBeNull();
    expect(findRowByLabel(sheet, "TOTALE LISTINO")).toBeNull();
  });

  test("hides the discount rows even when a discount is set", () => {
    const wb = buildOfferWorkbook(
      makeData({ total_list_price: 1000, discounted_total: 900 }),
      makeUser(),
      10,
      makeSettings({ show_net_total_only: true }),
    );
    const sheet = getSheet(wb);
    expect(findRowByLabel(sheet, "Sconto (10%)")).toBeNull();
    expect(findRowByLabel(sheet, "TOTALE SCONTATO")).toBeNull();
    expect(cellValue(sheet, 5, 1)).toBe("TOTALE NETTO");
    expect(cellValue(sheet, 5, 4)).toBe(900);
  });

  test("item tables drop the price column and subtotal rows", () => {
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
    const wb = buildOfferWorkbook(data, makeUser(), 0, netOnlySettings);
    const sheet = getSheet(wb);

    let priceHeaderFound = false;
    let surchargePrice: ExcelJS.CellValue = "NOT_FOUND";
    sheet.eachRow((row) => {
      if (row.getCell(4).value === "Prezzo Listino") priceHeaderFound = true;
      if (row.getCell(2).value === "Altezza non standard") {
        surchargePrice = row.getCell(4).value;
      }
    });
    expect(priceHeaderFound).toBe(false);
    expect(surchargePrice).toBeNull();
    expect(findRowByLabel(sheet, "Subtotale Struttura")).toBeNull();
    expect(findRowByLabel(sheet, "Subtotale Maggiorazioni")).toBeNull();
  });
});
