import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import React from "react";
import { AllConfigurations } from "@/db/queries";
import ConfigurationRow from "@/components/AllConfigurationsTable/ConfigurationRow";

interface AllConfigurationsTableProps {
  configurations: AllConfigurations;
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
}: AllConfigurationsTableProps) => {
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
