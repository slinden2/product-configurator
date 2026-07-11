"use client";

import { FileText } from "lucide-react";
import { AsyncActionButton } from "@/components/shared/async-action-button";
import { MSG } from "@/lib/messages";
import { formatDateDDMMYYYYHHMM } from "@/lib/utils";
import type { UpdateConfigSchema } from "@/validation/config-schema";
import type { UpdateWashBaySchema } from "@/validation/wash-bay-schema";
import type { UpdateWaterTankSchema } from "@/validation/water-tank-schema";

interface ExportConfigPdfButtonProps {
  confId: number;
  configuration: UpdateConfigSchema;
  waterTanks: UpdateWaterTankSchema[];
  washBays: UpdateWashBaySchema[];
  generatorEmail: string | null;
}

const ExportConfigPdfButton = ({
  confId,
  configuration,
  waterTanks,
  washBays,
  generatorEmail,
}: ExportConfigPdfButtonProps) => (
  <AsyncActionButton
    action={async () => {
      const { createConfigPdfFile } = await import("./create-config-pdf-file");
      return createConfigPdfFile(configuration, waterTanks, washBays, {
        confId,
        clientName: configuration.name || "—",
        generatedAt: formatDateDDMMYYYYHHMM(new Date()),
        generatorEmail,
      });
    }}
    icon={<FileText />}
    errorMsg={MSG.toast.exportPdfError}
    variant="outline"
  >
    Esporta PDF
  </AsyncActionButton>
);

export default ExportConfigPdfButton;
