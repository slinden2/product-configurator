import { UserData } from "@/db/queries";
import { BOMItemWithCost } from "@/lib/BOM";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

type BOM = BOMItemWithCost[];

export async function createExcelFile(generalBOM: BOM, waterTankBOMs: BOM[], washBayBOMs: BOM[], user: NonNullable<UserData>) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = user.initials || user.id;
  const sheet = workbook.addWorksheet("Costi");

  // Columns and formatting
  sheet.columns = [
    { key: "pn", width: 20 },
    { key: "description", width: 60 },
    { key: "cost", width: 13 },
  ]

  sheet.getColumn("description").alignment = { wrapText: true };

  const costColumn = sheet.getColumn("cost")
  costColumn.numFmt = '€ #,##0.00';

  const headers = ["Codice", "Descrizione", "Costo"]
  const headerRowNums: number[] = []

  const rowBgColors = {
    light: "ffffff",
    dark: "f0f0f0"
  }

  // Helpers
  const applyBorder = (row: ExcelJS.Row, bgColor: string) => {
    row.eachCell({ includeEmpty: true }, cell => {
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bgColor } };
    });
  };

  const addItemRow = (item: BOMItemWithCost, bgColor: string) => {
    const row = sheet.addRow({
      pn: item.pn,
      description: item.description,
      cost: item.cost,
    });
    applyBorder(row, bgColor);
  };

  const calculateBOMCost = (bom: BOM): number => {
    return bom.reduce((sum, item) => sum + (item.cost * item.qty), 0);
  };

  const addCostSummaryTable = (generalCost: number, waterTanksCost: number, washBaysCost: number) => {
    const totalCost = generalCost + waterTanksCost + washBaysCost;

    // Title
    const titleRow = sheet.addRow(["Riepilogo Costi"]);
    titleRow.getCell(1).font = { bold: true, size: 16 };
    titleRow.height = 25;

    sheet.addRow([]);

    // Table header
    const headerRow = sheet.addRow(["Sezione", "Costo"]);
    headerRow.eachCell((cell, colNumber) => {
      cell.font = { bold: true };
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: rowBgColors.dark } };
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
    });

    // Data rows
    const rows = [
      ["Distinta Generale", generalCost],
      ["Serbatoi", waterTanksCost],
      ["Piste", washBaysCost],
    ];

    rows.forEach((rowData, index) => {
      const row = sheet.addRow(rowData);
      const bgColor = index % 2 === 0 ? rowBgColors.light : rowBgColors.dark;
      row.eachCell((cell, colNumber) => {
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bgColor } };
        if (colNumber === 2) {
          cell.numFmt = '€ #,##0.00';
          cell.alignment = { horizontal: "right" };
        }
      });
    });

    // Total row
    const totalRow = sheet.addRow(["TOTALE", totalCost]);
    totalRow.eachCell((cell, colNumber) => {
      cell.font = { bold: true };
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD966" } };
      if (colNumber === 2) {
        cell.numFmt = '€ #,##0.00';
        cell.alignment = { horizontal: "right" };
      }
    });
  };

  const addSectionTitle = (title: string, skipSpacing = false) => {
    if (!skipSpacing) {
      sheet.addRow([]);
      sheet.addRow([]);
    }
    const titleRow = sheet.addRow([title]);

    // Apply styling to cells A, B, and C
    [1, 2, 3].forEach(col => {
      const cell = titleRow.getCell(col);
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "4472C4" }
      };
      cell.font = { bold: true, size: 14, color: { argb: "FFFFFF" } };
      cell.alignment = { vertical: "middle", horizontal: "left", shrinkToFit: false };
    });

    // Set the text in the first cell only, but style all three
    titleRow.getCell(1).value = title;
    titleRow.height = 20;
  };

  const addBOMSection = (boms: BOM[], title: string, itemPrefix?: string) => {
    if (boms.length === 0) return;

    addSectionTitle(title);

    boms.forEach((bom, index) => {
      if (itemPrefix && boms.length > 1) {
        sheet.addRow([]);
        const subTitleRow = sheet.addRow([`${itemPrefix} ${index + 1}`]);
        subTitleRow.getCell(1).font = { bold: true, size: 12 };
        subTitleRow.getCell(1).fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "D9E1F2" }
        };
      }

      sheet.addRow([]);
      const headerRow = sheet.addRow(headers);
      headerRowNums.push(headerRow.number);

      sheet.getCell(`${costColumn.letter}${headerRow.number}`).alignment = {
        horizontal: "center",
      };

      bom.forEach((item, i) => {
        const bgColor = i % 2 === 0 ? rowBgColors.light : rowBgColors.dark;
        addItemRow(item, bgColor);
      });
    });
  };

  // Calculate costs for summary
  const generalCost = calculateBOMCost(generalBOM);
  const waterTanksCost = waterTankBOMs.reduce((sum, bom) => sum + calculateBOMCost(bom), 0);
  const washBaysCost = washBayBOMs.reduce((sum, bom) => sum + calculateBOMCost(bom), 0);

  // Add cost summary table at the top
  addCostSummaryTable(generalCost, waterTanksCost, washBaysCost);

  // General BOM
  addSectionTitle("Distinta Generale");
  sheet.addRow([]);

  generalBOM.forEach((item, i) => {
    const bgColor = i % 2 === 0 ? rowBgColors.light : rowBgColors.dark;
    addItemRow(item, bgColor);
  });

  // Water Tanks
  addBOMSection(waterTankBOMs, "Serbatoi", "Serbatoio");

  // Wash Bays
  addBOMSection(washBayBOMs, "Piste", "Pista");

  // Header styling
  headerRowNums.forEach(rowNum => {
    const row = sheet.getRow(rowNum)
    row.eachCell({ includeEmpty: true }, cell => {
      cell.font = { bold: true }
      cell.alignment = { horizontal: "center" }
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      }
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: rowBgColors.dark } };
    })
  })

  // Write to file
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, "costi.xlsx");
}