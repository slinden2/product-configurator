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
    const currentUrl = window.location.href;

    router.back();

    setTimeout(() => {
      if (window.location.href === currentUrl) {
        router.push(fallbackPath);
      }
    }, 100);
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
