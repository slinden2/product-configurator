"use client";

import { Clock, Pencil, RotateCcw, Trash2 } from "lucide-react";
import { RowActionsMenu } from "@/components/shared/row-actions-menu";
import { Badge } from "@/components/ui/badge";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { TableCell, TableRow } from "@/components/ui/table";
import type { PriceCoefficientWithUpdater } from "@/db/queries";
import { formatDateDDMMYYYYHHMM, formatEur } from "@/lib/utils";

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
  /** True while a reset/delete for any row is in flight — disables the menu. */
  busy: boolean;
  onEdit: (row: PriceCoefficientWithUpdater) => void;
  onReset: (row: PriceCoefficientWithUpdater) => void;
  onDelete: (row: PriceCoefficientWithUpdater) => void;
}

/**
 * A single coefficient row. Presentational: the edit dialog and the reset/delete
 * confirmations are shared, single instances owned by CoefficientsTable and
 * opened via the callbacks below — the row only renders cells and its action
 * menu, so the DOM holds one dialog set regardless of row count.
 */
export default function CoefficientRow({
  row,
  isOrphan,
  defaultCoefficient,
  busy,
  onEdit,
  onReset,
  onDelete,
}: CoefficientRowProps) {
  const isMaxBom = row.source === "MAXBOM";
  const isDefault = isMaxBom && !row.is_custom;
  const canReset = isMaxBom && row.is_custom && !isOrphan;
  const canDelete = !isMaxBom || isOrphan;

  const statusKey: StatusKey = isDefault
    ? "predefinito"
    : isMaxBom
      ? "personalizzato"
      : "manuale";

  return (
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
        {row.cost ? formatEur(Number(row.cost) * Number(row.coefficient)) : "—"}
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
            <DropdownMenuItem disabled={busy} onSelect={() => onEdit(row)}>
              <Pencil />
              Modifica coefficiente
            </DropdownMenuItem>
            {canReset && (
              <DropdownMenuItem disabled={busy} onSelect={() => onReset(row)}>
                <RotateCcw />
                {`Ripristina al predefinito (${defaultCoefficient.toFixed(2)}x)`}
              </DropdownMenuItem>
            )}
            {canDelete && (
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                disabled={busy}
                onSelect={() => onDelete(row)}
              >
                <Trash2 />
                Elimina coefficiente
              </DropdownMenuItem>
            )}
          </RowActionsMenu>
        </div>
      </TableCell>
    </TableRow>
  );
}
