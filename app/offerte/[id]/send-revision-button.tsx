"use client";

import { Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { sendRevisionAction } from "@/app/actions/offer-revision-actions";
import { AsyncActionButton } from "@/components/shared/async-action-button";
import { MSG } from "@/lib/messages";

interface SendRevisionButtonProps {
  offerId: number;
}

const SendRevisionButton = ({ offerId }: SendRevisionButtonProps) => {
  const router = useRouter();

  return (
    <AsyncActionButton
      icon={<Send className="h-4 w-4" />}
      action={async () => {
        const res = await sendRevisionAction(offerId);
        if (!res.success) throw new Error(res.error);
        router.refresh();
      }}
      successMsg={MSG.toast.offerRevisionSent}
      confirm={{
        title: "Inviare la revisione?",
        description: MSG.offer.sendConfirm,
        confirmLabel: "Invia",
        confirmVariant: "default",
      }}
    >
      Invia offerta
    </AsyncActionButton>
  );
};

export default SendRevisionButton;
