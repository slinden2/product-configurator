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
}: ConfirmModalProps) => {
  return (
    <ResponsiveModal open={isOpen} onOpenChange={onOpenChange}>
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
              className="sm:min-w-[100px]"
            >
              {cancelText}
            </Button>
          </ResponsiveModalClose>
          {/* Confirm Button */}
          <Button
            type="button"
            variant={confirmVariant}
            onClick={onConfirm}
            disabled={isConfirming}
            className="sm:min-w-[100px]"
          >
            {isConfirming ? <Spinner className="h-4 w-4" /> : confirmText}
          </Button>
        </ResponsiveModalFooter>
      </ResponsiveModalContent>
    </ResponsiveModal>
  );
};
