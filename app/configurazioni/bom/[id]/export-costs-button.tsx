"use client";

import { Share } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";
import { explodeBomToLeavesAction } from "@/app/actions/bom-lines-actions";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
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

const ExportCostsButton = ({ exportData, user }: ExportCostsButtonProps) => {
  const [isPending, startTransition] = useTransition();

  const handleExportBOM = () => {
    startTransition(async () => {
      const result = await explodeBomToLeavesAction(exportData);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      await createExcelFile(
        exportData.generalBOM,
        exportData.waterTankBOMs,
        exportData.washBayBOMs,
        user,
        result.data,
      );
    });
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleExportBOM}
      disabled={isPending}
    >
      {isPending ? <Spinner size="small" /> : <Share />}
      <span>Esporta costi</span>
    </Button>
  );
};

export default ExportCostsButton;
