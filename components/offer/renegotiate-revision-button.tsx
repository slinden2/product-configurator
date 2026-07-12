"use client";

import { Handshake } from "lucide-react";
import { useRouter } from "next/navigation";
import { createRenegotiationRevisionAction } from "@/app/actions/offer-revision-actions";
import { AsyncActionButton } from "@/components/shared/async-action-button";
import { MSG } from "@/lib/messages";

interface RenegotiateRevisionButtonProps {
  offerId: number;
  /** Route pushed after success; omitted → refresh the current page. */
  navigateTo?: string;
  variant?: "default" | "outline";
  size?: "default" | "sm";
}

/**
 * Opens a post-acceptance renegotiation revision (#85): a commercial-only DRAFT
 * cloned from the in-force accepted revision, with the configs referenced
 * read-only and the prices re-derived from their current engineering state.
 * Rendered on the offer detail page (ADMIN / SALES_DIRECTOR on an accepted
 * offer with no open working revision) and as the "renegotiate" arm of the
 * margin decision point, next to the absorb sign-off (the action re-checks
 * `canRenegotiateOffer` server-side in both cases).
 */
const RenegotiateRevisionButton = ({
  offerId,
  navigateTo,
  variant = "default",
  size = "default",
}: RenegotiateRevisionButtonProps) => {
  const router = useRouter();

  return (
    <AsyncActionButton
      variant={variant}
      size={size}
      icon={<Handshake className="h-4 w-4" />}
      action={async () => {
        const res = await createRenegotiationRevisionAction(offerId);
        if (!res.success) throw new Error(res.error);
        if (navigateTo) {
          router.push(navigateTo);
        } else {
          router.refresh();
        }
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

export default RenegotiateRevisionButton;
