// @vitest-environment jsdom
import { describe, expect, test, vi } from "vitest";

vi.mock("file-saver", () => ({ saveAs: vi.fn() }));

import type ExcelJS from "exceljs";
import {
  buildOfferWorkbook,
  type ExportOfferData,
} from "@/app/configurazioni/offerta/[id]/create-offer-excel-file";
import type { UserData } from "@/db/queries";
import type { GroupedOfferData } from "@/lib/offer";

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeUser(): NonNullable<UserData> {
  return { id: "user-1", role: "SALES", initials: "SL" };
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

function makeData(
  overrides: Partial<
    GroupedOfferData & { total_list_price: number; discounted_total: number }
  > = {},
): ExportOfferData {
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
    const wb = buildOfferWorkbook(makeData(), makeUser(), 0);
    const sheet = getSheet(wb);
    expect(cellValue(sheet, 1, 1)).toBe("Riepilogo offerta");
  });

  test("row 3 has section/price headers", () => {
    const wb = buildOfferWorkbook(makeData(), makeUser(), 0);
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
    const wb = buildOfferWorkbook(data, makeUser(), 0);
    const sheet = getSheet(wb);
    expect(cellValue(sheet, 4, 1)).toBe("Distinta generale");
    expect(cellValue(sheet, 4, 4)).toBe(300);
    expect(cellValue(sheet, 5, 1)).toBe("Serbatoi");
    expect(cellValue(sheet, 5, 4)).toBe(150);
    expect(cellValue(sheet, 6, 1)).toBe("Piste");
    expect(cellValue(sheet, 6, 4)).toBe(50);
  });

  test("row 7 is grand total with gold background", () => {
    const wb = buildOfferWorkbook(
      makeData({ total_list_price: 500, discounted_total: 500 }),
      makeUser(),
      0,
    );
    const sheet = getSheet(wb);
    expect(cellValue(sheet, 7, 1)).toBe("TOTALE LISTINO");
    expect(cellValue(sheet, 7, 4)).toBe(500);
    expect(cellFillArgb(sheet, 7, 1)).toBe("FFD966");
  });

  test("no discount rows when discountPct is 0", () => {
    const wb = buildOfferWorkbook(makeData(), makeUser(), 0);
    const sheet = getSheet(wb);
    // Row 8 should be part of body (blank or section title), not a discount row
    const row8val = cellValue(sheet, 8, 1);
    expect(row8val).not.toBe("TOTALE SCONTATO");
    // Row 9 should not exist as a summary discount row either
    const row9val = cellValue(sheet, 9, 1);
    expect(row9val).not.toBe("TOTALE SCONTATO");
  });
});

describe("summary section — with discount", () => {
  test("row 8 shows discount label with percentage and negative amount", () => {
    const wb = buildOfferWorkbook(
      makeData({ total_list_price: 1000, discounted_total: 900 }),
      makeUser(),
      10,
    );
    const sheet = getSheet(wb);
    expect(cellValue(sheet, 8, 1)).toBe("Sconto (10%)");
    expect(cellValue(sheet, 8, 4)).toBe(-100);
  });

  test("row 9 shows discounted total with gold background", () => {
    const wb = buildOfferWorkbook(
      makeData({ total_list_price: 1000, discounted_total: 900 }),
      makeUser(),
      10,
    );
    const sheet = getSheet(wb);
    expect(cellValue(sheet, 9, 1)).toBe("TOTALE SCONTATO");
    expect(cellValue(sheet, 9, 4)).toBe(900);
    expect(cellFillArgb(sheet, 9, 1)).toBe("FFD966");
  });

  test("decimal discount percentage is formatted with comma", () => {
    const wb = buildOfferWorkbook(
      makeData({ total_list_price: 1000, discounted_total: 895 }),
      makeUser(),
      10.5,
    );
    const sheet = getSheet(wb);
    expect(cellValue(sheet, 8, 1)).toBe("Sconto (10,50%)");
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
    const wb = buildOfferWorkbook(data, makeUser(), 0);
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
    const wb = buildOfferWorkbook(data, makeUser(), 0);
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
    const wb = buildOfferWorkbook(data, makeUser(), 0);
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
    const wb = buildOfferWorkbook(data, makeUser(), 0);
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
    const wb = buildOfferWorkbook(data, makeUser(), 0);
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
    const wb = buildOfferWorkbook(makeData(), makeUser(), 0);
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
