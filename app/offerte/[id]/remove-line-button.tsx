"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { removeOfferLineAction } from "@/app/actions/offer-line-actions";
import { AsyncActionButton } from "@/components/shared/async-action-button";
import { MSG } from "@/lib/messages";

interface RemoveLineButtonProps {
  offerId: number;
  configId: number;
  configName: string;
}

const RemoveLineButton = ({
  offerId,
  configId,
  configName,
}: RemoveLineButtonProps) => {
  const router = useRouter();

  return (
    <AsyncActionButton
      variant="destructive"
      size="sm"
      icon={<Trash2 className="h-4 w-4" />}
      action={async () => {
        const res = await removeOfferLineAction(offerId, configId);
        if (!res.success) throw new Error(res.error);
        router.refresh();
      }}
      successMsg={MSG.toast.offerLineRemoved}
      confirm={{
        title: MSG.offer.removeLineConfirm.title,
        description: MSG.offer.removeLineConfirm.description(configName),
        confirmLabel: MSG.offer.removeLineConfirm.confirmLabel,
        confirmVariant: "destructive",
      }}
    >
      Rimuovi
    </AsyncActionButton>
  );
};

export default RemoveLineButton;
