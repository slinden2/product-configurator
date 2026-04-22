// @vitest-environment jsdom
import { describe, expect, test, vi } from "vitest";

vi.mock("file-saver", () => ({ saveAs: vi.fn() }));

import ExcelJS from "exceljs";
import {
  addColumnHeaderRow,
  addSectionTitleRow,
  addSubSectionTitleRow,
  applyHeaderRowStyling,
  COLORS,
  downloadWorkbook,
  EUR_FMT,
  fillRowWithBorder,
  THIN_BORDER,
} from "@/lib/excel/workbook-builder";

function makeSheet(): ExcelJS.Worksheet {
  const wb = new ExcelJS.Workbook();
  const sheet = wb.addWorksheet("Test");
  sheet.columns = [
    { key: "a", width: 10 },
    { key: "b", width: 10 },
    { key: "c", width: 10 },
  ];
  return sheet;
}

function getCellFill(sheet: ExcelJS.Worksheet, rowNum: number, col: number) {
  const fill = sheet.getRow(rowNum).getCell(col).fill as
    | { fgColor?: { argb?: string } }
    | undefined;
  return fill?.fgColor?.argb;
}

// ── COLORS & constants ────────────────────────────────────────────────────────

describe("constants", () => {
  test("COLORS has expected keys", () => {
    expect(COLORS).toMatchObject({
      white: "ffffff",
      lightGray: "f0f0f0",
      sectionTitleBg: "4472C4",
      grandTotalBg: "FFD966",
    });
  });

  test("EUR_FMT is the euro format string", () => {
    expect(EUR_FMT).toBe("€ #,##0.00");
  });

  test("THIN_BORDER has all four sides set to thin", () => {
    expect(THIN_BORDER).toMatchObject({
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    });
  });
});

// ── downloadWorkbook ──────────────────────────────────────────────────────────

describe("downloadWorkbook", () => {
  test("calls saveAs with the given filename", async () => {
    const { saveAs } = await import("file-saver");
    const saveAsMock = vi.mocked(saveAs);
    saveAsMock.mockClear();

    const wb = new ExcelJS.Workbook();
    wb.addWorksheet("Sheet1");
    await downloadWorkbook(wb, "test.xlsx");

    expect(saveAsMock).toHaveBeenCalledOnce();
    const [, filename] = saveAsMock.mock.calls[0];
    expect(filename).toBe("test.xlsx");
  });

  test("passes a Blob with the xlsx MIME type", async () => {
    const { saveAs } = await import("file-saver");
    const saveAsMock = vi.mocked(saveAs);
    saveAsMock.mockClear();

    const wb = new ExcelJS.Workbook();
    wb.addWorksheet("Sheet1");
    await downloadWorkbook(wb, "out.xlsx");

    const [blob] = saveAsMock.mock.calls[0];
    expect((blob as Blob).type).toBe(
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
  });
});

// ── fillRowWithBorder ─────────────────────────────────────────────────────────

describe("fillRowWithBorder", () => {
  test("applies fill and border to exactly colSpan cells", () => {
    const sheet = makeSheet();
    const row = sheet.addRow(["a", "b", "c"]);
    fillRowWithBorder(row, 2, COLORS.lightGray);

    for (let col = 1; col <= 2; col++) {
      const cell = row.getCell(col);
      expect(
        (cell.fill as { fgColor?: { argb?: string } })?.fgColor?.argb,
      ).toBe(COLORS.lightGray);
      expect(cell.border).toMatchObject(THIN_BORDER);
    }
    // Col 3 should be untouched
    expect(row.getCell(3).border).toBeUndefined();
  });
});

// ── addSectionTitleRow ────────────────────────────────────────────────────────

describe("addSectionTitleRow", () => {
  test("inserts 2 blank rows then the title row", () => {
    const sheet = makeSheet();
    const before = sheet.rowCount;
    addSectionTitleRow(sheet, "My Section", 3);
    expect(sheet.rowCount).toBe(before + 3);
  });

  test("skips spacing when skipSpacing is true", () => {
    const sheet = makeSheet();
    const before = sheet.rowCount;
    addSectionTitleRow(sheet, "My Section", 3, true);
    expect(sheet.rowCount).toBe(before + 1);
  });

  test("title row has sectionTitleBg fill on all colSpan cells", () => {
    const sheet = makeSheet();
    addSectionTitleRow(sheet, "Section", 3);
    const titleRowNum = sheet.rowCount;
    for (let col = 1; col <= 3; col++) {
      expect(getCellFill(sheet, titleRowNum, col)).toBe(COLORS.sectionTitleBg);
    }
  });

  test("title row cell 1 has the title text", () => {
    const sheet = makeSheet();
    addSectionTitleRow(sheet, "Hello", 3);
    expect(sheet.getRow(sheet.rowCount).getCell(1).value).toBe("Hello");
  });

  test("title row height is 20", () => {
    const sheet = makeSheet();
    addSectionTitleRow(sheet, "X", 3);
    expect(sheet.getRow(sheet.rowCount).height).toBe(20);
  });
});

// ── addSubSectionTitleRow ─────────────────────────────────────────────────────

describe("addSubSectionTitleRow", () => {
  test("inserts a blank row then the subtitle row", () => {
    const sheet = makeSheet();
    const before = sheet.rowCount;
    addSubSectionTitleRow(sheet, "Sub");
    expect(sheet.rowCount).toBe(before + 2);
  });

  test("subtitle row cell 1 has subSectionBg fill", () => {
    const sheet = makeSheet();
    addSubSectionTitleRow(sheet, "Sub");
    expect(getCellFill(sheet, sheet.rowCount, 1)).toBe(COLORS.subSectionBg);
  });

  test("subtitle row cell 1 has the subtitle text", () => {
    const sheet = makeSheet();
    addSubSectionTitleRow(sheet, "My Sub");
    expect(sheet.getRow(sheet.rowCount).getCell(1).value).toBe("My Sub");
  });
});

// ── addColumnHeaderRow ────────────────────────────────────────────────────────

describe("addColumnHeaderRow", () => {
  test("inserts a blank row then the header row", () => {
    const sheet = makeSheet();
    const before = sheet.rowCount;
    addColumnHeaderRow(sheet, ["A", "B", "C"]);
    expect(sheet.rowCount).toBe(before + 2);
  });

  test("header row contains the provided headers", () => {
    const sheet = makeSheet();
    const row = addColumnHeaderRow(sheet, ["Cod", "Desc", "Qty"]);
    expect(row.getCell(1).value).toBe("Cod");
    expect(row.getCell(2).value).toBe("Desc");
    expect(row.getCell(3).value).toBe("Qty");
  });

  test("returns the header row", () => {
    const sheet = makeSheet();
    const row = addColumnHeaderRow(sheet, ["X"]);
    expect(row.number).toBe(sheet.rowCount);
  });
});

// ── applyHeaderRowStyling ─────────────────────────────────────────────────────

describe("applyHeaderRowStyling", () => {
  test("applies bold + center + lightGray fill + border to colSpan cells", () => {
    const sheet = makeSheet();
    const row = sheet.addRow(["Cod", "Desc", "Qty"]);
    applyHeaderRowStyling(sheet, [row.number], 3);

    for (let col = 1; col <= 3; col++) {
      const cell = row.getCell(col);
      expect((cell.font as { bold?: boolean })?.bold).toBe(true);
      expect(cell.alignment).toMatchObject({ horizontal: "center" });
      expect(cell.border).toMatchObject(THIN_BORDER);
      expect(getCellFill(sheet, row.number, col)).toBe(COLORS.lightGray);
    }
  });

  test("applies styling to multiple row numbers", () => {
    const sheet = makeSheet();
    const row1 = sheet.addRow(["a"]);
    sheet.addRow([]); // gap
    const row2 = sheet.addRow(["b"]);
    applyHeaderRowStyling(sheet, [row1.number, row2.number], 1);

    expect((row1.getCell(1).font as { bold?: boolean })?.bold).toBe(true);
    expect((row2.getCell(1).font as { bold?: boolean })?.bold).toBe(true);
  });
});
