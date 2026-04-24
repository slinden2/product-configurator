"use client";

import { RefreshCw } from "lucide-react";
import { generateOfferAction } from "@/app/actions/offer-actions";
import { AsyncActionButton } from "@/components/shared/async-action-button";
import { MSG } from "@/lib/messages";

interface Props {
  confId: number;
  mode: "generate" | "regenerate";
}

export default function OfferActionButton({ confId, mode }: Props) {
  const isRegenerate = mode === "regenerate";

  return (
    <AsyncActionButton
      action={async () => {
        const result = await generateOfferAction(confId);
        if (!result.success) throw new Error(result.error);
      }}
      icon={isRegenerate ? <RefreshCw /> : undefined}
      successMsg={
        isRegenerate ? MSG.toast.offerRegenerated : MSG.toast.offerGenerated
      }
      variant={isRegenerate ? "outline" : "default"}
      size="sm"
    >
      {isRegenerate ? "Rigenera offerta" : "Genera offerta"}
    </AsyncActionButton>
  );
}
