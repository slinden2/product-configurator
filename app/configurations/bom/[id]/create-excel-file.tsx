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
    { header: "Codice", key: "pn", width: 15 },
    { header: "Descrizione", key: "description", width: 60 },
    { header: "Costo", key: "cost", width: 13 },
  ]

  sheet.getColumn("description").alignment = { wrapText: true };

  const costColumn = sheet.getColumn("cost")
  costColumn.numFmt = '€ #,##0.00';

  const headers = sheet.columns.map(col => col.header)
  const headerRowNums: number[] = [1] // First rowNum added here, the rest will be added later

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

  const addBOMSection = (boms: BOM[]) => {
    if (boms.length === 0) return;

    sheet.addRow([]);
    sheet.addRow([]);

    const headerRow = sheet.addRow(headers);
    headerRowNums.push(headerRow.number);

    sheet.getCell(`${costColumn.letter}${headerRow.number}`).alignment = {
      horizontal: "center",
    };

    boms.forEach(bom => {
      bom.forEach((item, i) => {
        const bgColor = i % 2 === 0 ? rowBgColors.light : rowBgColors.dark;
        addItemRow(item, bgColor)
      })
    }
    );
  };

  generalBOM.forEach((item, i) => {
    const bgColor = i % 2 === 0 ? rowBgColors.light : rowBgColors.dark;
    addItemRow(item, bgColor)
  })
  addBOMSection(waterTankBOMs);
  addBOMSection(washBayBOMs);

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