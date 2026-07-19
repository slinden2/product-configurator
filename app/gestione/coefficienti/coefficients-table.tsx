"use client";

import { AlertTriangle, Plus, RefreshCw } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  createCoefficientAction,
  deleteCoefficientAction,
  resetCoefficientAction,
  syncMaxBomCoefficientsAction,
  updateCoefficientAction,
} from "@/app/actions/coefficient-actions";
import { ConfirmModal } from "@/components/confirm-modal";
import Banner from "@/components/shared/banner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { PriceCoefficientWithUpdater } from "@/db/queries";
import { MSG } from "@/lib/messages";
import CoefficientEditorDialog from "./coefficient-editor-dialog";
import CoefficientRow, { STATUS_DISPLAY } from "./coefficient-row";

type Filter = "all" | "default" | "custom" | "manual";

const FILTER_LABELS: Record<Filter, string> = {
  all: "Tutti",
  default: "Predefiniti",
  custom: "Personalizzati",
  manual: "Manuali",
};

type RowAction = "edit" | "reset" | "delete";

interface CoefficientsTableProps {
  rows: PriceCoefficientWithUpdater[];
  missingMaxBomPns: string[];
  orphanPns: string[];
  defaultCoefficient: number;
}

export default function CoefficientsTable({
  rows,
  missingMaxBomPns,
  orphanPns,
  defaultCoefficient,
}: CoefficientsTableProps) {
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [isPending, startTransition] = useTransition();
  const [isRowActionPending, startRowAction] = useTransition();
  const [newDialogOpen, setNewDialogOpen] = useState(false);
  // Single shared target for the edit dialog and the reset/delete confirms,
  // so the DOM holds one dialog set regardless of row count.
  const [active, setActive] = useState<{
    row: PriceCoefficientWithUpdater;
    action: RowAction;
  } | null>(null);

  const query = search.trim().toLowerCase();
  const filtered = rows.filter((r) => {
    const matchesSource =
      filter === "default"
        ? r.source === "MAXBOM" && !r.is_custom
        : filter === "custom"
          ? r.source === "MAXBOM" && r.is_custom
          : filter === "manual"
            ? r.source === "MANUAL"
            : true;
    if (!matchesSource) return false;
    if (!query) return true;
    return (
      r.pn.toLowerCase().includes(query) ||
      (r.description ?? "").toLowerCase().includes(query)
    );
  });

  const editRow = active?.action === "edit" ? active.row : null;
  const resetRow = active?.action === "reset" ? active.row : null;
  const deleteRow = active?.action === "delete" ? active.row : null;

  const closeDialog = (open: boolean) => {
    if (!open) setActive(null);
  };

  const handleSync = () => {
    startTransition(async () => {
      try {
        const result = await syncMaxBomCoefficientsAction();
        if (result.success) {
          const n = result.data.inserted;
          toast.success(
            n > 0
              ? MSG.toast.coefficientSynced(n)
              : MSG.toast.coefficientSyncNone,
          );
        } else {
          toast.error(result.error ?? MSG.db.unknown);
        }
      } catch {
        toast.error(MSG.db.unknown);
      }
    });
  };

  const handleNewSave = async (coefficient: string, pn?: string) => {
    const trimmedPn = pn?.trim() ?? "";
    if (!trimmedPn) {
      toast.error(MSG.coefficient.pnRequired);
      return;
    }
    const result = await createCoefficientAction({
      pn: trimmedPn,
      coefficient,
      source: "MANUAL",
    });
    if (result.success) {
      toast.success(MSG.toast.coefficientCreated);
      setNewDialogOpen(false);
    } else {
      toast.error(result.error ?? MSG.db.unknown);
    }
  };

  const handleEditSave = async (coefficient: string) => {
    if (!editRow) return;
    const result = await updateCoefficientAction({
      pn: editRow.pn,
      coefficient,
    });
    if (result.success) {
      toast.success(MSG.toast.coefficientUpdated);
      setActive(null);
    } else {
      toast.error(result.error ?? MSG.db.unknown);
    }
  };

  const handleReset = (pn: string) => {
    startRowAction(async () => {
      try {
        const result = await resetCoefficientAction(pn);
        if (result.success) {
          toast.success(MSG.toast.coefficientReset);
        } else {
          toast.error(result.error ?? MSG.db.unknown);
        }
      } catch {
        toast.error(MSG.db.unknown);
      } finally {
        setActive(null);
      }
    });
  };

  const handleDelete = (pn: string) => {
    startRowAction(async () => {
      try {
        const result = await deleteCoefficientAction(pn);
        if (result.success) {
          toast.success(MSG.toast.coefficientDeleted);
        } else {
          toast.error(result.error ?? MSG.db.unknown);
        }
      } catch {
        toast.error(MSG.db.unknown);
      } finally {
        setActive(null);
      }
    });
  };

  return (
    <div className="space-y-4">
      {missingMaxBomPns.length > 0 && (
        <Banner
          variant="warning"
          icon={<AlertTriangle className="h-4 w-4 shrink-0" />}
          action={
            <Button
              className="text-foreground"
              size="sm"
              variant="outline"
              onClick={handleSync}
              disabled={isPending}
            >
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
              Aggiungi al listino
            </Button>
          }
        >
          {missingMaxBomPns.length} PN MaxBOM senza coefficiente.
        </Banner>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-1 flex-wrap items-center gap-2 order-2 sm:order-1">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cerca per codice o descrizione"
            aria-label="Cerca per codice o descrizione"
            className="h-8 w-full sm:w-72"
          />
          <div className="flex flex-wrap items-center gap-1">
            {(Object.keys(FILTER_LABELS) as Filter[]).map((f) => (
              <Button
                key={f}
                size="sm"
                variant={filter === f ? "secondary" : "ghost"}
                onClick={() => setFilter(f)}
              >
                {FILTER_LABELS[f]}
              </Button>
            ))}
          </div>
        </div>
        <Button
          size="sm"
          className="order-1 w-full sm:order-2 sm:w-auto"
          onClick={() => setNewDialogOpen(true)}
        >
          <Plus className="h-4 w-4 mr-1.5" />
          Nuovo coefficiente personalizzato
        </Button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <div className="flex flex-wrap items-center gap-4">
          {Object.entries(STATUS_DISPLAY).map(([key, { dot, label }]) => (
            <span key={key} className="inline-flex items-center gap-1.5">
              <span
                className={`h-2 w-2 rounded-full ${dot}`}
                aria-hidden="true"
              />
              {label}
            </span>
          ))}
        </div>
        <span>
          Coefficiente predefinito (Codice senza riga):{" "}
          {defaultCoefficient.toFixed(2)}x
        </span>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="uppercase text-xs whitespace-nowrap">
                Codice Articolo
              </TableHead>
              <TableHead className="uppercase text-xs">Descrizione</TableHead>
              <TableHead className="uppercase text-xs whitespace-nowrap text-right">
                Costo
              </TableHead>
              <TableHead className="uppercase text-xs whitespace-nowrap text-right">
                Coefficiente
              </TableHead>
              <TableHead className="uppercase text-xs whitespace-nowrap text-right">
                Prezzo Listino
              </TableHead>
              <TableHead className="uppercase text-xs whitespace-nowrap">
                Azioni
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length > 0 ? (
              filtered.map((row) => (
                <CoefficientRow
                  key={row.pn}
                  row={row}
                  isOrphan={orphanPns.includes(row.pn)}
                  defaultCoefficient={defaultCoefficient}
                  busy={isRowActionPending}
                  onEdit={(r) => setActive({ row: r, action: "edit" })}
                  onReset={(r) => setActive({ row: r, action: "reset" })}
                  onDelete={(r) => setActive({ row: r, action: "delete" })}
                />
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center text-muted-foreground text-sm"
                >
                  Nessun coefficiente trovato.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Create dialog (PN combobox in create mode) */}
      <CoefficientEditorDialog
        open={newDialogOpen}
        onOpenChange={setNewDialogOpen}
        title="Nuovo coefficiente personalizzato"
        initialCoefficient={defaultCoefficient.toFixed(2)}
        onSave={handleNewSave}
      />

      {/* Shared edit dialog — single instance targeting the selected row */}
      <CoefficientEditorDialog
        open={active?.action === "edit"}
        onOpenChange={closeDialog}
        title={editRow ? `Modifica coefficiente — ${editRow.pn}` : ""}
        pn={editRow?.pn ?? ""}
        initialCoefficient={
          editRow ? Number(editRow.coefficient).toFixed(2) : ""
        }
        onSave={handleEditSave}
      />

      {/* Shared reset confirmation */}
      <ConfirmModal
        isOpen={active?.action === "reset"}
        onOpenChange={closeDialog}
        title="Ripristina coefficiente"
        description={
          resetRow
            ? `Il coefficiente di ${resetRow.pn} verrà ripristinato al valore predefinito (${defaultCoefficient.toFixed(2)}x). Continuare?`
            : ""
        }
        confirmText="Ripristina"
        confirmVariant="default"
        onConfirm={() => {
          if (resetRow) handleReset(resetRow.pn);
        }}
        isConfirming={isRowActionPending}
      />

      {/* Shared delete confirmation */}
      <ConfirmModal
        isOpen={active?.action === "delete"}
        onOpenChange={closeDialog}
        title="Elimina coefficiente"
        description={
          deleteRow
            ? orphanPns.includes(deleteRow.pn)
              ? `Il coefficiente per ${deleteRow.pn} (non più in MaxBOM) verrà eliminato. Continuare?`
              : `Il coefficiente personalizzato per ${deleteRow.pn} verrà eliminato. Continuare?`
            : ""
        }
        confirmText="Elimina"
        onConfirm={() => {
          if (deleteRow) handleDelete(deleteRow.pn);
        }}
        isConfirming={isRowActionPending}
      />
    </div>
  );
}
