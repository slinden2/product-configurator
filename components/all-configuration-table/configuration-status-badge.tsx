import React from "react";
import { Badge } from "@/components/ui/badge";
import { ConfigurationStatusType } from "@/types";

interface ConfigurationStatusBadgeProps {
  status: ConfigurationStatusType;
}

const statusMap: Record<
  ConfigurationStatusType,
  {
    label: string;
    color: "bg-slate-400" | "bg-green-400" | "bg-blue-400" | "bg-rose-400";
  }
> = {
  DRAFT: { label: "Bozza", color: "bg-slate-400" },
  OPEN: { label: "Aperto", color: "bg-green-400" },
  LOCKED: { label: "Bloccato", color: "bg-blue-400" },
  CLOSED: { label: "Chiuso", color: "bg-rose-400" },
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
