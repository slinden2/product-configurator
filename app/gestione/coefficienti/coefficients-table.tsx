"use client";

import { AlertTriangle, Plus, RefreshCw } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  createCoefficientAction,
  syncMaxBomCoefficientsAction,
} from "@/app/actions/coefficient-actions";
import InfoBanner from "@/components/shared/info-banner";
import { Button } from "@/components/ui/button";
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
  const [isPending, startTransition] = useTransition();
  const [newDialogOpen, setNewDialogOpen] = useState(false);

  const filtered = rows.filter((r) => {
    if (filter === "default") return r.source === "MAXBOM" && !r.is_custom;
    if (filter === "custom") return r.source === "MAXBOM" && r.is_custom;
    if (filter === "manual") return r.source === "MANUAL";
    return true;
  });

  const handleSync = () => {
    startTransition(async () => {
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

  return (
    <div className="space-y-4">
      {missingMaxBomPns.length > 0 && (
        <InfoBanner
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
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {missingMaxBomPns.length} PN MaxBOM senza coefficiente.
        </InfoBanner>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1 order-2 sm:order-1">
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

      <CoefficientEditorDialog
        open={newDialogOpen}
        onOpenChange={setNewDialogOpen}
        title="Nuovo coefficiente personalizzato"
        initialCoefficient={defaultCoefficient.toFixed(2)}
        onSave={handleNewSave}
      />
    </div>
  );
}
