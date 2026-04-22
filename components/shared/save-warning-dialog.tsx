import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{messages.title}</AlertDialogTitle>
          <AlertDialogDescription>
            {messages.description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>Annulla</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {messages.confirm}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default SaveWarningDialog;
