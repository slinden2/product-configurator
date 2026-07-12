"use client";

import { Share } from "lucide-react";
import { explodeBomToLeavesAction } from "@/app/actions/bom-lines-actions";
import { AsyncActionButton } from "@/components/shared/async-action-button";
import type { UserData } from "@/db/queries";
import type { BOMItemWithCost } from "@/lib/BOM";
import { MSG } from "@/lib/messages";

interface ExportCostsButtonProps {
  exportData: {
    generalBOM: BOMItemWithCost[];
    waterTankBOMs: BOMItemWithCost[][];
    washBayBOMs: BOMItemWithCost[][];
  };
  user: NonNullable<UserData>;
}

const ExportCostsButton = ({ exportData, user }: ExportCostsButtonProps) => (
  <AsyncActionButton
    action={async () => {
      const result = await explodeBomToLeavesAction(exportData);
      if (!result.success) throw new Error(result.error);
      const { createExcelFile } = await import("./create-excel-file");
      await createExcelFile(
        exportData.generalBOM,
        exportData.waterTankBOMs,
        exportData.washBayBOMs,
        user,
        result.data,
      );
    }}
    icon={<Share />}
    errorMsg={MSG.toast.exportCostsError}
    variant="outline"
    size="sm"
  >
    Esporta costi
  </AsyncActionButton>
);

export default ExportCostsButton;
