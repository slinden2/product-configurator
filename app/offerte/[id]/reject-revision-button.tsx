"use client";

import { Undo2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { rejectRevisionAction } from "@/app/actions/offer-revision-actions";
import { AsyncActionButton } from "@/components/shared/async-action-button";
import { MSG } from "@/lib/messages";

interface RejectRevisionButtonProps {
  offerId: number;
  /**
   * `reject` — hand a PENDING_APPROVAL revision back to the agent.
   * `unapprove` — revoke an already-granted APPROVED_TO_SEND approval.
   * Both return the revision to DRAFT; only the wording differs.
   */
  mode: "reject" | "unapprove";
}

const RejectRevisionButton = ({ offerId, mode }: RejectRevisionButtonProps) => {
  const router = useRouter();
  const isUnapprove = mode === "unapprove";

  return (
    <AsyncActionButton
      variant="outline"
      icon={<Undo2 className="h-4 w-4" />}
      action={async () => {
        const res = await rejectRevisionAction(offerId);
        if (!res.success) throw new Error(res.error);
        router.refresh();
      }}
      successMsg={MSG.toast.offerRevisionReturnedToDraft}
      confirm={{
        title: isUnapprove ? "Revocare l'approvazione?" : "Riportare in bozza?",
        description: isUnapprove
          ? MSG.offer.unapproveConfirm
          : MSG.offer.rejectConfirm,
        confirmLabel: isUnapprove ? "Revoca approvazione" : "Riporta in bozza",
        confirmVariant: "destructive",
      }}
    >
      {isUnapprove ? "Revoca approvazione" : "Riporta in bozza"}
    </AsyncActionButton>
  );
};

export default RejectRevisionButton;
