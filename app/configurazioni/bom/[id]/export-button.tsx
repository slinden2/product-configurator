"use client";

import { Share } from "lucide-react";
import { AsyncActionButton } from "@/components/shared/async-action-button";
import type { BOMItemWithDescription } from "@/lib/BOM";
import { MSG } from "@/lib/messages";

interface ExportButtonProps {
  exportData: BOMItemWithDescription[];
}

const ExportButton = ({ exportData }: ExportButtonProps) => (
  <AsyncActionButton
    action={async () => {
      const { exportBomToXls } = await import("@/lib/BOM/export-xlsx");
      exportBomToXls(exportData, "exp_config");
    }}
    icon={<Share />}
    errorMsg={MSG.toast.exportBomError}
    variant="outline"
    size="sm"
  >
    Esporta distinta di produzione
  </AsyncActionButton>
);

export default ExportButton;
