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

const STEP = 50;

interface PriceEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Full dialog title, e.g. "Modifica prezzo — Altezza non standard". */
  title: string;
  initialPrice: string;
  onSave: (price: string) => Promise<void>;
}

export default function PriceEditorDialog({
  open,
  onOpenChange,
  title,
  initialPrice,
  onSave,
}: PriceEditorDialogProps) {
  const [priceValue, setPriceValue] = useState(initialPrice);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (open) {
      setPriceValue(initialPrice);
    }
  }, [open, initialPrice]);

  const handleSave = () => {
    startTransition(async () => {
      await onSave(priceValue);
    });
  };

  const handleBlur = () => {
    const n = parseFloat(priceValue);
    if (!Number.isNaN(n) && n >= 0) setPriceValue(n.toFixed(2));
  };

  const stepValue = (direction: 1 | -1) => {
    const n = parseFloat(priceValue);
    if (Number.isNaN(n)) return;
    const next = Math.round((n + direction * STEP) * 100) / 100;
    if (next >= 0) setPriceValue(next.toFixed(2));
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label htmlFor="price-dialog-price">Prezzo (€)</Label>
          <Input
            id="price-dialog-price"
            type="text"
            inputMode="decimal"
            value={priceValue}
            onChange={(e) => setPriceValue(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
          />
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
