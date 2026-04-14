"use client";

import { Copy, Edit, ScrollText, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { deleteConfigurationAction } from "@/app/actions/delete-configuration-action";
import { duplicateConfigurationAction } from "@/app/actions/duplicate-configuration-action";
import { isEditable } from "@/app/actions/lib/auth-checks";
import ConfigurationStatusBadge from "@/components/all-configuration-table/configuration-status-badge";
import IconButton from "@/components/all-configuration-table/icon-button";
import { ConfirmModal } from "@/components/confirm-modal";
import { TableCell, TableRow } from "@/components/ui/table";
import type { AllConfigurations, UserData } from "@/db/queries";
import { MSG } from "@/lib/messages";
import { formatDateDDMMYYYYHHMM } from "@/lib/utils";

interface ConfigurationRowProps {
  configuration: NonNullable<AllConfigurations> extends Array<infer T>
    ? T
    : never;
  user: NonNullable<UserData>;
}

const ConfigurationRow = ({ configuration, user }: ConfigurationRowProps) => {
  const router = useRouter();
  const canEdit =
    ["ADMIN", "ENGINEER"].includes(user.role) ||
    configuration.user.id === user.id;
  const canDelete = canEdit && isEditable(configuration.status, user.role);
  const canDuplicate = canEdit;
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDuplicating, setIsDuplicating] = useState(false);

  const performDelete = useCallback(async () => {
    if (!canDelete) return;

    setIsDeleting(true);
    try {
      const response = await deleteConfigurationAction(configuration.id);
      if (!response.success) {
        toast.error(MSG.toast.deleteError);
      } else {
        toast.success(MSG.toast.configDeleted);
      }
    } catch (error) {
      toast.error(MSG.toast.deleteError);
      console.error("Delete failed:", error);
    } finally {
      setIsDeleting(false);
      setIsConfirmDeleteOpen(false);
    }
  }, [canDelete, configuration.id]);

  const performDuplicate = useCallback(async () => {
    if (!canDuplicate) return;
    setIsDuplicating(true);
    try {
      const response = await duplicateConfigurationAction(configuration.id);
      if (!response.success) {
        toast.error(response.error ?? MSG.toast.duplicateError);
        return;
      }
      toast.success(MSG.toast.configDuplicated);
      router.push(`/configurazioni/modifica/${response.id}`);
    } catch (error) {
      toast.error(MSG.toast.duplicateError);
      console.error("Duplicate failed:", error);
    } finally {
      setIsDuplicating(false);
    }
  }, [canDuplicate, configuration.id, router]);

  const handleDeleteClick = () => {
    if (!canDelete) return;
    setIsConfirmDeleteOpen(true);
  };

  return (
    <>
      <TableRow>
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
          {formatDateDDMMYYYYHHMM(configuration.created_at)}
        </TableCell>
        <TableCell>
          {formatDateDDMMYYYYHHMM(configuration.updated_at)}
        </TableCell>
        <TableCell className="flex gap-3">
          <IconButton
            className="w-8 h-8"
            Icon={Edit}
            linkTo={`/configurazioni/modifica/${configuration.id}`}
            title="Modifica configurazione"
            variant="ghost"
            disabled={!canEdit}
          />
          <IconButton
            className="w-8 h-8"
            Icon={ScrollText}
            linkTo={`/configurazioni/bom/${configuration.id}`}
            title="Visualizza distinta"
            variant="ghost"
            disabled={false}
          />
          <IconButton
            className="w-8 h-8"
            Icon={Copy}
            title="Duplica configurazione"
            variant="ghost"
            disabled={!canDuplicate || isDuplicating}
            onClick={performDuplicate}
          />
          <IconButton
            className="w-8 h-8 text-red-500 hover:text-red-500"
            Icon={Trash2}
            title="Elimina configurazione"
            variant="ghost"
            disabled={!canDelete}
            onClick={handleDeleteClick}
          />
        </TableCell>
      </TableRow>

      {/* Render the Confirmation Modal */}
      <ConfirmModal
        isOpen={isConfirmDeleteOpen}
        onOpenChange={setIsConfirmDeleteOpen}
        title="Conferma eliminazione"
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
