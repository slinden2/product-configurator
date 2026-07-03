"use client";

import { CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { acceptRevisionAction } from "@/app/actions/offer-revision-actions";
import { AsyncActionButton } from "@/components/shared/async-action-button";
import { MSG } from "@/lib/messages";

interface AcceptRevisionButtonProps {
  offerId: number;
  /** True when the SENT revision is a renegotiation: acceptance re-freezes the
   * as-sold baseline instead of handing the configs off to engineering. */
  renegotiation?: boolean;
}

/**
 * Records customer acceptance of the SENT revision: the line configs hand off to
 * engineering (SALES_APPROVED + as-sold freeze) and the offer locks. For a
 * renegotiation revision the copy reflects the re-freeze (configs untouched).
 */
const AcceptRevisionButton = ({
  offerId,
  renegotiation = false,
}: AcceptRevisionButtonProps) => {
  const router = useRouter();

  return (
    <AsyncActionButton
      icon={<CheckCircle2 className="h-4 w-4" />}
      action={async () => {
        const res = await acceptRevisionAction(offerId);
        if (!res.success) throw new Error(res.error);
        router.refresh();
      }}
      successMsg={
        renegotiation
          ? MSG.toast.offerRenegotiationAccepted
          : MSG.toast.offerRevisionAccepted
      }
      confirm={{
        title: "Registrare l'accettazione?",
        description: renegotiation
          ? MSG.offer.reacceptConfirm
          : MSG.offer.acceptConfirm,
        confirmLabel: "Accetta offerta",
        confirmVariant: "default",
      }}
    >
      Accetta offerta
    </AsyncActionButton>
  );
};

export default AcceptRevisionButton;
