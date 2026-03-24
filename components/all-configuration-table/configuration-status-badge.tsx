import React from "react";
import { Badge } from "@/components/ui/badge";
import { ConfigurationStatusType } from "@/types";
import { STATUS_CONFIG } from "@/lib/status-config";

interface ConfigurationStatusBadgeProps {
  status: ConfigurationStatusType;
}

const ConfigurationStatusBadge = ({
  status,
}: ConfigurationStatusBadgeProps) => {
  const { label, color } = STATUS_CONFIG[status];
  return (
    <Badge
      className="text-background"
      style={{ backgroundColor: color }}>
      {label}
    </Badge>
  );
};

export default ConfigurationStatusBadge;
