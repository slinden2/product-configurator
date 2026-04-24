"use client";

import { Workflow } from "lucide-react";
import { snapshotEngineeringBomAction } from "@/app/actions/engineering-bom-actions";
import { AsyncActionButton } from "@/components/shared/async-action-button";
import { MSG } from "@/lib/messages";

interface SnapshotButtonProps {
  confId: number;
}

const SnapshotButton = ({ confId }: SnapshotButtonProps) => (
  <AsyncActionButton
    action={() => snapshotEngineeringBomAction(confId)}
    icon={<Workflow />}
    successMsg={MSG.toast.bomGenerated}
    errorMsg={MSG.toast.generateError}
    variant="outline"
    size="sm"
  >
    Genera distinta di commessa
  </AsyncActionButton>
);

export default SnapshotButton;
