"use client";

import { Clock, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { recordRevisionOutcomeAction } from "@/app/actions/offer-revision-actions";
import { AsyncActionButton } from "@/components/shared/async-action-button";
import { MSG } from "@/lib/messages";

interface RecordOutcomeButtonProps {
  offerId: number;
  /**
   * `REJECTED` — the customer declined this revision.
   * `EXPIRED` — the validity window lapsed without a decision.
   * Both are terminal for the revision; a new one can still be cloned forward.
   */
  outcome: "REJECTED" | "EXPIRED";
}

const RecordOutcomeButton = ({
  offerId,
  outcome,
}: RecordOutcomeButtonProps) => {
  const router = useRouter();
  const isReject = outcome === "REJECTED";

  return (
    <AsyncActionButton
      variant="outline"
      icon={
        isReject ? (
          <XCircle className="h-4 w-4" />
        ) : (
          <Clock className="h-4 w-4" />
        )
      }
      action={async () => {
        const res = await recordRevisionOutcomeAction(offerId, outcome);
        if (!res.success) throw new Error(res.error);
        router.refresh();
      }}
      successMsg={
        isReject
          ? MSG.toast.offerRevisionDeclined
          : MSG.toast.offerRevisionExpired
      }
      confirm={{
        title: isReject ? "Registrare il rifiuto?" : "Segnare come scaduta?",
        description: isReject
          ? MSG.offer.declineConfirm
          : MSG.offer.expireConfirm,
        confirmLabel: isReject ? "Registra rifiuto" : "Segna scaduta",
        confirmVariant: "destructive",
      }}
    >
      {isReject ? "Rifiutata dal cliente" : "Scaduta"}
    </AsyncActionButton>
  );
};

export default RecordOutcomeButton;
