"use client";

import { Button, type ButtonProps } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

interface SubmitButtonProps extends Omit<ButtonProps, "type"> {
  isSubmitting: boolean;
  icon?: React.ReactNode;
  disabled?: boolean;
  children: React.ReactNode;
}

export function SubmitButton({
  isSubmitting,
  icon,
  disabled,
  children,
  ...props
}: SubmitButtonProps) {
  return (
    <Button type="submit" disabled={isSubmitting || disabled} {...props}>
      {isSubmitting ? <Spinner size="small" className="text-current" /> : icon}
      <span>{children}</span>
    </Button>
  );
}
