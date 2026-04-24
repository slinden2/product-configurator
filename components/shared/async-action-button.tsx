"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Button,
  type ButtonProps,
  buttonVariants,
} from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

interface ConfirmOptions {
  title: string;
  description: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmVariant?: "default" | "destructive";
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

  const variant = buttonProps.variant || "default";

  const spinnerClass =
    variant === "default" ? "text-background dark:text-foreground" : "";

  const handleAction = () => {
    startTransition(async () => {
      try {
        await action();
        if (successMsg) toast.success(successMsg);
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : (errorMsg ?? "Errore."),
        );
      }
    });
  };

  const button = (
    <Button
      {...buttonProps}
      disabled={isPending}
      onClick={confirm ? undefined : handleAction}
    >
      {isPending ? <Spinner size="small" className={spinnerClass} /> : icon}
      <span>{children}</span>
    </Button>
  );

  if (!confirm) return button;

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{button}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{confirm.title}</AlertDialogTitle>
          <AlertDialogDescription>{confirm.description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>
            {confirm.cancelLabel ?? "Annulla"}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleAction}
            className={buttonVariants({
              variant: confirm.confirmVariant ?? "destructive",
            })}
          >
            {confirm.confirmLabel ?? "Conferma"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
