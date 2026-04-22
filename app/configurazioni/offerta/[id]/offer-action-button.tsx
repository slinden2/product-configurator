"use client";

import { RefreshCw } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { generateOfferAction } from "@/app/actions/offer-actions";
import { Button } from "@/components/ui/button";
import { MSG } from "@/lib/messages";

interface Props {
  confId: number;
  mode: "generate" | "regenerate";
}

export default function OfferActionButton({ confId, mode }: Props) {
  const [isPending, setIsPending] = useState(false);
  const isRegenerate = mode === "regenerate";

  const handleClick = async () => {
    setIsPending(true);
    try {
      const result = await generateOfferAction(confId);
      if (result.success) {
        toast.success(
          isRegenerate ? MSG.toast.offerRegenerated : MSG.toast.offerGenerated,
        );
      } else {
        toast.error(result.error);
      }
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Button
      variant={isRegenerate ? "outline" : "default"}
      onClick={handleClick}
      disabled={isPending}
    >
      {isRegenerate && <RefreshCw className="h-4 w-4 mr-2" />}
      {isPending
        ? isRegenerate
          ? "Rigenerazione..."
          : "Generazione..."
        : isRegenerate
          ? "Rigenera offerta"
          : "Genera offerta"}
    </Button>
  );
}
