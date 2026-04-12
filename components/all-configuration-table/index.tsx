import Link from "next/link";
import { redirect } from "next/navigation";
import ConfigurationRow from "@/components/all-configuration-table/configuration-row";
import { Button } from "@/components/ui/button";
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
  const hasPrev = page > 1;
  const hasNext = page < totalPages;

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
      {totalPages > 1 && (
        <div className="flex items-center justify-end gap-4 mt-4">
          <span className="text-sm text-muted-foreground">
            Pagina {page} di {totalPages}
          </span>
          <div className="flex gap-2">
            {hasPrev ? (
              <Button variant="outline" size="sm" asChild>
                <Link href={`/configurazioni?page=${page - 1}`}>
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
                <Link href={`/configurazioni?page=${page + 1}`}>
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

export default AllConfigurationsTable;
