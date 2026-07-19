"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { ConfirmModal } from "@/components/confirm-modal";
import { Button, type ButtonProps } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { MSG } from "@/lib/messages";

interface ConfirmOptions {
  title: string;
  description: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmVariant?: "default" | "destructive";
}

interface ActionResult {
  success: boolean;
  error?: string;
}

function isFailedActionResult(value: unknown): value is ActionResult {
  return (
    typeof value === "object" &&
    value !== null &&
    "success" in value &&
    (value as ActionResult).success === false
  );
}

interface AsyncActionButtonProps
  extends Omit<ButtonProps, "onClick" | "disabled"> {
  action: () => Promise<unknown>;
  icon?: React.ReactNode;
  successMsg?: string;
  errorMsg?: string;
  confirm?: ConfirmOptions;
  children: React.ReactNode;
}

export function AsyncActionButton({
  action,
  icon,
  successMsg,
  errorMsg,
  confirm,
  children,
  ...buttonProps
}: AsyncActionButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const variant = buttonProps.variant || "default";

  const spinnerClass =
    variant === "default" ? "text-background dark:text-foreground" : "";

  const handleAction = () => {
    startTransition(async () => {
      try {
        const result = await action();
        if (isFailedActionResult(result)) {
          toast.error(result.error ?? errorMsg ?? MSG.db.unknown);
          return;
        }
        if (successMsg) toast.success(successMsg);
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : (errorMsg ?? MSG.db.unknown),
        );
      } finally {
        // Close the confirm dialog once the transition settles (no-op when the
        // button is used without a confirm step). The dialog keeps its in-modal
        // spinner until this point via isConfirming={isPending}.
        setIsConfirmOpen(false);
      }
    });
  };

  const button = (
    <Button
      {...buttonProps}
      disabled={isPending}
      onClick={confirm ? () => setIsConfirmOpen(true) : handleAction}
    >
      {isPending ? <Spinner size="small" className={spinnerClass} /> : icon}
      <span>{children}</span>
    </Button>
  );

  if (!confirm) return button;

  return (
    <>
      {button}
      <ConfirmModal
        isOpen={isConfirmOpen}
        onOpenChange={setIsConfirmOpen}
        title={confirm.title}
        description={confirm.description}
        onConfirm={handleAction}
        confirmText={confirm.confirmLabel}
        cancelText={confirm.cancelLabel}
        confirmVariant={confirm.confirmVariant}
        isConfirming={isPending}
      />
    </>
  );
}
