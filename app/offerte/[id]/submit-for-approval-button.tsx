"use client";

import { SendHorizontal } from "lucide-react";
import { useRouter } from "next/navigation";
import { submitRevisionForApprovalAction } from "@/app/actions/offer-revision-actions";
import { AsyncActionButton } from "@/components/shared/async-action-button";
import { MSG } from "@/lib/messages";

interface SubmitForApprovalButtonProps {
  offerId: number;
}

const SubmitForApprovalButton = ({ offerId }: SubmitForApprovalButtonProps) => {
  const router = useRouter();

  return (
    <AsyncActionButton
      icon={<SendHorizontal className="h-4 w-4" />}
      action={async () => {
        const res = await submitRevisionForApprovalAction(offerId);
        if (!res.success) throw new Error(res.error);
        router.refresh();
      }}
      successMsg={MSG.toast.offerRevisionSubmitted}
      confirm={{
        title: "Inviare in approvazione?",
        description: MSG.offer.submitConfirm,
        confirmLabel: "Invia in approvazione",
        confirmVariant: "default",
      }}
    >
      Invia in approvazione
    </AsyncActionButton>
  );
};

export default SubmitForApprovalButton;
