import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type React from "react";
import type { HTMLAttributes } from "react";

interface Props extends HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  title: string;
  description?: string;
}

const Fieldset = ({ children, title, description, ...rest }: Props) => {
  return (
    <Card {...rest} className="overflow-hidden shadow-lg mb-8">
      <CardHeader className="border-b bg-card-foreground/5">
        <CardTitle className="text-xl text-foreground">{title}</CardTitle>
        <CardDescription className="text-muted-foreground">
          {description || ""}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6">{children}</CardContent>
    </Card>
  );
};

export default Fieldset;
