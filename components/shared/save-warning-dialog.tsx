import { ConfirmModal } from "@/components/confirm-modal";
import { MSG } from "@/lib/messages";

interface SaveWarningDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCancel: () => void;
  onConfirm: () => void;
}

const SaveWarningDialog = ({
  open,
  onOpenChange,
  onCancel,
  onConfirm,
}: SaveWarningDialogProps) => {
  // The only save-time warning left is the engineering BOM invalidation — the offer's
  // commercial figures re-price automatically (or are frozen) and have no separate
  // snapshot to discard.
  const messages = MSG.saveWarning.ebomOnly;

  return (
    <ConfirmModal
      isOpen={open}
      onOpenChange={(next) => {
        if (!next) onCancel();
        onOpenChange(next);
      }}
      title={messages.title}
      description={messages.description}
      onConfirm={onConfirm}
      confirmText={messages.confirm}
      confirmVariant="destructive"
    />
  );
};

export default SaveWarningDialog;
