import { cn } from "@/lib/utils";
import React, { HTMLAttributes } from "react";

interface Props extends HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
  className?: string;
}

const FieldsetRow = ({ children, className, ...rest }: Props) => {
  return (
    <div
      {...rest}
      className={cn("space-y-3 md:flex md:gap-4 md:space-y-0", className)}>
      {children}
    </div>
  );
};

export default FieldsetRow;
