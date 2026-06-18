import { ConfirmModal } from "@/components/confirm-modal";
import { MSG } from "@/lib/messages";

interface SaveWarningDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCancel: () => void;
  onConfirm: () => void;
  hasEngineeringBom: boolean;
  hasOfferSnapshot: boolean;
}

const SaveWarningDialog = ({
  open,
  onOpenChange,
  onCancel,
  onConfirm,
  hasEngineeringBom,
  hasOfferSnapshot,
}: SaveWarningDialogProps) => {
  const messages =
    hasEngineeringBom && hasOfferSnapshot
      ? MSG.saveWarning.both
      : hasEngineeringBom
        ? MSG.saveWarning.ebomOnly
        : MSG.saveWarning.offerOnly;

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
