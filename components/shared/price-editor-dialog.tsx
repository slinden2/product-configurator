"use client";

import NumericEditorDialog from "@/components/shared/numeric-editor-dialog";

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
  return (
    <NumericEditorDialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      inputId="price-dialog-price"
      inputLabel="Prezzo (€)"
      initialValue={initialPrice}
      step={STEP}
      min={0}
      onSave={onSave}
    />
  );
}
