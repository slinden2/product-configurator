"use client";

import { CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { acceptRevisionAction } from "@/app/actions/offer-revision-actions";
import { AsyncActionButton } from "@/components/shared/async-action-button";
import { MSG } from "@/lib/messages";

interface AcceptRevisionButtonProps {
  offerId: number;
}

/**
 * Records customer acceptance of the SENT revision: the line configs hand off to
 * engineering (SALES_APPROVED + as-sold freeze) and the offer locks.
 */
const AcceptRevisionButton = ({ offerId }: AcceptRevisionButtonProps) => {
  const router = useRouter();

  return (
    <AsyncActionButton
      icon={<CheckCircle2 className="h-4 w-4" />}
      action={async () => {
        const res = await acceptRevisionAction(offerId);
        if (!res.success) throw new Error(res.error);
        router.refresh();
      }}
      successMsg={MSG.toast.offerRevisionAccepted}
      confirm={{
        title: "Registrare l'accettazione?",
        description: MSG.offer.acceptConfirm,
        confirmLabel: "Accetta offerta",
        confirmVariant: "default",
      }}
    >
      Accetta offerta
    </AsyncActionButton>
  );
};

export default AcceptRevisionButton;
