import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import React from "react";
import { AllConfigurations, getAuthUser } from "@/db/queries";
import { redirect } from "next/navigation";
import ConfigurationRow from "@/components/AllConfigurationsTable/ConfigurationRow";

interface AllConfigurationsTableProps {
  configurations: AllConfigurations;
}

const AllConfigurationsTable = async ({
  configurations,
}: AllConfigurationsTableProps) => {
  const user = await getAuthUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="w-full mt-5">
      <div className="rounded-md sm:border">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-center">ID</TableHead>
              <TableHead className="text-center">Stato</TableHead>
              <TableHead className="text-center">Utente</TableHead>
              <TableHead>Nome del cliente</TableHead>
              <TableHead>Descrizione</TableHead>
              <TableHead className="text-center">Data creazione</TableHead>
              <TableHead className="text-center">
                Ultimo aggiornamento
              </TableHead>
              <TableHead />
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
                <TableCell colSpan={7}>
                  Non hai ancora configurazioni.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default AllConfigurationsTable;
