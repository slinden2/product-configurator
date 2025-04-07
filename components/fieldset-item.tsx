import { cn } from "@/lib/utils";
import React, { HTMLAttributes } from "react";

interface Props extends HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
  className?: string;
}

const FieldsetItem = ({ children, className, ...rest }: Props) => {
  return (
    <div {...rest} className={cn("space-y-3 md:flex-1", className)}>
      {children}
    </div>
  );
};

export default FieldsetItem;
