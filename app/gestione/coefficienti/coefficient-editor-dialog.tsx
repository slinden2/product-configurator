"use client";

import { useEffect, useState } from "react";
import NumericEditorDialog from "@/components/shared/numeric-editor-dialog";
import PartNumberCombobox from "@/components/shared/part-number-combobox";
import { Label } from "@/components/ui/label";
import type { PartNumber } from "@/db/schemas";

const STEP = 0.05;

interface CoefficientEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  initialCoefficient: string;
  /** When undefined the dialog shows a PN search combobox (create mode). */
  pn?: string;
  onSave: (coefficient: string, pn?: string) => Promise<void>;
}

export default function CoefficientEditorDialog({
  open,
  onOpenChange,
  title,
  initialCoefficient,
  pn,
  onSave,
}: CoefficientEditorDialogProps) {
  const [selectedPn, setSelectedPn] = useState<PartNumber | null>(null);
  const isCreateMode = pn === undefined;

  useEffect(() => {
    if (open) {
      setSelectedPn(null);
    }
  }, [open]);

  return (
    <NumericEditorDialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      inputId="coeff-dialog-value"
      inputLabel="Coefficiente (moltiplicatore)"
      initialValue={initialCoefficient}
      step={STEP}
      min={STEP}
      onSave={(coefficient) =>
        onSave(coefficient, isCreateMode ? (selectedPn?.pn ?? "") : undefined)
      }
    >
      {isCreateMode && (
        <div className="space-y-1.5">
          <Label htmlFor="coeff-dialog-pn">Codice Articolo</Label>
          <PartNumberCombobox
            id="coeff-dialog-pn"
            selectedPn={selectedPn}
            onSelect={setSelectedPn}
          />
        </div>
      )}
    </NumericEditorDialog>
  );
}
