"use client";

import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MSG } from "@/lib/messages";

interface Props {
  initialDiscount: number;
  disabled?: boolean;
  /** Persists the new discount — a revision-scoped server action. */
  onSave: (discount: number) => Promise<{ success: boolean; error?: string }>;
}

export default function DiscountInput({
  initialDiscount,
  disabled,
  onSave,
}: Props) {
  const [value, setValue] = useState(initialDiscount.toString());
  const [isPending, startTransition] = useTransition();
  const lastSaved = useRef(initialDiscount);

  const handleBlur = () => {
    const numeric = parseFloat(value);
    if (Number.isNaN(numeric) || numeric === lastSaved.current) return;

    startTransition(async () => {
      const result = await onSave(numeric);
      if (result.success) {
        lastSaved.current = numeric;
        toast.success(MSG.toast.offerDiscountSet);
      } else {
        toast.error(result.error ?? MSG.toast.offerDiscountError);
        setValue(lastSaved.current.toString());
      }
    });
  };

  return (
    <div className="flex items-center gap-2">
      <Label htmlFor="discount-input" className="whitespace-nowrap">
        Sconto (%)
      </Label>
      <Input
        id="discount-input"
        type="number"
        min={0}
        max={40}
        step={0.5}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={handleBlur}
        disabled={disabled || isPending}
        className="w-24"
      />
    </div>
  );
}
