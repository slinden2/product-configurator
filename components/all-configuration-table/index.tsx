import { redirect } from "next/navigation";
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
import { type AllConfigurations, getUserData } from "@/db/queries";

interface AllConfigurationsTableProps {
  configurations: AllConfigurations;
  page: number;
  totalCount: number;
  pageSize: number;
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

const AllConfigurationsTable = async ({
  configurations,
  page,
  totalCount,
  pageSize,
}: AllConfigurationsTableProps) => {
  const user = await getUserData();

  if (!user) {
    redirect("/login");
  }

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
            {configurations && configurations.length > 0 ? (
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
                  Non hai ancora configurazioni.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <PaginationControls
        page={page}
        totalPages={totalPages}
        buildHref={(p) => `/configurazioni?page=${p}`}
      />
    </div>
  );
};

export default AllConfigurationsTable;
