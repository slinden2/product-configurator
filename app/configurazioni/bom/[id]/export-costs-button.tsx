"use client";

import { Share } from "lucide-react";
import { buildBomCostExportAction } from "@/app/actions/bom-lines-actions";
import { AsyncActionButton } from "@/components/shared/async-action-button";
import type { UserData } from "@/db/queries";
import { MSG } from "@/lib/messages";

interface ExportCostsButtonProps {
  confId: number;
  user: NonNullable<UserData>;
}

const ExportCostsButton = ({ confId, user }: ExportCostsButtonProps) => (
  <AsyncActionButton
    action={async () => {
      // The heavy cost enrichment runs here, on click — not on every page view.
      const result = await buildBomCostExportAction(confId);
      if (!result.success) throw new Error(result.error);
      const { createExcelFile } = await import("./create-excel-file");
      await createExcelFile(
        result.data.generalBOM,
        result.data.waterTankBOMs,
        result.data.washBayBOMs,
        user,
        result.data.exploded,
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
