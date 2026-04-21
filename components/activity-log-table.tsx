import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ActivityLogEntry } from "@/db/queries";
import { formatDateDDMMYYYYHHMM } from "@/lib/utils";
import { ActivityActionLabels } from "@/types";

interface ActivityLogTableProps {
  entries: ActivityLogEntry[];
  page: number;
  totalCount: number;
  pageSize: number;
  userId: string;
}

const headers = ["Azione", "Entità", "Dettagli", "Data"];

const ActivityLogTable = ({
  entries,
  page,
  totalCount,
  pageSize,
  userId,
}: ActivityLogTableProps) => {
  const totalPages = Math.ceil(totalCount / pageSize);
  const hasPrev = page > 1;
  const hasNext = page < totalPages;

  return (
    <div className="w-full">
      <div className="rounded-md sm:border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              {headers.map((header) => (
                <TableHead key={header} className="uppercase text-xs">
                  {header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.length > 0 ? (
              entries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="text-sm font-medium">
                    {ActivityActionLabels[entry.action]}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {entry.target_entity} #{entry.target_id}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                    {entry.metadata
                      ? Object.entries(
                          entry.metadata as Record<string, unknown>,
                        )
                          .map(([k, v]) => `${k}: ${v}`)
                          .join(", ")
                      : "—"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDateDDMMYYYYHHMM(entry.created_at)}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={headers.length}>
                  Nessuna attività registrata.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-end gap-4 mt-4">
          <span className="text-sm text-muted-foreground">
            Pagina {page} di {totalPages}
          </span>
          <div className="flex gap-2">
            {hasPrev ? (
              <Button variant="outline" size="sm" asChild>
                <Link href={`/gestione/utenti/${userId}?page=${page - 1}`}>
                  Precedente
                </Link>
              </Button>
            ) : (
              <Button variant="outline" size="sm" disabled>
                Precedente
              </Button>
            )}
            {hasNext ? (
              <Button variant="outline" size="sm" asChild>
                <Link href={`/gestione/utenti/${userId}?page=${page + 1}`}>
                  Successiva
                </Link>
              </Button>
            ) : (
              <Button variant="outline" size="sm" disabled>
                Successiva
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ActivityLogTable;
