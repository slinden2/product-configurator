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
  color?: string;

  onClick?: () => Promise<void>;
}

const IconButton: React.FC<IconButtonProps> = ({
  className,
  Icon,
  linkTo,
  title,
  variant,
  disabled = false,
  color,
  onClick,
}) => {
  const isLink = Boolean(linkTo) && !disabled;

  return (
    <Button
      className={`${className} ${
        color ? `text-${color} hover:text-${color}` : ""
      }`}
      asChild={isLink}
      variant={variant}
      size="icon"
      title={title}
      disabled={disabled}
      onClick={onClick}
      aria-label={title}>
      {isLink ? (
        <Link href={linkTo as string}>
          <Icon aria-hidden="true" className={`text-current text-${color}`} />
        </Link>
      ) : (
        <span>
          <Icon aria-hidden="true" className={`text-current text-${color}`} />
        </span>
      )}
    </Button>
  );
};

export default IconButton;
