"use client";

import { Copy, Edit, Receipt, ScrollText, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState, useTransition } from "react";
import { toast } from "sonner";
import { checkConfigurationValidityAction } from "@/app/actions/check-configuration-validity-action";
import { deleteConfigurationAction } from "@/app/actions/delete-configuration-action";
import { duplicateConfigurationAction } from "@/app/actions/duplicate-configuration-action";
import { isEditable } from "@/app/actions/lib/auth-checks";
import ConfigurationStatusBadge from "@/components/all-configuration-table/configuration-status-badge";
import { ConfirmModal } from "@/components/confirm-modal";
import { RowActionsMenu } from "@/components/shared/row-actions-menu";
import {
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { TableCell, TableRow } from "@/components/ui/table";
import type { AllConfigurations, UserData } from "@/db/queries";
import { canViewBom, canViewOffer } from "@/lib/access";
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
  const [isDeleting, startDelete] = useTransition();
  const [isDuplicating, startDuplicate] = useTransition();
  const [isConfirmDuplicateOpen, setIsConfirmDuplicateOpen] = useState(false);
  const [isCheckingValidity, startCheck] = useTransition();
  const [hasValidationIssues, setHasValidationIssues] = useState(false);

  const performDelete = useCallback(() => {
    if (!canDelete) return;

    startDelete(async () => {
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
        setIsConfirmDeleteOpen(false);
      }
    });
  }, [canDelete, configuration.id]);

  const performDuplicate = useCallback(() => {
    if (!canDuplicate) return;
    startDuplicate(async () => {
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
        setIsConfirmDuplicateOpen(false);
      }
    });
  }, [canDuplicate, configuration.id, router]);

  const handleDuplicateClick = useCallback(() => {
    if (!canDuplicate) return;
    // These must run eagerly so the modal opens immediately with cleared state.
    setHasValidationIssues(false);
    setIsConfirmDuplicateOpen(true);
    startCheck(async () => {
      try {
        const response = await checkConfigurationValidityAction(
          configuration.id,
        );
        if (!response.success) {
          // Advisory check failed — skip the warning but keep the modal open
          // so the user can still proceed with the duplicate.
          console.error("Validity check returned error:", response.error);
          return;
        }
        setHasValidationIssues(response.hasValidationIssues);
      } catch (error) {
        // Silently ignore — the check is advisory; the duplicate can still proceed.
        console.error("Validity check failed:", error);
      }
    });
  }, [canDuplicate, configuration.id]);

  const handleDeleteClick = () => {
    if (!canDelete) return;
    setIsConfirmDeleteOpen(true);
  };

  const editItemContent = (
    <>
      <Edit />
      Modifica configurazione
    </>
  );

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
        <TableCell>
          <RowActionsMenu>
            {canEdit ? (
              <DropdownMenuItem asChild>
                <Link
                  href={`/configurazioni/modifica/${configuration.id}`}
                  aria-label="Modifica configurazione"
                >
                  {editItemContent}
                </Link>
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem disabled aria-label="Modifica configurazione">
                {editItemContent}
              </DropdownMenuItem>
            )}
            {canViewBom(user.role) && (
              <DropdownMenuItem asChild>
                <Link
                  href={`/configurazioni/bom/${configuration.id}`}
                  aria-label="Visualizza distinta"
                >
                  <ScrollText />
                  Visualizza distinta
                </Link>
              </DropdownMenuItem>
            )}
            {canViewOffer(user.role) && (
              <DropdownMenuItem asChild>
                <Link
                  href={`/configurazioni/offerta/${configuration.id}`}
                  aria-label="Visualizza offerta"
                >
                  <Receipt />
                  Visualizza offerta
                </Link>
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              disabled={!canDuplicate || isDuplicating || isCheckingValidity}
              onSelect={handleDuplicateClick}
              aria-label="Duplica configurazione"
            >
              <Copy />
              Duplica configurazione
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              disabled={!canDelete}
              onSelect={handleDeleteClick}
              aria-label="Elimina configurazione"
            >
              <Trash2 />
              Elimina configurazione
            </DropdownMenuItem>
          </RowActionsMenu>
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
      <ConfirmModal
        isOpen={isConfirmDuplicateOpen}
        onOpenChange={(open) => {
          if (!isDuplicating) {
            setIsConfirmDuplicateOpen(open);
          }
        }}
        title={MSG.duplicateConfirm.title}
        description={
          <>
            Vuoi duplicare la configurazione{" "}
            <span className="font-semibold">{configuration.name}</span>?{" "}
            {MSG.duplicateConfirm.body}
            <span
              className={`grid transition-all duration-300 ease-in-out ${hasValidationIssues ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
            >
              <span className="overflow-hidden">
                <span className="mt-3 block text-sm text-yellow-600 dark:text-yellow-500">
                  {MSG.duplicateConfirm.validationWarning}
                </span>
              </span>
            </span>
          </>
        }
        onConfirm={performDuplicate}
        confirmText={MSG.duplicateConfirm.confirm}
        confirmVariant="default"
        isConfirming={isDuplicating}
        confirmDisabled={isCheckingValidity}
      />
    </>
  );
};

export default ConfigurationRow;
