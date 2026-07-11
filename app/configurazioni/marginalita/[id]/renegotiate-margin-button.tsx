"use client";

import { Handshake } from "lucide-react";
import { useRouter } from "next/navigation";
import { createRenegotiationRevisionAction } from "@/app/actions/offer-revision-actions";
import { AsyncActionButton } from "@/components/shared/async-action-button";
import { MSG } from "@/lib/messages";

interface RenegotiateMarginButtonProps {
  offerId: number;
}

/**
 * The "renegotiate" arm of the margin decision point (#85), next to the absorb
 * sign-off: opens a commercial-only renegotiation revision on the offer and
 * navigates to it. Only rendered when the margin alert is active and no working
 * revision is open, for `canViewMarginReview` roles (the action re-checks
 * `canRenegotiateOffer` server-side).
 */
const RenegotiateMarginButton = ({ offerId }: RenegotiateMarginButtonProps) => {
  const router = useRouter();

  return (
    <AsyncActionButton
      variant="outline"
      size="sm"
      icon={<Handshake className="h-4 w-4" />}
      action={async () => {
        const res = await createRenegotiationRevisionAction(offerId);
        if (!res.success) throw new Error(res.error);
        router.push(`/offerte/${offerId}`);
      }}
      successMsg={MSG.toast.offerRenegotiationCreated}
      confirm={{
        title: MSG.marginReview.renegotiateConfirmTitle,
        description: MSG.offer.renegotiateConfirm,
        confirmLabel: MSG.marginReview.renegotiateButton,
        confirmVariant: "default",
      }}
    >
      {MSG.marginReview.renegotiateButton}
    </AsyncActionButton>
  );
};

export default RenegotiateMarginButton;
