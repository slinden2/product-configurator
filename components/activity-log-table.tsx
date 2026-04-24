import PaginationControls from "@/components/shared/pagination-controls";
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
      <PaginationControls
        page={page}
        totalPages={totalPages}
        buildHref={(p) => `/gestione/utenti/${userId}?page=${p}`}
      />
    </div>
  );
};

export default ActivityLogTable;
