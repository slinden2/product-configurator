import { Separator } from "@/components/ui/separator";
import React, { HTMLAttributes } from "react";

interface Props extends HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  title: string;
}

const FormSection = ({ children, title, ...rest }: Props) => {
  return (
    <section {...rest}>
      <h2 className="text-muted-foreground text-1xl font-bold mb-4">{title}</h2>
      {children}
      <Separator className="my-6" />
    </section>
  );
};

export default FormSection;
