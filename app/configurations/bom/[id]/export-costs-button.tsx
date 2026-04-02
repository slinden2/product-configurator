"use client";

import { Button } from "@/components/ui/button";
import type { BOMItemWithCost } from "@/lib/BOM";
import { Share } from "lucide-react";
import type { UserData } from "@/db/queries";
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
  const handleExportBOM = async () => {
    console.log(exportData);

    createExcelFile(
      exportData.generalBOM,
      exportData.waterTankBOMs,
      exportData.washBayBOMs,
      user,
    );
  };

  return (
    <Button variant="outline" size="sm" onClick={handleExportBOM}>
      <Share />
      <span>Esporta costi</span>
    </Button>
  );
};

export default ExportCostsButton;
