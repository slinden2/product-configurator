import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import React from "react";
import { formatDateDDMMYYHHMMSS } from "@/lib/utils";
import ConfigurationStatusBadge from "@/components/ConfigurationStatusBadge";
import { ConfigurationsForDataTable } from "@/prisma/db";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";
import Link from "next/link";

interface DataTableProps {
  configurations: ConfigurationsForDataTable;
}

const DataTable = ({ configurations }: DataTableProps) => {
  return (
    <div className="w-full mt-5">
      <div className="rounded-md sm:border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead className="text-center">Stato</TableHead>
              <TableHead>Nome del cliente</TableHead>
              <TableHead>Descrizione</TableHead>
              <TableHead>Data creazione</TableHead>
              <TableHead>Ultimo aggiornamento</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {configurations
              ? configurations.map((configuration) => (
                  <TableRow key={configuration.id}>
                    <TableCell>{configuration.id}</TableCell>
                    <TableCell>
                      <ConfigurationStatusBadge status={configuration.status} />
                    </TableCell>
                    <TableCell>{configuration.name}</TableCell>
                    <TableCell>{configuration.description}</TableCell>
                    <TableCell>
                      {formatDateDDMMYYHHMMSS(configuration.created_at)}
                    </TableCell>
                    <TableCell>
                      {formatDateDDMMYYHHMMSS(configuration.updated_at)}
                    </TableCell>
                    <TableCell>
                      <Link href={`/configurations/${configuration.id}`}>
                        <Button variant="outline" size="icon">
                          <Pencil />
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))
              : null}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default DataTable;
