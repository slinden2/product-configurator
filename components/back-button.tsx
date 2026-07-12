"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

interface BackButtonProps {
  fallbackPath: string;
}

export default function BackButton({ fallbackPath }: BackButtonProps) {
  const router = useRouter();

  const handleBack = () => {
    // No timing heuristics: with no history to go back to, navigate straight
    // to the fallback; otherwise trust router.back().
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push(fallbackPath);
    }
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleBack}
      title="Torna indietro"
      type="button"
    >
      <ArrowLeft />
      <span className="sr-only">Torna indietro</span>
    </Button>
  );
}
