"use client";

import { deleteConfiguration } from "@/app/actions/deleteConfiguration";
import { redirectTo } from "@/app/actions/redirectTo";
import ConfigurationStatusBadge from "@/components/AllConfigurationsTable/ConfigurationStatusBadge";
import IconButton from "@/components/AllConfigurationsTable/IconButton";
import { TableCell, TableRow } from "@/components/ui/table";
import { AllConfigurations, AuthUser } from "@/db/queries";
import { formatDateDDMMYYHHMMSS } from "@/lib/utils";
import { Pencil, ScrollText, Trash } from "lucide-react";
import React from "react";

interface ConfigurationRowProps {
  configuration: NonNullable<AllConfigurations> extends Array<infer T>
    ? T
    : never;
  user: NonNullable<AuthUser>;
}

const ConfigurationRow = ({ configuration, user }: ConfigurationRowProps) => {
  const canEdit = user.role === "ADMIN" || configuration.user.id === user.id;

  const handleDelete = async () => {
    if (!canEdit) return;

    const confirmed = window.confirm(
      "Sei sicuro di voler eliminare questa configurazione?"
    );
    if (!confirmed) return;

    const response = await deleteConfiguration(configuration.id, user.id);

    if (!response.success) {
      alert(response.error);
    } else {
      alert("Configurazione eliminata con successo.");
      redirectTo("/configurations");
    }
  };

  return (
    <TableRow key={configuration.id}>
      <TableCell className="text-center">{configuration.id}</TableCell>
      <TableCell className="text-center">
        <ConfigurationStatusBadge status={configuration.status} />
      </TableCell>
      <TableCell title={configuration.user.email || ""}>
        {configuration.user.initials || ""}
      </TableCell>
      <TableCell>{configuration.name}</TableCell>
      <TableCell>{configuration.description}</TableCell>
      <TableCell className="text-center">
        {formatDateDDMMYYHHMMSS(configuration.created_at)}
      </TableCell>
      <TableCell className="text-center">
        {formatDateDDMMYYHHMMSS(configuration.updated_at)}
      </TableCell>
      <TableCell className="flex gap-3">
        <IconButton
          Icon={Pencil}
          linkTo={`/configurations/edit/${configuration.id}`}
          title="Modifica configurazione"
          variant="outline"
          disabled={!canEdit}
        />
        <IconButton
          Icon={ScrollText}
          linkTo={`/configurations/bom/${configuration.id}`}
          title="Visualizza distinta"
          variant="outline"
          disabled={false}
        />
        <IconButton
          Icon={Trash}
          title="Elimina configurazione"
          variant="destructive"
          disabled={!canEdit}
          onClick={handleDelete}
        />
      </TableCell>
    </TableRow>
  );
};

export default ConfigurationRow;
