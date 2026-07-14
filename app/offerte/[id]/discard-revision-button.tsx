"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { discardDraftRevisionAction } from "@/app/actions/offer-revision-actions";
import { AsyncActionButton } from "@/components/shared/async-action-button";
import { MSG } from "@/lib/messages";

interface DiscardRevisionButtonProps {
  offerId: number;
  /** True when the working revision is a renegotiation: its lines reference the live
   * engineering configs read-only, so discarding it deletes lines only — the confirm
   * copy must not threaten configurations that will in fact survive. */
  renegotiation: boolean;
}

/**
 * Discards the working DRAFT revision, hard-deleting it (and, for a clone-forward draft,
 * the configurations it owns) so the offer falls back to the previous revision and its
 * number is freed for re-use. Rendered only on a DRAFT revision that has a predecessor —
 * and, for a renegotiation, only for ADMIN / SALES_DIRECTOR; the action re-checks all of
 * it server-side.
 */
const DiscardRevisionButton = ({
  offerId,
  renegotiation,
}: DiscardRevisionButtonProps) => {
  const router = useRouter();

  return (
    <AsyncActionButton
      variant="outline"
      icon={<Trash2 className="h-4 w-4" />}
      action={async () => {
        const res = await discardDraftRevisionAction(offerId);
        if (!res.success) throw new Error(res.error);
        router.refresh();
      }}
      successMsg={MSG.toast.offerRevisionDiscarded}
      confirm={{
        title: renegotiation
          ? "Scartare la rinegoziazione?"
          : "Scartare la revisione?",
        description: renegotiation
          ? MSG.offer.discardRenegotiationConfirm
          : MSG.offer.discardConfirm,
        confirmLabel: "Scarta revisione",
        confirmVariant: "destructive",
      }}
    >
      Scarta revisione
    </AsyncActionButton>
  );
};

export default DiscardRevisionButton;
