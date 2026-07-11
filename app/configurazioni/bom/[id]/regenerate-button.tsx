"use client";

import { RefreshCw } from "lucide-react";
import { regenerateEngineeringBomAction } from "@/app/actions/engineering-bom-actions";
import { AsyncActionButton } from "@/components/shared/async-action-button";
import { MSG } from "@/lib/messages";

interface RegenerateButtonProps {
  confId: number;
}

const RegenerateButton = ({ confId }: RegenerateButtonProps) => (
  <AsyncActionButton
    action={() => regenerateEngineeringBomAction(confId)}
    icon={<RefreshCw />}
    successMsg={MSG.toast.bomRegenerated}
    errorMsg={MSG.toast.regenerateError}
    variant="outline"
    size="sm"
    confirm={MSG.bom.regenerateConfirm}
  >
    Rigenera distinta
  </AsyncActionButton>
);

export default RegenerateButton;
