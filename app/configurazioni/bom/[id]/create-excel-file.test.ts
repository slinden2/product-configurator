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

function getParetoSheet(wb: ExcelJS.Workbook) {
  const sheet = wb.getWorksheet("Analisi Costi");
  if (!sheet) throw new Error('Worksheet "Analisi Costi" not found');
  return sheet;
}

function cellFillArgb(
  sheet: ExcelJS.Worksheet,
  row: number,
  col: number,
): string | undefined {
  const fill = sheet.getRow(row).getCell(col).fill as
    | { fgColor?: { argb?: string } }
    | undefined;
  return fill?.fgColor?.argb;
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

describe("Analisi Costi sheet (Pareto)", () => {
  test("sheet is the second tab after Costi", () => {
    const wb = buildCostWorkbook([], [], [], makeUser());
    expect(wb.worksheets[0].name).toBe("Costi");
    expect(wb.worksheets[1].name).toBe("Analisi Costi");
  });

  test("aggregates duplicate PNs across sections into one row", () => {
    const pn = "AGG-001";
    const generalBOM: BOM = [makeCostItem({ pn, qty: 2, cost: 100 })];
    const washBayBOMs: BOM[] = [[makeCostItem({ pn, qty: 3, cost: 100 })]];
    const wb = buildCostWorkbook(generalBOM, [], washBayBOMs, makeUser());
    const sheet = getParetoSheet(wb);
    let pnRowCount = 0;
    let aggregatedQty: number | null = null;
    sheet.eachRow((row, rowNum) => {
      if (rowNum === 1) return;
      if (row.getCell(1).value === pn) {
        pnRowCount++;
        aggregatedQty = row.getCell(3).value as number;
      }
    });
    expect(pnRowCount).toBe(1);
    expect(aggregatedQty).toBe(5);
  });

  test("excludes zero-cost rows", () => {
    const generalBOM: BOM = [
      makeCostItem({ pn: "ZERO-COST", qty: 5, cost: 0 }),
      makeCostItem({ pn: "ZERO-QTY", qty: 0, cost: 100 }),
      makeCostItem({ pn: "OK-PN", qty: 2, cost: 50 }),
    ];
    const wb = buildCostWorkbook(generalBOM, [], [], makeUser());
    const pns = findCellValues(getParetoSheet(wb));
    expect(pns).not.toContain("ZERO-COST");
    expect(pns).not.toContain("ZERO-QTY");
    expect(pns).toContain("OK-PN");
  });

  test("sorts rows by total cost descending", () => {
    const generalBOM: BOM = [
      makeCostItem({ pn: "LOW-001", qty: 1, cost: 10 }),
      makeCostItem({ pn: "HIGH-001", qty: 1, cost: 100 }),
    ];
    const wb = buildCostWorkbook(generalBOM, [], [], makeUser());
    const sheet = getParetoSheet(wb);
    expect(cellValue(sheet, 2, 1)).toBe("HIGH-001");
    expect(cellValue(sheet, 3, 1)).toBe("LOW-001");
  });

  test("writes correct Excel formulas for derived columns", () => {
    const generalBOM: BOM = [
      makeCostItem({ pn: "PN-A", qty: 1, cost: 100 }),
      makeCostItem({ pn: "PN-B", qty: 1, cost: 50 }),
    ];
    // header=row1, PN-A=row2, PN-B=row3, TOTALE=row4
    const wb = buildCostWorkbook(generalBOM, [], [], makeUser());
    const sheet = getParetoSheet(wb);
    expect(cellFormula(sheet, 2, 5)).toBe("C2*D2");
    expect(cellFormula(sheet, 2, 6)).toBe("E2/$E$4");
    expect(cellFormula(sheet, 2, 7)).toBe("SUM($E$2:E2)/$E$4");
  });

  test("TOTALE row is present with SUM formula for total cost", () => {
    const generalBOM: BOM = [makeCostItem({ pn: "PN-X", qty: 2, cost: 50 })];
    // header=row1, PN-X=row2, TOTALE=row3
    const wb = buildCostWorkbook(generalBOM, [], [], makeUser());
    const sheet = getParetoSheet(wb);
    expect(cellValue(sheet, 3, 1)).toBe("TOTALE");
    expect(cellFormula(sheet, 3, 5)).toBe("SUM(E2:E2)");
  });

  test("highlights vital-few rows (top 80%) with yellow fill", () => {
    // BIG is 90% of total → highlighted; SMALL is 10% → not highlighted
    const generalBOM: BOM = [
      makeCostItem({ pn: "BIG", qty: 1, cost: 900 }),
      makeCostItem({ pn: "SMALL", qty: 1, cost: 100 }),
    ];
    const wb = buildCostWorkbook(generalBOM, [], [], makeUser());
    const sheet = getParetoSheet(wb);
    // Row 2 = BIG (prevCumulative=0 → 0/1000 < 0.8 → highlighted)
    expect(cellFillArgb(sheet, 2, 1)).toBe("FFF2CC"); // COLORS.subtotalBg
    // Row 3 = SMALL (prevCumulative=900 → 0.9 >= 0.8 → not highlighted)
    expect(cellFillArgb(sheet, 3, 1)).not.toBe("FFF2CC");
  });

  test("header row is frozen", () => {
    const wb = buildCostWorkbook([], [], [], makeUser());
    const sheet = getParetoSheet(wb);
    expect(sheet.views[0]).toMatchObject({ state: "frozen", ySplit: 1 });
  });

  test("empty BOM produces sheet with only header row and no crash", () => {
    const wb = buildCostWorkbook([], [], [], makeUser());
    const sheet = getParetoSheet(wb);
    expect(sheet.rowCount).toBe(1);
  });
});

describe("Analisi Componenti sheet (exploded Pareto)", () => {
  function getComponentiSheet(wb: ExcelJS.Workbook) {
    const sheet = wb.getWorksheet("Analisi Componenti");
    if (!sheet) throw new Error('Worksheet "Analisi Componenti" not found');
    return sheet;
  }

  const exploded = (
    generalBOM: BOM,
  ): Parameters<typeof buildCostWorkbook>[4] => ({
    generalBOM,
    waterTankBOMs: [],
    washBayBOMs: [],
  });

  test("sheet is the third tab after Costi and Analisi Costi", () => {
    const wb = buildCostWorkbook([], [], [], makeUser(), exploded([]));
    expect(wb.worksheets[0].name).toBe("Costi");
    expect(wb.worksheets[1].name).toBe("Analisi Costi");
    expect(wb.worksheets[2].name).toBe("Analisi Componenti");
  });

  test("sheet is absent when no exploded data is passed", () => {
    const wb = buildCostWorkbook([], [], [], makeUser());
    expect(wb.getWorksheet("Analisi Componenti")).toBeUndefined();
  });

  test("aggregates duplicate PNs across sections into one row", () => {
    const pn = "LEAF-001";
    const wb = buildCostWorkbook([], [], [], makeUser(), {
      generalBOM: [makeCostItem({ pn, qty: 2, cost: 100 })],
      waterTankBOMs: [[makeCostItem({ pn, qty: 3, cost: 100 })]],
      washBayBOMs: [],
    });
    const sheet = getComponentiSheet(wb);
    let pnRowCount = 0;
    let aggregatedQty: number | null = null;
    sheet.eachRow((row, rowNum) => {
      if (rowNum === 1) return;
      if (row.getCell(1).value === pn) {
        pnRowCount++;
        aggregatedQty = row.getCell(3).value as number;
      }
    });
    expect(pnRowCount).toBe(1);
    expect(aggregatedQty).toBe(5);
  });

  test("excludes zero-cost rows", () => {
    const wb = buildCostWorkbook(
      [],
      [],
      [],
      makeUser(),
      exploded([
        makeCostItem({ pn: "ZERO-COST", qty: 5, cost: 0 }),
        makeCostItem({ pn: "OK-PN", qty: 2, cost: 50 }),
      ]),
    );
    const pns = findCellValues(getComponentiSheet(wb));
    expect(pns).not.toContain("ZERO-COST");
    expect(pns).toContain("OK-PN");
  });

  test("sorts rows by total cost descending", () => {
    const wb = buildCostWorkbook(
      [],
      [],
      [],
      makeUser(),
      exploded([
        makeCostItem({ pn: "LOW-001", qty: 1, cost: 10 }),
        makeCostItem({ pn: "HIGH-001", qty: 1, cost: 100 }),
      ]),
    );
    const sheet = getComponentiSheet(wb);
    expect(cellValue(sheet, 2, 1)).toBe("HIGH-001");
    expect(cellValue(sheet, 3, 1)).toBe("LOW-001");
  });

  test("writes correct Excel formulas for derived columns", () => {
    const wb = buildCostWorkbook(
      [],
      [],
      [],
      makeUser(),
      exploded([
        makeCostItem({ pn: "PN-A", qty: 1, cost: 100 }),
        makeCostItem({ pn: "PN-B", qty: 1, cost: 50 }),
      ]),
    );
    // header=row1, PN-A=row2, PN-B=row3, TOTALE=row4
    const sheet = getComponentiSheet(wb);
    expect(cellFormula(sheet, 2, 5)).toBe("C2*D2");
    expect(cellFormula(sheet, 2, 6)).toBe("E2/$E$4");
    expect(cellFormula(sheet, 2, 7)).toBe("SUM($E$2:E2)/$E$4");
  });

  test("TOTALE row is present with SUM formula for total cost", () => {
    const wb = buildCostWorkbook(
      [],
      [],
      [],
      makeUser(),
      exploded([makeCostItem({ pn: "PN-X", qty: 2, cost: 50 })]),
    );
    // header=row1, PN-X=row2, TOTALE=row3
    const sheet = getComponentiSheet(wb);
    expect(cellValue(sheet, 3, 1)).toBe("TOTALE");
    expect(cellFormula(sheet, 3, 5)).toBe("SUM(E2:E2)");
  });

  test("highlights vital-few rows (top 80%) with yellow fill", () => {
    const wb = buildCostWorkbook(
      [],
      [],
      [],
      makeUser(),
      exploded([
        makeCostItem({ pn: "BIG", qty: 1, cost: 900 }),
        makeCostItem({ pn: "SMALL", qty: 1, cost: 100 }),
      ]),
    );
    const sheet = getComponentiSheet(wb);
    expect(cellFillArgb(sheet, 2, 1)).toBe("FFF2CC");
    expect(cellFillArgb(sheet, 3, 1)).not.toBe("FFF2CC");
  });

  test("header row is frozen", () => {
    const wb = buildCostWorkbook([], [], [], makeUser(), exploded([]));
    const sheet = getComponentiSheet(wb);
    expect(sheet.views[0]).toMatchObject({ state: "frozen", ySplit: 1 });
  });

  test("empty exploded BOM produces sheet with only header row and no crash", () => {
    const wb = buildCostWorkbook([], [], [], makeUser(), exploded([]));
    const sheet = getComponentiSheet(wb);
    expect(sheet.rowCount).toBe(1);
  });
});
