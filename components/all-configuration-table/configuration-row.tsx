"use client";

import { deleteConfiguration } from "@/app/actions/delete-configuration";
import { redirectTo } from "@/app/actions/redirect-to";
import ConfigurationStatusBadge from "@/components/all-configuration-table/configuration-status-badge";
import IconButton from "@/components/all-configuration-table/icon-button";
import { TableCell, TableRow } from "@/components/ui/table";
import { AllConfigurations, UserData } from "@/db/queries";
import { formatDateDDMMYYHHMMSS } from "@/lib/utils";
import { Edit, ScrollText, Trash2 } from "lucide-react";
import React from "react";

interface ConfigurationRowProps {
  configuration: NonNullable<AllConfigurations> extends Array<infer T>
    ? T
    : never;
  user: NonNullable<UserData>;
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
      <TableCell>{configuration.id}</TableCell>
      <TableCell>
        <ConfigurationStatusBadge status={configuration.status} />
      </TableCell>
      <TableCell title={configuration.user.email || ""}>
        {configuration.user.initials || ""}
      </TableCell>
      <TableCell>{configuration.name}</TableCell>
      <TableCell>{configuration.description}</TableCell>
      <TableCell>{formatDateDDMMYYHHMMSS(configuration.created_at)}</TableCell>
      <TableCell>{formatDateDDMMYYHHMMSS(configuration.updated_at)}</TableCell>
      <TableCell className="flex gap-3">
        <IconButton
          className="w-8 h-8"
          Icon={Edit}
          linkTo={`/configurations/edit/${configuration.id}`}
          title="Modifica configurazione"
          variant="ghost"
          disabled={!canEdit}
        />
        <IconButton
          className="w-8 h-8"
          Icon={ScrollText}
          linkTo={`/configurations/bom/${configuration.id}`}
          title="Visualizza distinta"
          variant="ghost"
          disabled={false}
        />
        <IconButton
          className="w-8 h-8 text-red-500 hover:text-red-500"
          Icon={Trash2}
          title="Elimina configurazione"
          variant="ghost"
          disabled={!canEdit}
          onClick={handleDelete}
        />
      </TableCell>
    </TableRow>
  );
};

export default ConfigurationRow;
