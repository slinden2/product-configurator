"use client";

import { Pencil } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { updateSurchargeSettingAction } from "@/app/actions/surcharge-actions";
import PriceEditorDialog from "@/components/shared/price-editor-dialog";
import { RowActionsMenu } from "@/components/shared/row-actions-menu";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { TableCell, TableRow } from "@/components/ui/table";
import type { SurchargeSetting } from "@/db/schemas/surcharge-settings";
import { MSG } from "@/lib/messages";
import { formatDateDDMMYYYYHHMM, formatEur } from "@/lib/utils";
import type { SurchargeKind } from "@/types";
import { SurchargeKindLabels } from "@/types";

interface SurchargeRowProps {
  row: SurchargeSetting;
}

export default function SurchargeRow({ row }: SurchargeRowProps) {
  const [editOpen, setEditOpen] = useState(false);

  const handleEdit = async (price: string) => {
    try {
      const result = await updateSurchargeSettingAction({
        kind: row.kind as SurchargeKind,
        price,
      });
      if (result.success) {
        toast.success(MSG.toast.surchargeUpdated);
        setEditOpen(false);
      } else {
        toast.error(result.error ?? MSG.db.unknown);
      }
    } catch {
      toast.error(MSG.db.unknown);
    }
  };

  return (
    <>
      <TableRow>
        <TableCell className="text-sm">
          {SurchargeKindLabels[row.kind as SurchargeKind]}
        </TableCell>
        <TableCell className="font-mono text-sm text-right tabular-nums whitespace-nowrap">
          {formatEur(Number(row.price))}
        </TableCell>
        <TableCell className="text-sm whitespace-nowrap">
          {formatDateDDMMYYYYHHMM(row.updated_at)}
        </TableCell>
        <TableCell>
          <RowActionsMenu>
            <DropdownMenuItem onSelect={() => setEditOpen(true)}>
              <Pencil />
              Modifica prezzo
            </DropdownMenuItem>
          </RowActionsMenu>
        </TableCell>
      </TableRow>

      <PriceEditorDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        title={`Modifica prezzo — ${SurchargeKindLabels[row.kind as SurchargeKind]}`}
        initialPrice={Number(row.price).toFixed(2)}
        onSave={handleEdit}
      />
    </>
  );
}
