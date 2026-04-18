import * as XLSX from "xlsx";

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
  XLSX.writeFile(workbook, `${filenameBase}.xls`, {
    compression: true,
    bookType: "xls",
  });
}
