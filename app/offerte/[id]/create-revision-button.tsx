"use client";

import { GitBranchPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { createRevisionAction } from "@/app/actions/offer-revision-actions";
import { AsyncActionButton } from "@/components/shared/async-action-button";
import { MSG } from "@/lib/messages";

interface CreateRevisionButtonProps {
  offerId: number;
  /** Source revision to clone from. Omit to clone from the latest (the normal next
   * revision); pass an earlier `revision_no` to revert to it. */
  sourceRevisionNo?: number;
  label?: string;
  variant?: "default" | "outline";
  size?: "default" | "sm";
}

const CreateRevisionButton = ({
  offerId,
  sourceRevisionNo,
  label = "Nuova revisione",
  variant = "default",
  size = "default",
}: CreateRevisionButtonProps) => {
  const router = useRouter();

  return (
    <AsyncActionButton
      variant={variant}
      size={size}
      icon={<GitBranchPlus className="h-4 w-4" />}
      action={async () => {
        const res = await createRevisionAction(offerId, sourceRevisionNo);
        if (!res.success) throw new Error(res.error);
        router.refresh();
      }}
      successMsg={MSG.toast.offerRevisionCreated}
      confirm={{
        title: "Creare una nuova revisione?",
        description:
          sourceRevisionNo === undefined
            ? MSG.offer.createRevisionConfirm
            : MSG.offer.revertConfirm,
        confirmLabel: "Crea",
        confirmVariant: "default",
      }}
    >
      {label}
    </AsyncActionButton>
  );
};

export default CreateRevisionButton;
