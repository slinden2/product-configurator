import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from "@/components/ui/table";
import React from "react";

interface MetaDataTableProps {
  clientName: string;
  description: string;
}

const MetaDataTable = ({ clientName, description }: MetaDataTableProps) => {
  return (
    <Table className="mb-3 bg-muted/50 rounded-lg font-mono">
      <TableBody>
        <TableRow>
          <TableHead className="table-cell w-44">Nome del cliente:</TableHead>
          <TableCell>{clientName}</TableCell>
        </TableRow>
        <TableRow>
          <TableHead className="table-cell w-44 align-text-top p-4">
            Descrizione:
          </TableHead>
          <TableCell className="align-text-top p-4 whitespace-pre">
            {description}
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  );
};

export default MetaDataTable;
