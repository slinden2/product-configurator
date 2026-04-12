"use client";

import { ArrowDownUp } from "lucide-react";
import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { BOMItemWithDescription } from "@/lib/BOM";

interface BOMDataTableProps {
  items: BOMItemWithDescription[];
}

interface SortState {
  key: "pn" | "description" | null;
  direction: "asc" | "desc";
}

const BOMDataTable = ({ items }: BOMDataTableProps) => {
  const [dataArr, setDataArr] = useState<BOMItemWithDescription[]>(() =>
    [...items].sort((a, b) => a.pn.localeCompare(b.pn)),
  );
  const [sorting, setSorting] = useState<SortState>({
    key: "pn",
    direction: "asc",
  });

  function sortTable(key: SortState["key"]) {
    if (!key) return null;
    let direction: SortState["direction"] = "asc";

    if (sorting.key === key) {
      direction = sorting.direction === "asc" ? "desc" : "asc";
    } else {
      direction = "asc";
    }

    const sortedData = [...dataArr].sort((a, b) => {
      if (a[key] < b[key]) return direction === "asc" ? -1 : 1;
      if (a[key] > b[key]) return direction === "asc" ? 1 : -1;
      return 0;
    });

    setDataArr(sortedData);
    setSorting({ key, direction });
  }

  return (
    <Table className="mb-3 rounded-lg font-mono">
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className="w-16 hidden sm:table-cell">POS</TableHead>
          <TableHead
            className="w-32 py-2 cursor-pointer whitespace-nowrap"
            onClick={() => sortTable("pn")}
          >
            <span className="flex items-center">
              Codice <ArrowDownUp size={16} className="ml-1" />
            </span>
          </TableHead>
          <TableHead
            className="w-full py-2 cursor-pointer"
            onClick={() => sortTable("description")}
          >
            <span className="flex items-center">
              Descrizione <ArrowDownUp size={16} className="ml-1" />
            </span>
          </TableHead>
          <TableHead className="w-24 py-2 text-center whitespace-nowrap">
            Qtà
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody className="text-sm">
        {dataArr.map((item, key) => (
          <TableRow key={item.pn}>
            <TableCell className="hidden sm:table-cell">{key + 1}</TableCell>
            <TableCell className="w-32 py-2 whitespace-nowrap">
              {item.pn}
            </TableCell>
            <TableCell className="py-2 break-words min-w-0">
              {item.description}
            </TableCell>
            <TableCell className="w-24 py-2 text-center">{item.qty}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

export default BOMDataTable;
