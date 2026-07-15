"use client";

import { ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { absorbLineMarginAction } from "@/app/actions/margin-absorb-actions";
import { ConfirmModal } from "@/components/confirm-modal";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MSG } from "@/lib/messages";
import { formatPct } from "@/lib/money";

interface AbsorbMarginButtonProps {
  /** The accepted revision line to absorb; the action re-verifies it in-force. */
  lineId: number;
  /** Live margin shown in the confirmation copy (the server recomputes it). */
  marginPct: number;
  thresholdPct: number;
}

/**
 * Absorb sign-off entry point (#84), initiated per line from the offer margin
 * hub: opens a confirmation with an optional note and records the decision to
 * accept the eroded margin. Only rendered for a line with an active alert, for
 * `canViewMarginReview` roles.
 */
const AbsorbMarginButton = ({
  lineId,
  marginPct,
  thresholdPct,
}: AbsorbMarginButtonProps) => {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [note, setNote] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleConfirm = () => {
    startTransition(async () => {
      try {
        const trimmed = note.trim();
        const res = await absorbLineMarginAction(lineId, {
          note: trimmed.length > 0 ? trimmed : undefined,
        });
        if (!res.success) {
          toast.error(res.error);
          return;
        }
        toast.success(MSG.marginReview.absorbSuccess);
        setIsOpen(false);
        setNote("");
        router.refresh();
      } catch {
        toast.error(MSG.db.unknown);
      }
    });
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
      >
        <ShieldCheck className="h-4 w-4" />
        {MSG.marginReview.absorbButton}
      </Button>
      <ConfirmModal
        isOpen={isOpen}
        onOpenChange={(open) => {
          setIsOpen(open);
          if (!open) setNote("");
        }}
        title={MSG.marginReview.absorbConfirmTitle}
        description={
          // Only phrasing content here — the description renders inside a <p>.
          <>
            {MSG.marginReview.absorbConfirmBody(
              formatPct(marginPct),
              formatPct(thresholdPct),
            )}
            <Textarea
              className="mt-3"
              aria-label={MSG.marginReview.absorbNoteLabel}
              placeholder={MSG.marginReview.absorbNoteLabel}
              maxLength={500}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              disabled={isPending}
            />
          </>
        }
        onConfirm={handleConfirm}
        confirmText={MSG.marginReview.absorbButton}
        confirmVariant="default"
        isConfirming={isPending}
      />
    </>
  );
};

export default AbsorbMarginButton;
