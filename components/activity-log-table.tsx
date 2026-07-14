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

// The per-user log has no actor column, the global one joins the actor's email.
type ActivityLogTableEntry = ActivityLogEntry & { user_email?: string };

interface ActivityLogTableProps {
  entries: ActivityLogTableEntry[];
  page: number;
  totalCount: number;
  pageSize: number;
  buildHref: (page: number) => string;
  /** Adds the "Utente" column — for the cross-user (global) log. */
  showUser?: boolean;
}

const BASE_HEADERS = ["Azione", "Entità", "Dettagli", "Data"];

const ActivityLogTable = ({
  entries,
  page,
  totalCount,
  pageSize,
  buildHref,
  showUser = false,
}: ActivityLogTableProps) => {
  const totalPages = Math.ceil(totalCount / pageSize);
  const headers = showUser ? ["Utente", ...BASE_HEADERS] : BASE_HEADERS;

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
                  {showUser && (
                    <TableCell className="text-sm text-muted-foreground">
                      {entry.user_email ?? "—"}
                    </TableCell>
                  )}
                  <TableCell className="text-sm font-medium">
                    {ActivityActionLabels[entry.action]}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {entry.target_entity} #{entry.target_id}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                    {entry.metadata
                      ? Object.entries(entry.metadata)
                          .map(
                            ([k, v]) =>
                              `${k}: ${
                                typeof v === "object" && v !== null
                                  ? JSON.stringify(v)
                                  : String(v)
                              }`,
                          )
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
        buildHref={buildHref}
      />
    </div>
  );
};

export default ActivityLogTable;
