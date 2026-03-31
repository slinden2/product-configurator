import { groupByTag, hasTagData } from "@/lib/BOM/tag-utils";
import { UserData } from "@/db/queries";
import { BOMItemWithCost } from "@/lib/BOM";
import { BomTag, BomTagLabels } from "@/types";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

export type BOM = BOMItemWithCost[];

const COLORS = {
  white: "ffffff",
  lightGray: "f0f0f0",
  sectionTitleBg: "4472C4",
  sectionTitleFont: "FFFFFF",
  subSectionBg: "D9E1F2",
  subtotalBg: "FFF2CC",
  grandTotalBg: "FFD966",
} as const;

export function buildCostWorkbook(
  generalBOM: BOM,
  waterTankBOMs: BOM[],
  washBayBOMs: BOM[],
  user: NonNullable<UserData>,
): ExcelJS.Workbook {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = user.initials || user.id;
  const sheet = workbook.addWorksheet("Costi");

  // Columns and formatting
  sheet.columns = [
    { key: "pn", width: 20 },
    { key: "description", width: 60 },
    { key: "qty", width: 10 },
    { key: "unit_cost", width: 13 },
    { key: "total_cost", width: 13 },
  ];

  sheet.getColumn("description").alignment = { wrapText: true };

  const unitCostColumn = sheet.getColumn("unit_cost");
  unitCostColumn.numFmt = "€ #,##0.00";

  const totalCostColumn = sheet.getColumn("total_cost");
  totalCostColumn.numFmt = "€ #,##0.00";

  const headers = ["Codice", "Descrizione", "Qta", "Costo Unit.", "Costo Tot."];
  const headerRowNums: number[] = [];

  const rowBgColors = {
    light: COLORS.white,
    dark: COLORS.lightGray,
  };

  // Helpers
  const applyBorder = (row: ExcelJS.Row, bgColor: string) => {
    row.eachCell({ includeEmpty: true }, (cell) => {
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: bgColor },
      };
    });
  };

  const addItemRow = (item: BOMItemWithCost, bgColor: string) => {
    const row = sheet.addRow({
      pn: item.pn,
      description: item.description,
      qty: item.qty,
      unit_cost: item.cost,
      total_cost: item.cost * item.qty,
    });
    applyBorder(row, bgColor);
  };

  const addSectionTitle = (title: string, skipSpacing = false) => {
    if (!skipSpacing) {
      sheet.addRow([]);
      sheet.addRow([]);
    }
    const titleRow = sheet.addRow([title]);

    // Apply styling to cells A through E
    [1, 2, 3, 4, 5].forEach((col) => {
      const cell = titleRow.getCell(col);
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: COLORS.sectionTitleBg },
      };
      cell.font = {
        bold: true,
        size: 14,
        color: { argb: COLORS.sectionTitleFont },
      };
      cell.alignment = {
        vertical: "middle",
        horizontal: "left",
        shrinkToFit: false,
      };
    });

    // Set the text in the first cell only, but style all five
    titleRow.getCell(1).value = title;
    titleRow.height = 20;
  };

  const addColumnHeaders = () => {
    sheet.addRow([]);
    const headerRow = sheet.addRow(headers);
    headerRowNums.push(headerRow.number);
    sheet.getCell(`${unitCostColumn.letter}${headerRow.number}`).alignment = {
      horizontal: "center",
    };
    sheet.getCell(`${totalCostColumn.letter}${headerRow.number}`).alignment = {
      horizontal: "center",
    };
  };

  const addTagGroupSubtotal = (
    label: string,
    startRow: number,
    endRow: number,
  ) => {
    const subtotalRow = sheet.addRow([]);
    subtotalRow.getCell(1).value = label;
    subtotalRow.getCell(5).value = {
      formula: `SUM(${totalCostColumn.letter}${startRow}:${totalCostColumn.letter}${endRow})`,
    };
    subtotalRow.eachCell({ includeEmpty: true }, (cell) => {
      cell.font = { bold: true };
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: COLORS.subtotalBg },
      };
    });
    subtotalRow.getCell(5).numFmt = "€ #,##0.00";
    subtotalRow.getCell(5).alignment = { horizontal: "right" };
  };

  const addBOMSection = (
    boms: BOM[],
    title: string,
    itemPrefix?: string,
  ): { startRow: number; endRow: number }[] => {
    if (boms.length === 0) return [];

    addSectionTitle(title);
    const ranges: { startRow: number; endRow: number }[] = [];

    boms.forEach((bom, index) => {
      if (itemPrefix) {
        sheet.addRow([]);
        const subTitleRow = sheet.addRow([`${itemPrefix} ${index + 1}`]);
        subTitleRow.getCell(1).font = { bold: true, size: 12 };
        subTitleRow.getCell(1).fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: COLORS.subSectionBg },
        };
      }

      addColumnHeaders();

      const startRow = sheet.rowCount + 1;
      bom.forEach((item, i) => {
        const bgColor = i % 2 === 0 ? rowBgColors.light : rowBgColors.dark;
        addItemRow(item, bgColor);
      });
      const endRow = sheet.rowCount;
      ranges.push({ startRow, endRow });
      if (itemPrefix) {
        addTagGroupSubtotal(
          `Subtotale ${itemPrefix} ${index + 1}`,
          startRow,
          endRow,
        );
      }
    });

    return ranges;
  };

  // Reserve space for summary (we'll fill it in at the end)
  const summaryStartRow = 1;
  const summaryRowCount = 7; // Title + blank + header + 3 data rows + total
  for (let i = 0; i < summaryRowCount; i++) {
    sheet.addRow([]);
  }

  // Track row ranges for each section
  const generalRanges: { startRow: number; endRow: number }[] = [];

  // General BOM section
  addSectionTitle("Distinta generale");

  if (hasTagData(generalBOM)) {
    const tagGroups = groupByTag(generalBOM);
    tagGroups.forEach((items, tag: BomTag) => {
      sheet.addRow([]);
      const subTitleRow = sheet.addRow([BomTagLabels[tag]]);
      subTitleRow.getCell(1).font = { bold: true, size: 12 };
      subTitleRow.getCell(1).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: COLORS.subSectionBg },
      };

      addColumnHeaders();

      const startRow = sheet.rowCount + 1;
      items.forEach((item, i) => {
        const bgColor = i % 2 === 0 ? rowBgColors.light : rowBgColors.dark;
        addItemRow(item, bgColor);
      });
      const endRow = sheet.rowCount;
      generalRanges.push({ startRow, endRow });
      addTagGroupSubtotal(`Subtotale ${BomTagLabels[tag]}`, startRow, endRow);
    });
  } else {
    // Legacy: flat list (no tags)
    addColumnHeaders();
    const startRow = sheet.rowCount + 1;
    generalBOM.forEach((item, i) => {
      const bgColor = i % 2 === 0 ? rowBgColors.light : rowBgColors.dark;
      addItemRow(item, bgColor);
    });
    const endRow = sheet.rowCount;
    if (endRow >= startRow) {
      generalRanges.push({ startRow, endRow });
    }
  }

  // Water Tanks sections
  const waterTankRanges = addBOMSection(waterTankBOMs, "Serbatoi", "Serbatoio");

  // Wash Bays sections
  const washBayRanges = addBOMSection(washBayBOMs, "Piste", "Pista");

  // Now go back and fill in the summary table with formulas
  let currentRow = summaryStartRow;

  // Title
  const titleRow = sheet.getRow(currentRow++);
  titleRow.getCell(1).value = "Riepilogo costi";
  titleRow.getCell(1).font = { bold: true, size: 16 };
  titleRow.height = 25;

  currentRow++; // Blank row

  // Header
  const headerRow = sheet.getRow(currentRow++);
  headerRow.getCell(1).value = "Sezione";
  headerRow.getCell(2).value = "Costo";
  headerRow.eachCell((cell) => {
    cell.font = { bold: true };
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: rowBgColors.dark },
    };
    cell.border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };
  });

  // Helper to create SUM formula
  const createSumFormula = (ranges: { startRow: number; endRow: number }[]) => {
    if (ranges.length === 0) return "0";
    const sumParts = ranges.map(
      (r) =>
        `${totalCostColumn.letter}${r.startRow}:${totalCostColumn.letter}${r.endRow}`,
    );
    return `SUM(${sumParts.join(",")})`;
  };

  // Data rows
  const sections = [
    { name: "Distinta generale", ranges: generalRanges },
    { name: "Serbatoi", ranges: waterTankRanges },
    { name: "Piste", ranges: washBayRanges },
  ];

  sections.forEach((section, index) => {
    const row = sheet.getRow(currentRow++);
    row.getCell(1).value = section.name;
    row.getCell(2).value = { formula: createSumFormula(section.ranges) };

    const bgColor = index % 2 === 0 ? rowBgColors.light : rowBgColors.dark;
    row.eachCell((cell) => {
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: bgColor },
      };
    });
    row.getCell(2).numFmt = "€ #,##0.00";
    row.getCell(2).alignment = { horizontal: "right" };
  });

  // Total row
  const allRanges = [...generalRanges, ...waterTankRanges, ...washBayRanges];
  const totalRowObj = sheet.getRow(currentRow);
  totalRowObj.getCell(1).value = "TOTALE";
  totalRowObj.getCell(2).value = { formula: createSumFormula(allRanges) };
  totalRowObj.eachCell((cell) => {
    cell.font = { bold: true };
    cell.border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: COLORS.grandTotalBg },
    };
  });
  totalRowObj.getCell(2).numFmt = "€ #,##0.00";
  totalRowObj.getCell(2).alignment = { horizontal: "right" };

  // Header styling
  headerRowNums.forEach((rowNum) => {
    const row = sheet.getRow(rowNum);
    row.eachCell({ includeEmpty: true }, (cell) => {
      cell.font = { bold: true };
      cell.alignment = { horizontal: "center" };
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: rowBgColors.dark },
      };
    });
  });

  return workbook;
}

export async function createExcelFile(
  generalBOM: BOM,
  waterTankBOMs: BOM[],
  washBayBOMs: BOM[],
  user: NonNullable<UserData>,
) {
  const workbook = buildCostWorkbook(
    generalBOM,
    waterTankBOMs,
    washBayBOMs,
    user,
  );
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  saveAs(blob, "costi.xlsx");
}
