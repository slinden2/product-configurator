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
  const { label, bgClass } = STATUS_CONFIG[status];
  return (
    <Badge
      className={`${bgClass} hover:${bgClass} text-background`}>
      {label}
    </Badge>
  );
};

export default ConfigurationStatusBadge;
