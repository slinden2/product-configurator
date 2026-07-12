"use client";

import { useEffect, useState } from "react";

export type BomSortKey = "pn" | "description";

interface SortState {
  key: BomSortKey | null;
  direction: "asc" | "desc";
}

/**
 * Sorting state for BOM-style tables: rows start (and re-sync on `rows`
 * changes) sorted by `pn` ascending; `sortTable` re-sorts by a column,
 * toggling direction on repeated clicks. `setDataArr` is exposed for tables
 * that patch rows in place (qty edits, soft deletes).
 */
export function useSortedRows<T extends Record<BomSortKey, string>>(rows: T[]) {
  const [dataArr, setDataArr] = useState<T[]>(() => sortByPn(rows));
  const [sorting, setSorting] = useState<SortState>({
    key: "pn",
    direction: "asc",
  });

  // Sync local state when the rows prop changes (e.g. after adding a row)
  useEffect(() => {
    setDataArr(sortByPn(rows));
    setSorting({ key: "pn", direction: "asc" });
  }, [rows]);

  function sortTable(key: SortState["key"]) {
    if (!key) return;
    let direction: SortState["direction"] = "asc";
    if (sorting.key === key) {
      direction = sorting.direction === "asc" ? "desc" : "asc";
    }
    const sortedData = [...dataArr].sort((a, b) => {
      if (a[key] < b[key]) return direction === "asc" ? -1 : 1;
      if (a[key] > b[key]) return direction === "asc" ? 1 : -1;
      return 0;
    });
    setDataArr(sortedData);
    setSorting({ key, direction });
  }

  return { dataArr, setDataArr, sortTable };
}

function sortByPn<T extends { pn: string }>(arr: T[]): T[] {
  return [...arr].sort((a, b) => a.pn.localeCompare(b.pn));
}
