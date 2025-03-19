"use client";

import { Button } from "@/components/ui/button";
import { BOMItemWithDescription } from "@/lib/BOM";
import { Share } from "lucide-react";
import React from "react";
import * as XLSX from "xlsx";

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
    <Button variant="outline" onClick={handleExportBOM}>
      <Share />
      <span>Esporta</span>
    </Button>
  );
};

export default ExportButton;
