import type ExcelJS from "exceljs";
import { saveAs } from "file-saver";

export const COLORS = {
  white: "ffffff",
  lightGray: "f0f0f0",
  sectionTitleBg: "4472C4",
  sectionTitleFont: "FFFFFF",
  subSectionBg: "D9E1F2",
  subtotalBg: "FFF2CC",
  grandTotalBg: "FFD966",
} as const;

export const EUR_FMT = "€ #,##0.00";

export const THIN_BORDER: Partial<ExcelJS.Borders> = {
  top: { style: "thin" },
  left: { style: "thin" },
  bottom: { style: "thin" },
  right: { style: "thin" },
};

export async function downloadWorkbook(
  workbook: ExcelJS.Workbook,
  filename: string,
): Promise<void> {
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  saveAs(blob, filename);
}

export function fillRowWithBorder(
  row: ExcelJS.Row,
  colSpan: number,
  bgColor: string,
): void {
  for (let col = 1; col <= colSpan; col++) {
    const cell = row.getCell(col);
    cell.border = THIN_BORDER;
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: bgColor },
    };
  }
}

export function addSectionTitleRow(
  sheet: ExcelJS.Worksheet,
  title: string,
  colSpan: number,
  skipSpacing = false,
): ExcelJS.Row {
  if (!skipSpacing) {
    sheet.addRow([]);
    sheet.addRow([]);
  }
  const row = sheet.addRow([title]);
  for (let col = 1; col <= colSpan; col++) {
    const cell = row.getCell(col);
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
    cell.alignment = { vertical: "middle", horizontal: "left" };
  }
  row.getCell(1).value = title;
  row.height = 20;
  return row;
}

export function addSubSectionTitleRow(
  sheet: ExcelJS.Worksheet,
  title: string,
): ExcelJS.Row {
  sheet.addRow([]);
  const row = sheet.addRow([title]);
  row.getCell(1).font = { bold: true, size: 12 };
  row.getCell(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: COLORS.subSectionBg },
  };
  return row;
}

export function addColumnHeaderRow(
  sheet: ExcelJS.Worksheet,
  headers: string[],
): ExcelJS.Row {
  sheet.addRow([]);
  return sheet.addRow(headers);
}

export function applyHeaderRowStyling(
  sheet: ExcelJS.Worksheet,
  rowNums: number[],
  colSpan: number,
): void {
  for (const rowNum of rowNums) {
    const row = sheet.getRow(rowNum);
    for (let col = 1; col <= colSpan; col++) {
      const cell = row.getCell(col);
      cell.font = { bold: true };
      cell.alignment = { horizontal: "center" };
      cell.border = THIN_BORDER;
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: COLORS.lightGray },
      };
    }
  }
}
