"use client";

import { Undo2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { unacceptRevisionAction } from "@/app/actions/offer-revision-actions";
import { AsyncActionButton } from "@/components/shared/async-action-button";
import { MSG } from "@/lib/messages";

interface UnacceptRevisionButtonProps {
  offerId: number;
}

/**
 * ADMIN-only correction for a mistaken acceptance: reverts the in-force accepted
 * revision back to SENT, unlocks the offer, unwinds the as-sold freeze, and returns
 * each line config to DRAFT. Refused server-side if engineering has already started or
 * the acceptance was a renegotiation re-acceptance. Rendered only for ADMIN on a
 * first-acceptance in-force revision (the action re-checks all of it server-side).
 */
const UnacceptRevisionButton = ({ offerId }: UnacceptRevisionButtonProps) => {
  const router = useRouter();

  return (
    <AsyncActionButton
      variant="outline"
      icon={<Undo2 className="h-4 w-4" />}
      action={async () => {
        const res = await unacceptRevisionAction(offerId);
        if (!res.success) throw new Error(res.error);
        router.refresh();
      }}
      successMsg={MSG.toast.offerRevisionUnaccepted}
      confirm={{
        title: "Annullare l'accettazione?",
        description: MSG.offer.unacceptConfirm,
        confirmLabel: "Annulla accettazione",
        confirmVariant: "destructive",
      }}
    >
      Annulla accettazione
    </AsyncActionButton>
  );
};

export default UnacceptRevisionButton;
