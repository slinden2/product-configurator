"use client";

import { Pencil, RotateCcw, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  deleteCoefficientAction,
  resetCoefficientAction,
  updateCoefficientAction,
} from "@/app/actions/coefficient-actions";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import type { PriceCoefficientWithUpdater } from "@/db/queries";
import { MSG } from "@/lib/messages";
import { formatDateDDMMYYYYHHMM } from "@/lib/utils";
import CoefficientEditorDialog from "./coefficient-editor-dialog";

type BadgeStatus = "predefinito" | "personalizzato" | "manuale";
const STATUS_BADGE: Record<
  BadgeStatus,
  { label: string; variant: "outline" | "default" | "secondary" }
> = {
  predefinito: { label: "Predefinito", variant: "outline" },
  personalizzato: { label: "Personalizzato", variant: "default" },
  manuale: { label: "Manuale", variant: "secondary" },
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
  const [saving, setSaving] = useState(false);

  const isMaxBom = row.source === "MAXBOM";
  const isDefault = isMaxBom && !row.is_custom;

  const statusKey: BadgeStatus = isDefault
    ? "predefinito"
    : isMaxBom
      ? "personalizzato"
      : "manuale";
  const badge = STATUS_BADGE[statusKey];

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

  const handleReset = async () => {
    setSaving(true);
    const result = await resetCoefficientAction(row.pn);
    setSaving(false);
    if (result.success) {
      toast.success(MSG.toast.coefficientReset);
    } else {
      toast.error(result.error ?? MSG.db.unknown);
    }
  };

  const handleDelete = async () => {
    setSaving(true);
    const result = await deleteCoefficientAction(row.pn);
    setSaving(false);
    if (result.success) {
      toast.success(MSG.toast.coefficientDeleted);
    } else {
      toast.error(result.error ?? MSG.db.unknown);
    }
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
        <TableCell className="font-mono text-sm">
          {Number(row.coefficient).toFixed(2)}x
        </TableCell>
        <TableCell>
          <Badge variant={badge.variant} className="text-xs">
            {badge.label}
          </Badge>
        </TableCell>
        <TableCell className="text-xs text-muted-foreground">
          {row.updated_by && row.updaterEmail ? (
            <>
              {row.updaterInitials ?? row.updaterEmail} ·{" "}
              {formatDateDDMMYYYYHHMM(row.updated_at)}
            </>
          ) : (
            "—"
          )}
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              title="Modifica coefficiente"
              aria-label="Modifica coefficiente"
              disabled={saving}
              onClick={() => setEditOpen(true)}
            >
              <Pencil className="h-4 w-4" />
            </Button>

            {isMaxBom && row.is_custom && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    title={`Ripristina al predefinito (${defaultCoefficient.toFixed(2)}x)`}
                    aria-label={`Ripristina al predefinito (${defaultCoefficient.toFixed(2)}x)`}
                    disabled={saving}
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Ripristina coefficiente</AlertDialogTitle>
                    <AlertDialogDescription>
                      Il coefficiente di {row.pn} verrà ripristinato al valore
                      predefinito ({defaultCoefficient.toFixed(2)}x).
                      Continuare?
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

            {!isMaxBom && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    title="Elimina coefficiente"
                    aria-label="Elimina coefficiente"
                    disabled={saving}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Elimina coefficiente</AlertDialogTitle>
                    <AlertDialogDescription>
                      Il coefficiente personalizzato per {row.pn} verrà
                      eliminato. Continuare?
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Annulla</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDelete}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Elimina
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
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
    </>
  );
}
