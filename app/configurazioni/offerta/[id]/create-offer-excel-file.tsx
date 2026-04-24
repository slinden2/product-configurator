import ExcelJS from "exceljs";
import type { UserData } from "@/db/queries";
import {
  addColumnHeaderRow,
  addSectionTitleRow,
  addSubSectionTitleRow,
  applyHeaderRowStyling,
  COLORS,
  downloadWorkbook,
  EUR_FMT,
  fillRowWithBorder,
} from "@/lib/excel/workbook-builder";
import type { GroupedOfferData } from "@/lib/offer";

export type ExportOfferData = GroupedOfferData & {
  total_list_price: number;
  discounted_total: number;
};

export function buildOfferWorkbook(
  data: ExportOfferData,
  user: NonNullable<UserData>,
  discountPct: number,
): ExcelJS.Workbook {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = user.initials || user.id;
  const sheet = workbook.addWorksheet("Offerta");

  sheet.columns = [
    { key: "pn", width: 20 },
    { key: "description", width: 60 },
    { key: "qty", width: 10 },
    { key: "list_price", width: 16 },
  ];
  sheet.getColumn("description").alignment = { wrapText: true };
  sheet.getColumn("list_price").numFmt = EUR_FMT;

  const hasDiscount = discountPct > 0;
  const summaryRowCount = hasDiscount ? 9 : 7;
  for (let i = 0; i < summaryRowCount; i++) {
    sheet.addRow([]);
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  const headerRowNums: number[] = [];

  const addColumnHeaders = () => {
    const row = addColumnHeaderRow(sheet, [
      "Codice",
      "Descrizione",
      "Qta",
      "Prezzo Listino",
    ]);
    headerRowNums.push(row.number);
  };

  const addItemRow = (
    item: { pn: string; description: string; qty: number },
    bgColor: string,
  ) => {
    const row = sheet.addRow({
      pn: item.pn,
      description: item.description,
      qty: item.qty,
    });
    fillRowWithBorder(row, 4, bgColor);
  };

  const addSubtotalRow = (label: string, total: number) => {
    const row = sheet.addRow([]);
    row.getCell(1).value = label;
    row.getCell(4).value = total;
    row.getCell(4).numFmt = EUR_FMT;
    row.getCell(4).alignment = { horizontal: "right" };
    row.font = { bold: true };
    fillRowWithBorder(row, 4, COLORS.subtotalBg);
  };

  // ── Body sections ──────────────────────────────────────────────────────────

  if (data.general.length > 0) {
    addSectionTitleRow(sheet, "Distinta generale", 4);
    for (const group of data.general) {
      addSubSectionTitleRow(sheet, group.label);
      addColumnHeaders();
      group.items.forEach((item, i) => {
        addItemRow(item, i % 2 === 0 ? COLORS.white : COLORS.lightGray);
      });
      addSubtotalRow(`Subtotale ${group.label}`, group.total);
    }
  }

  if (data.waterTanks.length > 0) {
    addSectionTitleRow(sheet, "Serbatoi", 4);
    for (const section of data.waterTanks) {
      addSubSectionTitleRow(sheet, `Serbatoio ${section.index + 1}`);
      addColumnHeaders();
      section.items.forEach((item, i) => {
        addItemRow(item, i % 2 === 0 ? COLORS.white : COLORS.lightGray);
      });
      addSubtotalRow(`Subtotale Serbatoio ${section.index + 1}`, section.total);
    }
  }

  if (data.washBays.length > 0) {
    addSectionTitleRow(sheet, "Piste", 4);
    for (const section of data.washBays) {
      addSubSectionTitleRow(sheet, `Pista ${section.index + 1}`);
      addColumnHeaders();
      section.items.forEach((item, i) => {
        addItemRow(item, i % 2 === 0 ? COLORS.white : COLORS.lightGray);
      });
      addSubtotalRow(`Subtotale Pista ${section.index + 1}`, section.total);
    }
  }

  // ── Summary fill-back ──────────────────────────────────────────────────────

  const generalTotal = data.general.reduce((s, g) => s + g.total, 0);
  const waterTankTotal = data.waterTanks.reduce((s, t) => s + t.total, 0);
  const washBayTotal = data.washBays.reduce((s, b) => s + b.total, 0);

  const fillSummaryRow = (row: ExcelJS.Row, bgColor: string, bold = false) => {
    fillRowWithBorder(row, 4, bgColor);
    if (bold) row.font = { bold: true };
  };

  const setSummaryPrice = (row: ExcelJS.Row, value: number) => {
    row.getCell(4).value = value;
    row.getCell(4).numFmt = EUR_FMT;
    row.getCell(4).alignment = { horizontal: "right" };
  };

  let r = 1;

  // Row 1: title
  const titleRow = sheet.getRow(r++);
  titleRow.getCell(1).value = "Riepilogo offerta";
  titleRow.getCell(1).font = { bold: true, size: 16 };
  titleRow.height = 25;

  r++; // Row 2: blank

  // Row 3: header
  const summaryHeaderRow = sheet.getRow(r++);
  summaryHeaderRow.getCell(1).value = "Sezione";
  summaryHeaderRow.getCell(4).value = "Prezzo Listino";
  fillSummaryRow(summaryHeaderRow, COLORS.lightGray, true);
  summaryHeaderRow.getCell(1).alignment = {
    horizontal: "center",
    vertical: "middle",
  };
  summaryHeaderRow.getCell(4).alignment = {
    horizontal: "center",
    vertical: "middle",
  };

  // Rows 4–6: section subtotals
  const sections = [
    { name: "Distinta generale", total: generalTotal },
    { name: "Serbatoi", total: waterTankTotal },
    { name: "Piste", total: washBayTotal },
  ];
  sections.forEach((section, index) => {
    const row = sheet.getRow(r++);
    row.getCell(1).value = section.name;
    setSummaryPrice(row, section.total);
    fillSummaryRow(row, index % 2 === 0 ? COLORS.white : COLORS.lightGray);
  });

  // Row 7: grand list total
  const grandTotalRow = sheet.getRow(r++);
  grandTotalRow.getCell(1).value = "TOTALE LISTINO";
  setSummaryPrice(grandTotalRow, data.total_list_price);
  fillSummaryRow(grandTotalRow, COLORS.grandTotalBg, true);

  // Rows 8–9: discount (only when discountPct > 0)
  if (hasDiscount) {
    const discountAmount =
      Math.round((data.total_list_price - data.discounted_total) * 100) / 100;
    const pctLabel =
      discountPct % 1 === 0
        ? `${discountPct}`
        : discountPct.toFixed(2).replace(".", ",");

    const discountRow = sheet.getRow(r++);
    discountRow.getCell(1).value = `Sconto (${pctLabel}%)`;
    setSummaryPrice(discountRow, -discountAmount);
    fillSummaryRow(discountRow, COLORS.subtotalBg, true);

    const discountedTotalRow = sheet.getRow(r++);
    discountedTotalRow.getCell(1).value = "TOTALE SCONTATO";
    setSummaryPrice(discountedTotalRow, data.discounted_total);
    fillSummaryRow(discountedTotalRow, COLORS.grandTotalBg, true);
  }

  // ── Column header row styling ──────────────────────────────────────────────

  applyHeaderRowStyling(sheet, headerRowNums, 4);

  return workbook;
}

export async function createOfferExcelFile(
  data: ExportOfferData,
  user: NonNullable<UserData>,
  discountPct: number,
): Promise<void> {
  const workbook = buildOfferWorkbook(data, user, discountPct);
  await downloadWorkbook(workbook, `offerta.xlsx`);
}
