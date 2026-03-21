import React from "react";
import { Badge } from "@/components/ui/badge";
import { ConfigurationStatusType } from "@/types";

interface ConfigurationStatusBadgeProps {
  status: ConfigurationStatusType;
}

const statusMap: Record<
  ConfigurationStatusType,
  { label: string; className: string }
> = {
  DRAFT: { label: "Bozza", className: "bg-slate-400 hover:bg-slate-400" },
  OPEN: { label: "Aperto", className: "bg-green-400 hover:bg-green-400" },
  LOCKED: { label: "Bloccato", className: "bg-blue-400 hover:bg-blue-400" },
  CLOSED: { label: "Chiuso", className: "bg-rose-400 hover:bg-rose-400" },
};

const ConfigurationStatusBadge = ({
  status,
}: ConfigurationStatusBadgeProps) => {
  return (
    <Badge
      className={`${statusMap[status].className} text-background`}>
      {statusMap[status].label}
    </Badge>
  );
};

export default ConfigurationStatusBadge;
