"use client";

import { FileText, Share } from "lucide-react";
import { AsyncActionButton } from "@/components/shared/async-action-button";
import type { OfferRevisionExportData } from "@/lib/offer-export";
import {
  localIsoDate,
  offerExportFilenameStem,
} from "@/lib/offer-export-filename";
import { formatDateDDMMYYYYHHMM } from "@/lib/utils";
import { createOfferExcelFile } from "./create-offer-excel-file";

interface OfferExportButtonsProps {
  data: OfferRevisionExportData;
  /** Initials of the user triggering the export, shown as the document author
   * (Excel workbook creator, PDF footer). */
  exporterInitials: string;
}

const OfferExportButtons = ({
  data,
  exporterInitials,
}: OfferExportButtonsProps) => (
  <div className="flex items-center gap-2">
    <AsyncActionButton
      action={() => {
        const stem = offerExportFilenameStem(data, localIsoDate());
        return createOfferExcelFile(data, exporterInitials, `${stem}.xlsx`);
      }}
      icon={<Share />}
      errorMsg="Errore durante l'esportazione dell'offerta."
      variant="outline"
      size="sm"
    >
      Esporta Excel
    </AsyncActionButton>
    <AsyncActionButton
      action={async () => {
        const { createOfferPdfFile } = await import("./create-offer-pdf-file");
        const stem = offerExportFilenameStem(data, localIsoDate());
        return createOfferPdfFile(
          data,
          {
            offerNumber: data.offerNumber,
            customerName: data.customerName,
            generatedAt: formatDateDDMMYYYYHHMM(new Date()),
            generatorInitials: exporterInitials,
          },
          `${stem}.pdf`,
        );
      }}
      icon={<FileText />}
      errorMsg="Errore durante l'esportazione del PDF."
      variant="outline"
      size="sm"
    >
      Esporta PDF
    </AsyncActionButton>
  </div>
);

export default OfferExportButtons;
