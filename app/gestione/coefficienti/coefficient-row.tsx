"use client";

import { Clock, Pencil, RotateCcw, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  deleteCoefficientAction,
  resetCoefficientAction,
  updateCoefficientAction,
} from "@/app/actions/coefficient-actions";
import { RowActionsMenu } from "@/components/shared/row-actions-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { TableCell, TableRow } from "@/components/ui/table";
import type { PriceCoefficientWithUpdater } from "@/db/queries";
import { MSG } from "@/lib/messages";
import { formatDateDDMMYYYYHHMM, formatEur } from "@/lib/utils";
import CoefficientEditorDialog from "./coefficient-editor-dialog";

export type StatusKey = "predefinito" | "personalizzato" | "manuale";
export const STATUS_DISPLAY: Record<StatusKey, { dot: string; label: string }> =
  {
    predefinito: { dot: "bg-slate-400", label: "Predefinito" },
    personalizzato: { dot: "bg-blue-500", label: "Personalizzato" },
    manuale: { dot: "bg-amber-500", label: "Manuale" },
  };

interface CoefficientRowProps {
  row: PriceCoefficientWithUpdater;
  isOrphan: boolean;
  defaultCoefficient: number;
}

export default function CoefficientRow({
  row,
  isOrphan,
  defaultCoefficient,
}: CoefficientRowProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const isMaxBom = row.source === "MAXBOM";
  const isDefault = isMaxBom && !row.is_custom;
  const canReset = isMaxBom && row.is_custom && !isOrphan;
  const canDelete = !isMaxBom || isOrphan;

  const statusKey: StatusKey = isDefault
    ? "predefinito"
    : isMaxBom
      ? "personalizzato"
      : "manuale";

  const handleEdit = async (coefficient: string) => {
    const result = await updateCoefficientAction({
      pn: row.pn,
      coefficient,
    });
    if (result.success) {
      toast.success(MSG.toast.coefficientUpdated);
      setEditOpen(false);
    } else {
      toast.error(result.error ?? MSG.db.unknown);
    }
  };

  const handleReset = () => {
    startTransition(async () => {
      const result = await resetCoefficientAction(row.pn);
      if (result.success) {
        toast.success(MSG.toast.coefficientReset);
      } else {
        toast.error(result.error ?? MSG.db.unknown);
      }
    });
  };

  const handleDelete = () => {
    startTransition(async () => {
      const result = await deleteCoefficientAction(row.pn);
      if (result.success) {
        toast.success(MSG.toast.coefficientDeleted);
      } else {
        toast.error(result.error ?? MSG.db.unknown);
      }
    });
  };

  return (
    <>
      <TableRow className={isDefault ? "opacity-60" : undefined}>
        <TableCell className="font-mono text-sm">
          {row.pn}
          {isOrphan && (
            <Badge
              variant="outline"
              className="ml-2 text-xs border-yellow-500 text-yellow-600 dark:text-yellow-400"
            >
              Non più in MaxBOM
            </Badge>
          )}
        </TableCell>
        <TableCell className="text-sm">
          <span
            className="block max-w-[300px] truncate"
            title={row.description ?? undefined}
          >
            {row.description ?? "—"}
          </span>
        </TableCell>
        <TableCell className="font-mono text-sm text-right tabular-nums whitespace-nowrap">
          {row.cost ? formatEur(Number(row.cost)) : "—"}
        </TableCell>
        <TableCell className="font-mono text-sm text-right tabular-nums whitespace-nowrap">
          <span className="inline-flex items-center justify-end gap-2">
            <span
              className={`h-2 w-2 rounded-full ${STATUS_DISPLAY[statusKey].dot}`}
              title={STATUS_DISPLAY[statusKey].label}
              aria-hidden="true"
            />
            <span className="sr-only">{STATUS_DISPLAY[statusKey].label}</span>
            {Number(row.coefficient).toFixed(2)}x
          </span>
        </TableCell>
        <TableCell className="font-mono text-sm text-right tabular-nums whitespace-nowrap">
          {row.cost
            ? formatEur(Number(row.cost) * Number(row.coefficient))
            : "—"}
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-1">
            {row.updated_by && row.updaterEmail && (
              <span
                className="flex h-8 w-8 items-center justify-center text-muted-foreground"
                title={`${row.updaterInitials ?? row.updaterEmail} · ${formatDateDDMMYYYYHHMM(row.updated_at)}`}
              >
                <Clock className="h-4 w-4" />
              </span>
            )}
            <RowActionsMenu>
              <DropdownMenuItem
                disabled={isPending}
                onSelect={() => setEditOpen(true)}
              >
                <Pencil />
                Modifica coefficiente
              </DropdownMenuItem>
              {canReset && (
                <DropdownMenuItem
                  disabled={isPending}
                  onSelect={() => setResetConfirmOpen(true)}
                >
                  <RotateCcw />
                  {`Ripristina al predefinito (${defaultCoefficient.toFixed(2)}x)`}
                </DropdownMenuItem>
              )}
              {canDelete && (
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  disabled={isPending}
                  onSelect={() => setDeleteConfirmOpen(true)}
                >
                  <Trash2 />
                  Elimina coefficiente
                </DropdownMenuItem>
              )}
            </RowActionsMenu>
          </div>
        </TableCell>
      </TableRow>

      <CoefficientEditorDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        title={`Modifica coefficiente — ${row.pn}`}
        pn={row.pn}
        initialCoefficient={Number(row.coefficient).toFixed(2)}
        onSave={handleEdit}
      />

      {canReset && (
        <AlertDialog open={resetConfirmOpen} onOpenChange={setResetConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Ripristina coefficiente</AlertDialogTitle>
              <AlertDialogDescription>
                Il coefficiente di {row.pn} verrà ripristinato al valore
                predefinito ({defaultCoefficient.toFixed(2)}x). Continuare?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annulla</AlertDialogCancel>
              <AlertDialogAction onClick={handleReset}>
                Ripristina
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {canDelete && (
        <AlertDialog
          open={deleteConfirmOpen}
          onOpenChange={setDeleteConfirmOpen}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Elimina coefficiente</AlertDialogTitle>
              <AlertDialogDescription>
                {isOrphan
                  ? `Il coefficiente per ${row.pn} (non più in MaxBOM) verrà eliminato. Continuare?`
                  : `Il coefficiente personalizzato per ${row.pn} verrà eliminato. Continuare?`}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annulla</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className={buttonVariants({ variant: "destructive" })}
              >
                Elimina
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}
