"use client";

import { BomTableHeads } from "@/components/shared/bom-table-heads";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useSortedRows } from "@/hooks/use-sorted-rows";
import type { BOMItemWithDescription } from "@/lib/BOM";

interface BOMDataTableProps {
  items: BOMItemWithDescription[];
}

const BOMDataTable = ({ items }: BOMDataTableProps) => {
  const { dataArr, sortTable } = useSortedRows(items);

  return (
    <Table className="mb-3 rounded-lg font-mono">
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <BomTableHeads onSort={sortTable} />
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
