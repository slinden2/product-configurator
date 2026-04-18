"use client";

import { Share } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { BOMItemWithDescription } from "@/lib/BOM";
import { exportBomToXls } from "@/lib/BOM/export-xlsx";

interface ExportButtonProps {
  exportData: BOMItemWithDescription[];
}

const ExportButton = ({ exportData }: ExportButtonProps) => {
  const handleExportBOM = () => {
    exportBomToXls(exportData, "exp_config");
  };

  return (
    <Button variant="outline" size="sm" onClick={handleExportBOM}>
      <Share />
      <span>Esporta distinta di produzione</span>
    </Button>
  );
};

export default ExportButton;
