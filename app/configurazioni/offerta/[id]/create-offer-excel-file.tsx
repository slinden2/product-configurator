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
import type { OfferSnapshotSettings } from "@/lib/offer-settings";
import { computeOfferSummaryExtras } from "@/lib/offer-settings";
import { sumSurchargeTotal } from "@/lib/offer-surcharges";
import { formatDiscountPctLabel } from "@/lib/utils";
import type { OfferSurchargeItem } from "@/validation/offer-schema";

export type ExportOfferData = GroupedOfferData & {
  total_list_price: number;
  discounted_total: number;
  surcharges: OfferSurchargeItem[];
};

export function buildOfferWorkbook(
  data: ExportOfferData,
  user: NonNullable<UserData>,
  discountPct: number,
  settings: OfferSnapshotSettings,
): ExcelJS.Workbook {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = user.initials || user.id;
  const sheet = workbook.addWorksheet("Offerta");

  const netOnly = settings.show_net_total_only;
  const extras = computeOfferSummaryExtras(settings, data.discounted_total);
  const showNetTotalRow = netOnly || extras.hasNetAdjustments;
  // Net-only mode drops the price column from the item tables; the sheet keeps
  // 4 columns so summary amounts always live in the last one.
  const bodyColCount = netOnly ? 3 : 4;

  sheet.columns = [
    { key: "pn", width: 20 },
    { key: "description", width: 60 },
    { key: "qty", width: 10 },
    { key: "list_price", width: 16 },
  ];
  sheet.getColumn("description").alignment = { wrapText: true };
  sheet.getColumn("list_price").numFmt = EUR_FMT;

  const hasDiscount = discountPct > 0;
  const hasSurcharges = data.surcharges.length > 0;
  const surchargeTotal = sumSurchargeTotal(data.surcharges);
  const extrasRowCount = 2 + (showNetTotalRow ? 1 : 0);
  const summaryRowCount = netOnly
    ? 2 + extrasRowCount
    : (hasDiscount ? 10 : 8) + extrasRowCount;
  for (let i = 0; i < summaryRowCount; i++) {
    sheet.addRow([]);
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  const headerRowNums: number[] = [];

  const addColumnHeaders = () => {
    const labels = ["Codice", "Descrizione", "Qta"];
    if (!netOnly) labels.push("Prezzo Listino");
    const row = addColumnHeaderRow(sheet, labels);
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
    fillRowWithBorder(row, bodyColCount, bgColor);
  };

  const addSubtotalRow = (label: string, total: number) => {
    if (netOnly) return;
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
    addSectionTitleRow(sheet, "Distinta generale", bodyColCount);
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
    addSectionTitleRow(sheet, "Serbatoi", bodyColCount);
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
    addSectionTitleRow(sheet, "Piste", bodyColCount);
    for (const section of data.washBays) {
      addSubSectionTitleRow(sheet, `Pista ${section.index + 1}`);
      addColumnHeaders();
      section.items.forEach((item, i) => {
        addItemRow(item, i % 2 === 0 ? COLORS.white : COLORS.lightGray);
      });
      addSubtotalRow(`Subtotale Pista ${section.index + 1}`, section.total);
    }
  }

  if (hasSurcharges) {
    addSectionTitleRow(sheet, "Maggiorazioni", bodyColCount);
    addColumnHeaders();
    data.surcharges.forEach((item, i) => {
      const row = sheet.addRow({
        pn: "",
        description: item.description,
        qty: item.qty,
        ...(netOnly ? {} : { list_price: item.line_total }),
      });
      fillRowWithBorder(
        row,
        bodyColCount,
        i % 2 === 0 ? COLORS.white : COLORS.lightGray,
      );
    });
    addSubtotalRow("Subtotale Maggiorazioni", surchargeTotal);
  }

  // ── Summary fill-back ──────────────────────────────────────────────────────

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

  if (!netOnly) {
    const generalTotal = data.general.reduce((s, g) => s + g.total, 0);
    const waterTankTotal = data.waterTanks.reduce((s, t) => s + t.total, 0);
    const washBayTotal = data.washBays.reduce((s, b) => s + b.total, 0);

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

    // Rows 4–7: section subtotals (Maggiorazioni always present, 0 when none)
    const sections = [
      { name: "Distinta generale", total: generalTotal },
      { name: "Serbatoi", total: waterTankTotal },
      { name: "Piste", total: washBayTotal },
      { name: "Maggiorazioni", total: surchargeTotal },
    ];
    sections.forEach((section, index) => {
      const row = sheet.getRow(r++);
      row.getCell(1).value = section.name;
      setSummaryPrice(row, section.total);
      fillSummaryRow(row, index % 2 === 0 ? COLORS.white : COLORS.lightGray);
    });

    // Row 8: grand list total
    const grandTotalRow = sheet.getRow(r++);
    grandTotalRow.getCell(1).value = "TOTALE LISTINO";
    setSummaryPrice(grandTotalRow, data.total_list_price);
    fillSummaryRow(grandTotalRow, COLORS.grandTotalBg, true);

    // Rows 9–10: discount (only when discountPct > 0)
    if (hasDiscount) {
      const discountAmount =
        Math.round((data.total_list_price - data.discounted_total) * 100) / 100;
      const pctLabel = formatDiscountPctLabel(discountPct);

      const discountRow = sheet.getRow(r++);
      discountRow.getCell(1).value = `Sconto (${pctLabel}%)`;
      setSummaryPrice(discountRow, -discountAmount);
      fillSummaryRow(discountRow, COLORS.subtotalBg, true);

      const discountedTotalRow = sheet.getRow(r++);
      discountedTotalRow.getCell(1).value = "TOTALE SCONTATO";
      setSummaryPrice(discountedTotalRow, data.discounted_total);
      fillSummaryRow(discountedTotalRow, COLORS.grandTotalBg, true);
    }
  }

  // Transport and installation rows (always shown, appearance depends on mode)
  for (const summaryRow of [extras.transportRow, extras.installationRow]) {
    const row = sheet.getRow(r++);
    row.getCell(1).value = summaryRow.label;
    if (summaryRow.amount !== null) {
      setSummaryPrice(row, summaryRow.amount);
    }
    fillSummaryRow(row, COLORS.subtotalBg, true);
  }

  // Final net total row
  if (showNetTotalRow) {
    const netTotalRow = sheet.getRow(r++);
    netTotalRow.getCell(1).value = "TOTALE NETTO";
    setSummaryPrice(netTotalRow, extras.net_total);
    fillSummaryRow(netTotalRow, COLORS.grandTotalBg, true);
  }

  // ── Column header row styling ──────────────────────────────────────────────

  applyHeaderRowStyling(sheet, headerRowNums, bodyColCount);

  return workbook;
}

export async function createOfferExcelFile(
  data: ExportOfferData,
  user: NonNullable<UserData>,
  discountPct: number,
  settings: OfferSnapshotSettings,
): Promise<void> {
  const workbook = buildOfferWorkbook(data, user, discountPct, settings);
  await downloadWorkbook(workbook, `offerta.xlsx`);
}
