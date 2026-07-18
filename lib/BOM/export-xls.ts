import * as XLSX from "xlsx";

// This is the only export in the repo that writes legacy BIFF `.xls`, and the
// sole reason the `xlsx` (SheetJS) dependency ships — every other Excel export
// uses `exceljs`, which cannot write BIFF. Both the container format AND the
// column names below are hard downstream requirements: ERP/production tooling
// consumes `.xls` and its templates/macros key off the exact CODICE/DESCRIZIONE/
// QT.A headers. Do NOT migrate this file to exceljs/`.xlsx` and do NOT rename the
// columns — either is a breaking change for end users.
type BomXlsSource = { pn: string; description: string; qty: number };

// Canonical BOM Excel column headers. Downstream Excel templates/macros depend
// on these exact names — changing them is a breaking change for end users.
const COLUMNS = {
  PN: "CODICE",
  DESCRIPTION: "DESCRIZIONE",
  QTY: "QT.A",
} as const;

export function exportBomToXls(
  items: BomXlsSource[],
  filenameBase: string,
): void {
  const rows = items.map((i) => ({
    [COLUMNS.PN]: i.pn,
    [COLUMNS.DESCRIPTION]: i.description,
    [COLUMNS.QTY]: i.qty,
  }));
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet);
  // `compression` is intentionally omitted: it is a no-op for BIFF `.xls`
  // (it applies only to zip-based `.xlsx`).
  XLSX.writeFile(workbook, `${filenameBase}.xls`, {
    bookType: "xls",
  });
}
