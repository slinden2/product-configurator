"use client";

import { FlaskConical } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DevFillButtonProps {
  onFill: () => void;
  className?: string;
}

/**
 * Development-only helper that fills the parent form with dummy data.
 * Rendered only outside production builds; the user still submits manually.
 */
export function DevFillButton({ onFill, className }: DevFillButtonProps) {
  if (process.env.NODE_ENV === "production") return null;

  return (
    <Button
      type="button"
      variant="outline"
      onClick={onFill}
      className={className}
    >
      <FlaskConical /> Dati di prova
    </Button>
  );
}
