"use client";

import { type ReactNode, useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
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
import { MSG } from "@/lib/messages";

interface NumericEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  inputId: string;
  inputLabel: string;
  initialValue: string;
  /** Arrow-key increment; stepped values are clamped to stay >= min. */
  step: number;
  min: number;
  onSave: (value: string) => Promise<void>;
  /** Extra fields rendered above the numeric input (e.g. a PN combobox). */
  children?: ReactNode;
}

/**
 * Dialog shell for editing a single decimal value: open-reset, two-decimal
 * blur normalization, ArrowUp/ArrowDown stepping, pending transition, and
 * Annulla/Salva footer. Wrapped by PriceEditorDialog and
 * CoefficientEditorDialog, which differ only in step/min and extra fields.
 */
export default function NumericEditorDialog({
  open,
  onOpenChange,
  title,
  inputId,
  inputLabel,
  initialValue,
  step,
  min,
  onSave,
  children,
}: NumericEditorDialogProps) {
  const [value, setValue] = useState(initialValue);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (open) {
      setValue(initialValue);
    }
  }, [open, initialValue]);

  const handleSave = () => {
    startTransition(async () => {
      try {
        await onSave(value);
      } catch {
        toast.error(MSG.db.unknown);
      }
    });
  };

  const handleBlur = () => {
    const n = parseFloat(value);
    if (!Number.isNaN(n) && n >= min) setValue(n.toFixed(2));
  };

  const stepBy = (direction: 1 | -1) => {
    const n = parseFloat(value);
    if (Number.isNaN(n)) return;
    const next = Math.round((n + direction * step) * 100) / 100;
    if (next >= min) setValue(next.toFixed(2));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowUp") {
      e.preventDefault();
      stepBy(1);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      stepBy(-1);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {children}
          <div className="space-y-1.5">
            <Label htmlFor={inputId}>{inputLabel}</Label>
            <Input
              id={inputId}
              type="text"
              inputMode="decimal"
              value={value}
              onChange={(e) => setValue(e.target.value)}
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
