"use client";

import { Share } from "lucide-react";
import { explodeBomToLeavesAction } from "@/app/actions/bom-lines-actions";
import { AsyncActionButton } from "@/components/shared/async-action-button";
import type { UserData } from "@/db/queries";
import type { BOMItemWithCost } from "@/lib/BOM";
import { createExcelFile } from "./create-excel-file";

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
      await createExcelFile(
        exportData.generalBOM,
        exportData.waterTankBOMs,
        exportData.washBayBOMs,
        user,
        result.data,
      );
    }}
    icon={<Share />}
    errorMsg="Errore durante l'esportazione dei costi."
    variant="outline"
    size="sm"
  >
    Esporta costi
  </AsyncActionButton>
);

export default ExportCostsButton;
