"use client";

import { Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { approveRevisionAction } from "@/app/actions/offer-revision-actions";
import { AsyncActionButton } from "@/components/shared/async-action-button";
import { MSG } from "@/lib/messages";

interface ApproveRevisionButtonProps {
  offerId: number;
}

const ApproveRevisionButton = ({ offerId }: ApproveRevisionButtonProps) => {
  const router = useRouter();

  return (
    <AsyncActionButton
      icon={<Check className="h-4 w-4" />}
      action={async () => {
        const res = await approveRevisionAction(offerId);
        if (!res.success) throw new Error(res.error);
        router.refresh();
      }}
      successMsg={MSG.toast.offerRevisionApproved}
      confirm={{
        title: "Approvare la revisione?",
        description: MSG.offer.approveConfirm,
        confirmLabel: "Approva",
        confirmVariant: "default",
      }}
    >
      Approva
    </AsyncActionButton>
  );
};

export default ApproveRevisionButton;
