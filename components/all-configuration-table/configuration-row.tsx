"use client";

import { deleteConfigurationAction } from "@/app/actions/delete-configuration-action";
import ConfigurationStatusBadge from "@/components/all-configuration-table/configuration-status-badge";
import IconButton from "@/components/all-configuration-table/icon-button";
import { ConfirmModal } from "@/components/confirm-modal";
import { TableCell, TableRow } from "@/components/ui/table";
import { AllConfigurations, UserData } from "@/db/queries";
import { formatDateDDMMYYHHMMSS } from "@/lib/utils";
import { Edit, ScrollText, Trash2 } from "lucide-react";
import React, { useCallback, useState } from "react";
import { toast } from "sonner";

interface ConfigurationRowProps {
  configuration: NonNullable<AllConfigurations> extends Array<infer T>
  ? T
  : never;
  user: NonNullable<UserData>;
}

const ConfigurationRow = ({ configuration, user }: ConfigurationRowProps) => {
  const canEdit = ["ADMIN", "INTERNAL"].includes(user.role) || configuration.user.id === user.id;
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const performDelete = useCallback(async () => {
    if (!canEdit) return;

    setIsDeleting(true);
    try {
      const response = await deleteConfigurationAction(
        configuration.id,
        user.id
      );
      if (!response.success) {
        toast.error("Errore durante l'eliminazione.");
      } else {
        toast.success("Configurazione eliminata con successo.");
      }
    } catch (error) {
      toast.error("Errore durante l'eliminazione.");
      console.error("Delete failed:", error);
    } finally {
      setIsDeleting(false);
      setIsConfirmDeleteOpen(false);
    }
  }, [canEdit, configuration.id, user.id]);

  const handleDeleteClick = () => {
    if (!canEdit) return;
    setIsConfirmDeleteOpen(true);
  };

  return (
    <>
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
        <TableCell>
          {formatDateDDMMYYHHMMSS(configuration.created_at)}
        </TableCell>
        <TableCell>
          {formatDateDDMMYYHHMMSS(configuration.updated_at)}
        </TableCell>
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
            onClick={handleDeleteClick}
          />
        </TableCell>
      </TableRow>

      {/* Render the Confirmation Modal */}
      <ConfirmModal
        isOpen={isConfirmDeleteOpen}
        onOpenChange={setIsConfirmDeleteOpen}
        title="Conferma Eliminazione"
        description={
          <>
            Sei sicuro di voler eliminare la configurazione{" "}
            <span className="font-semibold">{configuration.name}</span>? Questa
            azione non può essere annullata.
          </>
        }
        onConfirm={performDelete}
        confirmText="Elimina"
        confirmVariant="destructive"
        cancelText="Annulla"
        isConfirming={isDeleting}
      />
    </>
  );
};

export default ConfigurationRow;
