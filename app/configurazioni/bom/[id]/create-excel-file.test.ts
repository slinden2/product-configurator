import { describe, expect, test, vi } from "vitest";

vi.mock("file-saver", () => ({ saveAs: vi.fn() }));

import type ExcelJS from "exceljs";
import {
  type BOM,
  buildCostWorkbook,
} from "@/app/configurazioni/bom/[id]/create-excel-file";
import type { UserData } from "@/db/queries";

// --- Helpers ---

function makeCostItem(overrides: Partial<BOM[number]> = {}): BOM[number] {
  return {
    pn: "PN-001",
    qty: 1,
    _description: "internal desc",
    description: "Part description",
    cost: 10,
    ...overrides,
  };
}

function makeUser(): NonNullable<UserData> {
  return { id: "user-1", role: "ENGINEER", initials: "AB" };
}

function getSheet(wb: ExcelJS.Workbook) {
  const sheet = wb.getWorksheet("Costi");
  if (!sheet) throw new Error('Worksheet "Costi" not found');
  return sheet;
}

function cellValue(sheet: ExcelJS.Worksheet, row: number, col: number) {
  return sheet.getRow(row).getCell(col).value;
}

function cellFormula(
  sheet: ExcelJS.Worksheet,
  row: number,
  col: number,
): string | null {
  const val = sheet.getRow(row).getCell(col).value;
  if (typeof val === "object" && val !== null && "formula" in val) {
    return (val as { formula: string }).formula;
  }
  return null;
}

function findCellValues(sheet: ExcelJS.Worksheet): string[] {
  const values: string[] = [];
  sheet.eachRow((row) => {
    const v = row.getCell(1).value;
    if (typeof v === "string") values.push(v);
  });
  return values;
}

// --- Tests ---

describe("summary table", () => {
  test("has correct structure at the top of the sheet", () => {
    const wb = buildCostWorkbook([], [], [], makeUser());
    const sheet = getSheet(wb);
    expect(cellValue(sheet, 1, 1)).toBe("Riepilogo costi");
    expect(cellValue(sheet, 3, 1)).toBe("Sezione");
    expect(cellValue(sheet, 3, 2)).toBe("Costo");
    expect(cellValue(sheet, 4, 1)).toBe("Distinta generale");
    expect(cellValue(sheet, 5, 1)).toBe("Serbatoi");
    expect(cellValue(sheet, 6, 1)).toBe("Piste");
    expect(cellValue(sheet, 7, 1)).toBe("TOTALE");
  });

  test("section formula references the total cost column range", () => {
    const general: BOM = [makeCostItem()];
    const wb = buildCostWorkbook(general, [], [], makeUser());
    const sheet = getSheet(wb);
    const formula = cellFormula(sheet, 4, 2);
    expect(formula).toMatch(/^SUM\(E\d+:E\d+\)$/);
  });

  test("grand total formula references all section ranges", () => {
    const general: BOM = [makeCostItem()];
    const tank: BOM = [makeCostItem({ pn: "WT1" })];
    const bay: BOM = [makeCostItem({ pn: "WB1" })];
    const wb = buildCostWorkbook(general, [tank], [bay], makeUser());
    const sheet = getSheet(wb);
    const formula = cellFormula(sheet, 7, 2);
    expect(formula).not.toBeNull();
    const ranges = formula?.match(/E\d+:E\d+/g);
    expect(ranges).toHaveLength(3);
  });
});

describe("general BOM without tags (legacy)", () => {
  test("renders items as flat list with no subtotals", () => {
    const items: BOM = [makeCostItem({ pn: "A" }), makeCostItem({ pn: "B" })];
    const wb = buildCostWorkbook(items, [], [], makeUser());
    const values = findCellValues(getSheet(wb));
    expect(values.some((v) => v.startsWith("Subtotale"))).toBe(false);
  });
});

describe("general BOM with tags (grouped)", () => {
  test("renders tag group headers and subtotals in BomTags order", () => {
    const items: BOM = [
      makeCostItem({ pn: "F1", tag: "FRAME" }),
      makeCostItem({ pn: "B1", tag: "BRUSHES" }),
    ];
    const wb = buildCostWorkbook(items, [], [], makeUser());
    const values = findCellValues(getSheet(wb));
    // FRAME comes before BRUSHES in BomTags order
    expect(values).toContain("Struttura");
    expect(values).toContain("Spazzole");
    expect(values.indexOf("Struttura")).toBeLessThan(
      values.indexOf("Spazzole"),
    );
    expect(values).toContain("Subtotale Struttura");
    expect(values).toContain("Subtotale Spazzole");
  });
});

describe("water tank and wash bay sections", () => {
  test("shows subtitle even with a single water tank / wash bay", () => {
    const wb = buildCostWorkbook(
      [],
      [[makeCostItem()]],
      [[makeCostItem()]],
      makeUser(),
    );
    const values = findCellValues(getSheet(wb));
    expect(values).toContain("Serbatoio 1");
    expect(values).toContain("Pista 1");
  });

  test("shows subtitles for each item when multiple", () => {
    const wb = buildCostWorkbook(
      [],
      [[makeCostItem()], [makeCostItem()]],
      [[makeCostItem()], [makeCostItem()]],
      makeUser(),
    );
    const values = findCellValues(getSheet(wb));
    expect(values).toContain("Serbatoio 1");
    expect(values).toContain("Serbatoio 2");
    expect(values).toContain("Pista 1");
    expect(values).toContain("Pista 2");
  });

  test("shows subtotals for each water tank and wash bay", () => {
    const wb = buildCostWorkbook(
      [],
      [[makeCostItem()], [makeCostItem()]],
      [[makeCostItem()]],
      makeUser(),
    );
    const values = findCellValues(getSheet(wb));
    expect(values).toContain("Subtotale Serbatoio 1");
    expect(values).toContain("Subtotale Serbatoio 2");
    expect(values).toContain("Subtotale Pista 1");
  });

  test("subtotal rows contain SUM formulas", () => {
    const wb = buildCostWorkbook([], [[makeCostItem()]], [], makeUser());
    const sheet = getSheet(wb);
    let subtotalFormula: string | null = null;
    sheet.eachRow((row) => {
      if (row.getCell(1).value === "Subtotale Serbatoio 1") {
        const val = row.getCell(5).value;
        if (typeof val === "object" && val !== null && "formula" in val) {
          subtotalFormula = (val as { formula: string }).formula;
        }
      }
    });
    expect(subtotalFormula).toMatch(/^SUM\(E\d+:E\d+\)$/);
  });
});
