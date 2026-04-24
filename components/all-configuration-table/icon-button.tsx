import type { LucideProps } from "lucide-react";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import type React from "react";
import { Button, type ButtonProps } from "@/components/ui/button";

interface IconButtonProps {
  className?: string;
  Icon: React.ComponentType<LucideProps>;
  linkTo?: string;
  title: string;
  variant: ButtonProps["variant"];
  disabled: boolean;
  isPending?: boolean;
  onClick?: () => Promise<void> | void;
}

const IconButton: React.FC<IconButtonProps> = ({
  className,
  Icon,
  linkTo,
  title,
  variant,
  disabled = false,
  isPending = false,
  onClick,
}) => {
  const isLink = Boolean(linkTo) && !disabled && !isPending;

  return (
    <Button
      className={className}
      asChild={isLink}
      variant={variant}
      size="icon"
      title={title}
      disabled={disabled || isPending}
      onClick={onClick}
      aria-label={title}
    >
      {isPending ? (
        <span>
          <Loader2 className="animate-spin text-current" />
        </span>
      ) : isLink ? (
        <Link href={linkTo as string}>
          <Icon aria-hidden="true" className="text-current" />
        </Link>
      ) : (
        <span>
          <Icon aria-hidden="true" className="text-current" />
        </span>
      )}
    </Button>
  );
};

export default IconButton;
