import { Button, ButtonProps } from "@/components/ui/button";
import { LucideProps } from "lucide-react";
import Link from "next/link";
import React from "react";

interface IconButtonProps {
  className?: string;
  Icon: React.ComponentType<LucideProps>;
  linkTo?: string;
  title: string;
  variant: ButtonProps["variant"];
  disabled: boolean;
  onClick?: () => Promise<void> | void;
}

const IconButton: React.FC<IconButtonProps> = ({
  className,
  Icon,
  linkTo,
  title,
  variant,
  disabled = false,
  onClick,
}) => {
  const isLink = Boolean(linkTo) && !disabled;

  return (
    <Button
      className={className}
      asChild={isLink}
      variant={variant}
      size="icon"
      title={title}
      disabled={disabled}
      onClick={onClick}
      aria-label={title}>
      {isLink ? (
        <Link href={linkTo as string}>
          <Icon aria-hidden="true" className={`text-current`} />
        </Link>
      ) : (
        <span>
          <Icon aria-hidden="true" className={`text-current`} />
        </span>
      )}
    </Button>
  );
};

export default IconButton;
