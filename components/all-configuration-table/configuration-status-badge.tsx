import { Badge } from "@/components/ui/badge";
import { STATUS_CONFIG } from "@/lib/status-config";
import type { ConfigurationStatusType } from "@/types";

interface ConfigurationStatusBadgeProps {
  status: ConfigurationStatusType;
}

const ConfigurationStatusBadge = ({
  status,
}: ConfigurationStatusBadgeProps) => {
  const { label, color } = STATUS_CONFIG[status];
  return (
    <Badge className="text-background" style={{ backgroundColor: color }}>
      {label}
    </Badge>
  );
};

export default ConfigurationStatusBadge;
