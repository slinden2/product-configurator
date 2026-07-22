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
} from "@/lib/excel/workbook-builder";
import { formatDiscountPctLabel } from "@/lib/money";
import type {
  OfferExportLine,
  OfferRevisionExportData,
} from "@/lib/offer-export";
import { sumSurchargeTotal } from "@/lib/offer-surcharges";

/**
 * Builds the customer-facing offer workbook for one revision. A revision can own
 * many lines (configurations), so each line gets its own section; the offer-level
 * riepilogo (discount / transport / installation / net total) is appended once at
 * the end, mirroring the on-screen QuoteView.
 *
 * The sheet always keeps 4 columns so the riepilogo amounts live in the last one;
 * in net-total-only mode the per-item price column and per-section subtotals are
 * dropped, leaving only the final net total.
 */
export function buildOfferWorkbook(
  data: OfferRevisionExportData,
  creatorInitials: string,
): ExcelJS.Workbook {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = creatorInitials;
  const sheet = workbook.addWorksheet("Offerta");

  const netOnly = !data.showPrices;
  const bodyColCount = netOnly ? 3 : 4;

  sheet.columns = [
    { key: "pn", width: 20 },
    { key: "description", width: 60 },
    { key: "qty", width: 10 },
    { key: "list_price", width: 16 },
  ];
  sheet.getColumn("description").alignment = { wrapText: true };
  sheet.getColumn("list_price").numFmt = EUR_FMT;

  const headerRowNums: number[] = [];

  // ── Document header ─────────────────────────────────────────────────────────
  const titleRow = sheet.addRow([
    `Offerta ${data.offerNumber} — Rev ${data.revisionNo}`,
  ]);
  titleRow.getCell(1).font = { bold: true, size: 16 };
  titleRow.height = 25;
  sheet.addRow([data.customerName]).getCell(1).font = { bold: true };
  if (data.customerAddress) sheet.addRow([data.customerAddress]);
  if (data.customerEmail) sheet.addRow([data.customerEmail]);

  // ── Helpers ─────────────────────────────────────────────────────────────────
  const addColumnHeaders = () => {
    const labels = ["Codice", "Descrizione", "Qta"];
    if (!netOnly) labels.push("Prezzo Listino");
    headerRowNums.push(addColumnHeaderRow(sheet, labels).number);
  };

  const addItemRow = (
    item: { pn: string; description: string; qty: number; price?: number },
    bgColor: string,
  ) => {
    const row = sheet.addRow({
      pn: item.pn,
      description: item.description,
      qty: item.qty,
      ...(netOnly || item.price === undefined
        ? {}
        : { list_price: item.price }),
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

  const addItemsSubSection = (
    title: string,
    rows: { pn: string; description: string; qty: number; price?: number }[],
    subtotalLabel: string,
    subtotal: number,
  ) => {
    addSubSectionTitleRow(sheet, title);
    addColumnHeaders();
    rows.forEach((item, i) => {
      addItemRow(item, i % 2 === 0 ? COLORS.white : COLORS.lightGray);
    });
    addSubtotalRow(subtotalLabel, subtotal);
  };

  const addLine = (line: OfferExportLine) => {
    addSectionTitleRow(sheet, line.title, bodyColCount);

    for (const group of line.data.general) {
      addItemsSubSection(
        group.label,
        group.items,
        `Subtotale ${group.label}`,
        group.total,
      );
    }
    for (const section of line.data.waterTanks) {
      addItemsSubSection(
        `Serbatoio ${section.index + 1}`,
        section.items,
        `Subtotale Serbatoio ${section.index + 1}`,
        section.total,
      );
    }
    for (const section of line.data.washBays) {
      addItemsSubSection(
        `Pista ${section.index + 1}`,
        section.items,
        `Subtotale Pista ${section.index + 1}`,
        section.total,
      );
    }
    if (line.surcharges.length > 0) {
      addItemsSubSection(
        "Maggiorazioni",
        line.surcharges.map((s) => ({
          pn: "",
          description: s.description,
          qty: s.qty,
          price: s.line_total,
        })),
        "Subtotale Maggiorazioni",
        sumSurchargeTotal(line.surcharges),
      );
    }

    addSubtotalRow(`Totale ${line.title}`, line.unitListPrice * line.quantity);
  };

  const addSummaryRow = (label: string, amount: number | null, bg: string) => {
    const row = sheet.addRow([]);
    row.getCell(1).value = label;
    if (amount !== null) {
      row.getCell(4).value = amount;
      row.getCell(4).numFmt = EUR_FMT;
      row.getCell(4).alignment = { horizontal: "right" };
    }
    row.font = { bold: true };
    fillRowWithBorder(row, 4, bg);
  };

  // ── Lines ───────────────────────────────────────────────────────────────────
  data.lines.forEach(addLine);

  // ── Offer riepilogo ─────────────────────────────────────────────────────────
  addSectionTitleRow(sheet, "Riepilogo offerta", bodyColCount);
  if (data.showPrices) {
    addSummaryRow("TOTALE LISTINO", data.totalListPrice, COLORS.grandTotalBg);
    if (data.discountPct > 0) {
      addSummaryRow(
        `Sconto (${formatDiscountPctLabel(data.discountPct)}%)`,
        -(data.totalListPrice - data.discountedTotal),
        COLORS.subtotalBg,
      );
    }
    if (data.discountedTotal !== data.totalListPrice) {
      addSummaryRow(
        "TOTALE SCONTATO",
        data.discountedTotal,
        COLORS.grandTotalBg,
      );
    }
  }
  addSummaryRow(
    data.extras.transportRow.label,
    data.extras.transportRow.amount,
    COLORS.subtotalBg,
  );
  addSummaryRow(
    data.extras.installationRow.label,
    data.extras.installationRow.amount,
    COLORS.subtotalBg,
  );
  if (data.extras.extraDiscountRow) {
    addSummaryRow(
      data.extras.extraDiscountRow.label,
      data.extras.extraDiscountRow.amount,
      COLORS.subtotalBg,
    );
  }
  if (!data.showPrices || data.extras.hasNetAdjustments) {
    addSummaryRow("TOTALE NETTO", data.extras.net_total, COLORS.grandTotalBg);
  }

  // ── Condizioni di fornitura ─────────────────────────────────────────────────
  addSectionTitleRow(sheet, "Condizioni di fornitura", bodyColCount);
  for (const line of data.supplyConditions) {
    sheet.addRow([
      line.value === null ? line.label : `${line.label}: ${line.value}`,
    ]);
  }

  applyHeaderRowStyling(sheet, headerRowNums, bodyColCount);

  return workbook;
}

export async function createOfferExcelFile(
  data: OfferRevisionExportData,
  creatorInitials: string,
  filename: string,
): Promise<void> {
  const workbook = buildOfferWorkbook(data, creatorInitials);
  await downloadWorkbook(workbook, filename);
}
