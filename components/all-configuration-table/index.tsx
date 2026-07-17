import ConfigurationRow from "@/components/all-configuration-table/configuration-row";
import PaginationControls from "@/components/shared/pagination-controls";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { AllConfigurations, UserData } from "@/db/queries";

interface AllConfigurationsTableProps {
  configurations: AllConfigurations;
  page: number;
  totalCount: number;
  pageSize: number;
  user: NonNullable<UserData>;
  statusSlug?: string;
}

const headers = [
  "id",
  "stato",
  "utente",
  "cliente",
  "descrizione",
  "data creazione",
  "ultimo aggiornamento",
  "azioni",
];

const AllConfigurationsTable = ({
  configurations,
  page,
  totalCount,
  pageSize,
  user,
  statusSlug,
}: AllConfigurationsTableProps) => {
  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="w-full mt-5">
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
            {configurations.length > 0 ? (
              configurations.map((configuration) => (
                <ConfigurationRow
                  key={configuration.id}
                  configuration={configuration}
                  user={user}
                />
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={headers.length}>
                  Nessuna configurazione presente.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <PaginationControls
        page={page}
        totalPages={totalPages}
        buildHref={(p) => {
          const params = new URLSearchParams();
          if (statusSlug) params.set("status", statusSlug);
          params.set("page", String(p));
          return `/configurazioni?${params.toString()}`;
        }}
      />
    </div>
  );
};

export default AllConfigurationsTable;
