import { Button, ButtonProps } from "@/components/ui/button";
import { LucideProps } from "lucide-react";
import Link from "next/link";
import React from "react";

interface IconButtonProps {
  Icon: React.ComponentType<LucideProps>;
  linkTo?: string;
  title: string;
  variant: ButtonProps["variant"];
  disabled: boolean;
  onClick?: () => Promise<void>;
}

const IconButton: React.FC<IconButtonProps> = ({
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
      asChild={isLink}
      variant={variant}
      size="icon"
      title={title}
      disabled={disabled}
      onClick={onClick}
      aria-label={title}>
      {isLink ? (
        <Link href={linkTo as string}>
          <Icon aria-hidden="true" />
        </Link>
      ) : (
        <span>
          <Icon aria-hidden="true" />
        </span>
      )}
    </Button>
  );
};

export default IconButton;
