"use client";

import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const STEP = 0.05;

interface CoefficientEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  initialCoefficient: string;
  /** When undefined the dialog shows a PN text input (create mode). */
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
  const [coeffValue, setCoeffValue] = useState(initialCoefficient);
  const [pnValue, setPnValue] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (open) {
      setCoeffValue(initialCoefficient);
      setPnValue("");
    }
  }, [open, initialCoefficient]);

  const handleSave = () => {
    startTransition(async () => {
      await onSave(coeffValue, pn === undefined ? pnValue : undefined);
    });
  };

  const handleBlur = () => {
    const n = parseFloat(coeffValue);
    if (!Number.isNaN(n) && n > 0) setCoeffValue(n.toFixed(2));
  };

  const stepValue = (direction: 1 | -1) => {
    const n = parseFloat(coeffValue);
    if (Number.isNaN(n)) return;
    const next = Math.round((n + direction * STEP) * 100) / 100;
    if (next >= STEP) setCoeffValue(next.toFixed(2));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowUp") {
      e.preventDefault();
      stepValue(1);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      stepValue(-1);
    }
  };

  const isCreateMode = pn === undefined;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {isCreateMode && (
            <div className="space-y-1.5">
              <Label htmlFor="coeff-dialog-pn">Codice Articolo</Label>
              <Input
                id="coeff-dialog-pn"
                placeholder="es. ITC-12345"
                value={pnValue}
                onChange={(e) => setPnValue(e.target.value)}
              />
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="coeff-dialog-value">
              Coefficiente (moltiplicatore)
            </Label>
            <Input
              id="coeff-dialog-value"
              type="text"
              inputMode="decimal"
              value={coeffValue}
              onChange={(e) => setCoeffValue(e.target.value)}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Annulla
          </Button>
          <Button onClick={handleSave} disabled={isPending}>
            Salva
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
