"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { InstallationItemSetting } from "@/db/schemas/installation-item-settings";
import InstallationItemRow from "./installation-item-row";

interface InstallationItemsTableProps {
  rows: InstallationItemSetting[];
}

export default function InstallationItemsTable({
  rows,
}: InstallationItemsTableProps) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="uppercase text-xs">Voce</TableHead>
            <TableHead className="uppercase text-xs whitespace-nowrap text-right">
              Prezzo predefinito
            </TableHead>
            <TableHead className="uppercase text-xs whitespace-nowrap">
              Ultimo aggiornamento
            </TableHead>
            <TableHead className="uppercase text-xs">Azioni</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length > 0 ? (
            rows.map((row) => <InstallationItemRow key={row.kind} row={row} />)
          ) : (
            <TableRow>
              <TableCell
                colSpan={4}
                className="text-center text-muted-foreground text-sm"
              >
                Nessuna voce di installazione trovata.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
