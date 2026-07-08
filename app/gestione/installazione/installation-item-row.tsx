"use client";

import { Pencil } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { updateInstallationItemSettingAction } from "@/app/actions/installation-actions";
import PriceEditorDialog from "@/components/shared/price-editor-dialog";
import { RowActionsMenu } from "@/components/shared/row-actions-menu";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { TableCell, TableRow } from "@/components/ui/table";
import type { InstallationItemSetting } from "@/db/schemas/installation-item-settings";
import { MSG } from "@/lib/messages";
import { formatDateDDMMYYYYHHMM, formatEur } from "@/lib/utils";
import type { InstallationItemKind } from "@/types";
import { InstallationItemKindLabels } from "@/types";

interface InstallationItemRowProps {
  row: InstallationItemSetting;
}

export default function InstallationItemRow({ row }: InstallationItemRowProps) {
  const [editOpen, setEditOpen] = useState(false);

  const handleEdit = async (price: string) => {
    try {
      const result = await updateInstallationItemSettingAction({
        kind: row.kind as InstallationItemKind,
        price,
      });
      if (result.success) {
        toast.success(MSG.toast.installationItemUpdated);
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
          {InstallationItemKindLabels[row.kind as InstallationItemKind]}
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
        title={`Modifica prezzo — ${InstallationItemKindLabels[row.kind as InstallationItemKind]}`}
        initialPrice={Number(row.price).toFixed(2)}
        onSave={handleEdit}
      />
    </>
  );
}
