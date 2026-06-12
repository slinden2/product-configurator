"use client";

import { FileText } from "lucide-react";
import { AsyncActionButton } from "@/components/shared/async-action-button";
import type { ExportOfferData } from "./create-offer-excel-file";
import type { OfferPdfMeta } from "./create-offer-pdf-file";

interface ExportOfferPdfButtonProps {
  data: ExportOfferData;
  meta: OfferPdfMeta;
  discountPct: number;
}

const ExportOfferPdfButton = ({
  data,
  meta,
  discountPct,
}: ExportOfferPdfButtonProps) => (
  <AsyncActionButton
    action={async () => {
      const { createOfferPdfFile } = await import("./create-offer-pdf-file");
      return createOfferPdfFile(data, meta, discountPct);
    }}
    icon={<FileText />}
    errorMsg="Errore durante l'esportazione del PDF."
    variant="outline"
    size="sm"
  >
    Esporta PDF
  </AsyncActionButton>
);

export default ExportOfferPdfButton;
