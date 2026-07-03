"use client";

import { Handshake } from "lucide-react";
import { useRouter } from "next/navigation";
import { createRenegotiationRevisionAction } from "@/app/actions/offer-revision-actions";
import { AsyncActionButton } from "@/components/shared/async-action-button";
import { MSG } from "@/lib/messages";

interface RenegotiateOfferButtonProps {
  offerId: number;
  variant?: "default" | "outline";
  size?: "default" | "sm";
}

/**
 * Opens a post-acceptance renegotiation revision (#85): a commercial-only DRAFT
 * cloned from the in-force accepted revision, with the configs referenced
 * read-only and the prices re-derived from their current engineering state.
 * Rendered only for ADMIN / SALES_DIRECTOR on an accepted offer with no open
 * working revision (the action re-checks all of it server-side).
 */
const RenegotiateOfferButton = ({
  offerId,
  variant = "default",
  size = "default",
}: RenegotiateOfferButtonProps) => {
  const router = useRouter();

  return (
    <AsyncActionButton
      variant={variant}
      size={size}
      icon={<Handshake className="h-4 w-4" />}
      action={async () => {
        const res = await createRenegotiationRevisionAction(offerId);
        if (!res.success) throw new Error(res.error);
        router.refresh();
      }}
      successMsg={MSG.toast.offerRenegotiationCreated}
      confirm={{
        title: "Avviare una rinegoziazione?",
        description: MSG.offer.renegotiateConfirm,
        confirmLabel: "Rinegozia",
        confirmVariant: "default",
      }}
    >
      {MSG.marginReview.renegotiateButton}
    </AsyncActionButton>
  );
};

export default RenegotiateOfferButton;
