"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { SurchargeSetting } from "@/db/schemas/surcharge-settings";
import SurchargeRow from "./surcharge-row";

interface SurchargesTableProps {
  rows: SurchargeSetting[];
}

export default function SurchargesTable({ rows }: SurchargesTableProps) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="uppercase text-xs">Tipo</TableHead>
            <TableHead className="uppercase text-xs whitespace-nowrap text-right">
              Prezzo
            </TableHead>
            <TableHead className="uppercase text-xs whitespace-nowrap">
              Ultimo aggiornamento
            </TableHead>
            <TableHead className="uppercase text-xs">Azioni</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length > 0 ? (
            rows.map((row) => <SurchargeRow key={row.kind} row={row} />)
          ) : (
            <TableRow>
              <TableCell
                colSpan={4}
                className="text-center text-muted-foreground text-sm"
              >
                Nessuna maggiorazione trovata.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
