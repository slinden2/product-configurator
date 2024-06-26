import { cn } from "@/lib/utils";
import React, { HTMLAttributes } from "react";

interface Props extends HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
  className?: string;
}

const FieldsetContent = ({ children, className, ...rest }: Props) => {
  return (
    <div {...rest} className={cn("space-y-3", className)}>
      {children}
    </div>
  );
};

export default FieldsetContent;
