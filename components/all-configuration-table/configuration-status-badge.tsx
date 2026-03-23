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
  SUBMITTED: { label: "Inviato", className: "bg-green-400 hover:bg-green-400" },
  IN_REVIEW: { label: "In Revisione", className: "bg-blue-400 hover:bg-blue-400" },
  APPROVED: { label: "Approvato", className: "bg-amber-400 hover:bg-amber-400" },
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
