import type * as React from "react";
import { Button, type ButtonProps } from "@/components/ui/button";
import {
  ResponsiveModal,
  ResponsiveModalClose,
  ResponsiveModalContent,
  ResponsiveModalDescription,
  ResponsiveModalFooter,
  ResponsiveModalHeader,
  ResponsiveModalTitle,
} from "@/components/ui/responsive-modal";
import { Spinner } from "@/components/ui/spinner";

interface ConfirmModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: React.ReactNode;
  onConfirm: () => void | Promise<void>;
  confirmText?: string;
  confirmVariant?: ButtonProps["variant"];
  cancelText?: string;
  isConfirming?: boolean;
  /** Disables the confirm button without showing a spinner (e.g. background pre-check). */
  confirmDisabled?: boolean;
}

export const ConfirmModal = ({
  isOpen,
  onOpenChange,
  title,
  description,
  onConfirm,
  confirmText = "Conferma",
  confirmVariant = "destructive",
  cancelText = "Annulla",
  isConfirming = false,
  confirmDisabled = false,
}: ConfirmModalProps) => {
  // While the action runs, Escape/overlay-click must not close the dialog:
  // the parent's onOpenChange(false) may clear state the in-flight action
  // depends on.
  const handleOpenChange = (open: boolean) => {
    if (!isConfirming) onOpenChange(open);
  };

  // onConfirm may be async: surface rejections instead of letting them become
  // unhandled promise rejections with no user feedback.
  const handleConfirm = async () => {
    try {
      await onConfirm();
    } catch (err) {
      console.error("ConfirmModal onConfirm failed:", err);
    }
  };

  return (
    <ResponsiveModal open={isOpen} onOpenChange={handleOpenChange}>
      <ResponsiveModalContent side="bottom">
        <ResponsiveModalHeader className="mb-4">
          <ResponsiveModalTitle>{title}</ResponsiveModalTitle>
          <ResponsiveModalDescription>{description}</ResponsiveModalDescription>
        </ResponsiveModalHeader>
        <ResponsiveModalFooter className="gap-2">
          {/* Cancel Button - uses ResponsiveModalClose */}
          <ResponsiveModalClose asChild>
            <Button
              type="button"
              variant="outline"
              disabled={isConfirming}
              className="sm:min-w-25"
            >
              {cancelText}
            </Button>
          </ResponsiveModalClose>
          {/* Confirm Button */}
          <Button
            type="button"
            variant={confirmVariant}
            onClick={handleConfirm}
            disabled={isConfirming || confirmDisabled}
            className="sm:min-w-25"
          >
            {isConfirming ? (
              <Spinner size="small" className="text-current" />
            ) : (
              confirmText
            )}
          </Button>
        </ResponsiveModalFooter>
      </ResponsiveModalContent>
    </ResponsiveModal>
  );
};
