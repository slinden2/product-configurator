"use client";

import { Button } from "@/components/ui/button";
import { Undo2 } from "lucide-react";
import { useRouter } from "next/navigation";

interface BackButtonProps {
  fallbackPath: string;
}

export default function BackButton({ fallbackPath }: BackButtonProps) {
  const router = useRouter();

  const handleBack = () => {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push(fallbackPath);
    }
  };

  return (
    <Button variant="outline" size="icon" onClick={handleBack} title="Indietro">
      <Undo2 />
    </Button>
  );
}
