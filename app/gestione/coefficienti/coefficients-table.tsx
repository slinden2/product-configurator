"use client";

import { AlertTriangle, Plus, RefreshCw } from "lucide-react";
import { useState } from "react";
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
import CoefficientRow from "./coefficient-row";

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
  const [syncing, setSyncing] = useState(false);
  const [newDialogOpen, setNewDialogOpen] = useState(false);

  const filtered = rows.filter((r) => {
    if (filter === "default") return r.source === "MAXBOM" && !r.is_custom;
    if (filter === "custom") return r.source === "MAXBOM" && r.is_custom;
    if (filter === "manual") return r.source === "MANUAL";
    return true;
  });

  const handleSync = async () => {
    setSyncing(true);
    const result = await syncMaxBomCoefficientsAction();
    setSyncing(false);
    if (result.success) {
      const n = result.data.inserted;
      toast.success(
        n > 0 ? MSG.toast.coefficientSynced(n) : MSG.toast.coefficientSyncNone,
      );
    } else {
      toast.error(result.error ?? MSG.db.unknown);
    }
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
              disabled={syncing}
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

      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-1">
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
        <Button size="sm" onClick={() => setNewDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-1.5" />
          Nuovo coefficiente personalizzato
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        Coefficiente predefinito (PN senza riga):{" "}
        {defaultCoefficient.toFixed(2)}x
      </p>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              {[
                "Codice Articolo",
                "Coefficiente",
                "Stato",
                "Ultima Modifica",
                "Azioni",
              ].map((h) => (
                <TableHead key={h} className="uppercase text-xs">
                  {h}
                </TableHead>
              ))}
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
                  colSpan={5}
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
