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
    confirm={{
      title: "Rigenerare la distinta?",
      description:
        "Attenzione: questa azione sovrascriverà tutte le modifiche manuali alla distinta. La distinta verrà ricalcolata dalla configurazione attuale. Continuare?",
      confirmLabel: "Rigenera",
    }}
  >
    Rigenera distinta
  </AsyncActionButton>
);

export default RegenerateButton;
