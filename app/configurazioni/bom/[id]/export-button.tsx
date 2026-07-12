"use client";

import { Share } from "lucide-react";
import { AsyncActionButton } from "@/components/shared/async-action-button";
import type { BOMItemWithDescription } from "@/lib/BOM";
import { exportBomToXls } from "@/lib/BOM/export-xlsx";
import { MSG } from "@/lib/messages";

interface ExportButtonProps {
  exportData: BOMItemWithDescription[];
}

const ExportButton = ({ exportData }: ExportButtonProps) => (
  <AsyncActionButton
    action={async () => {
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
