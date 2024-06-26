import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import React, { HTMLAttributes } from "react";

interface Props extends HTMLAttributes<HTMLFieldSetElement> {
  children: React.ReactNode;
  title: string;
  className?: string;
  legendClassName?: string;
}

const Fieldset = ({
  children,
  title,
  className,
  legendClassName,
  ...rest
}: Props) => {
  return (
    <fieldset className={className} {...rest}>
      <legend
        className={cn(
          "text-muted-foreground text-1xl font-bold mb-4",
          legendClassName
        )}>
        {title}
      </legend>
      {children}
      <Separator className="my-6" />
    </fieldset>
  );
};

export default Fieldset;
