"use client";

import { Share } from "lucide-react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import type { BOMItemWithDescription } from "@/lib/BOM";

interface ExportButtonProps {
  exportData: BOMItemWithDescription[];
}

const ExportButton = ({ exportData }: ExportButtonProps) => {
  const handleExportBOM = async () => {
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet);
    XLSX.writeFile(workbook, "exp_config.xls", {
      compression: true,
      bookType: "xls",
    });
  };

  return (
    <Button variant="outline" size="sm" onClick={handleExportBOM}>
      <Share />
      <span>Esporta distinta di produzione</span>
    </Button>
  );
};

export default ExportButton;
