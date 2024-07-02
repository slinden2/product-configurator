import React from "react";
import { Badge } from "@/components/ui/badge";
import { Status } from "@prisma/client";

interface ConfigurationStatusBadgeProps {
  status: Status;
}

const statusMap: Record<
  Status,
  { label: string; color: "bg-red-400" | "bg-blue-400" | "bg-green-400" }
> = {
  OPEN: { label: "Aperto", color: "bg-green-400" },
  LOCKED: { label: "Bloccato", color: "bg-blue-400" },
  CLOSED: { label: "Chiuso", color: "bg-red-400" },
};

const ConfigurationStatusBadge = ({
  status,
}: ConfigurationStatusBadgeProps) => {
  return (
    <Badge
      className={`${statusMap[status].color} text-background hover:${statusMap[status].color}`}>
      {statusMap[status].label}
    </Badge>
  );
};

export default ConfigurationStatusBadge;
