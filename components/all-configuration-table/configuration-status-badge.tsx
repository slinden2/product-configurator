import { Badge } from "@/components/ui/badge";
import { STATUS_CONFIG } from "@/lib/status-config";
import type { ConfigurationStatusType } from "@/types";

interface ConfigurationStatusBadgeProps {
  status: ConfigurationStatusType;
  /** Prepend the status' descriptive icon. Off by default for compact lists. */
  showIcon?: boolean;
}

const ConfigurationStatusBadge = ({
  status,
  showIcon = false,
}: ConfigurationStatusBadgeProps) => {
  const { label, color, icon: Icon } = STATUS_CONFIG[status];
  return (
    <Badge className="gap-1 text-background" style={{ backgroundColor: color }}>
      {showIcon && <Icon className="h-3.5 w-3.5" />}
      {label}
    </Badge>
  );
};

export default ConfigurationStatusBadge;
