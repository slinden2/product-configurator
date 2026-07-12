"use client";

import { Pencil } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import PriceEditorDialog from "@/components/shared/price-editor-dialog";
import { RowActionsMenu } from "@/components/shared/row-actions-menu";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MSG } from "@/lib/messages";
import { formatDateDDMMYYYYHHMM, formatEur } from "@/lib/utils";

interface PriceSettingRowProps {
  label: string;
  price: number;
  updatedAt: Date;
  successMsg: string;
  onSave: (price: string) => Promise<{ success: boolean; error?: string }>;
}

const PriceSettingRow = ({
  label,
  price,
  updatedAt,
  successMsg,
  onSave,
}: PriceSettingRowProps) => {
  const [editOpen, setEditOpen] = useState(false);

  const handleEdit = async (newPrice: string) => {
    try {
      const result = await onSave(newPrice);
      if (result.success) {
        toast.success(successMsg);
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
        <TableCell className="text-sm">{label}</TableCell>
        <TableCell className="font-mono text-sm text-right tabular-nums whitespace-nowrap">
          {formatEur(price)}
        </TableCell>
        <TableCell className="text-sm whitespace-nowrap">
          {formatDateDDMMYYYYHHMM(updatedAt)}
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
        title={`Modifica prezzo — ${label}`}
        initialPrice={price.toFixed(2)}
        onSave={handleEdit}
      />
    </>
  );
};

interface PriceSettingsTableProps {
  labelHeader: string;
  priceHeader: string;
  emptyMessage: string;
  rows: Array<PriceSettingRowProps & { id: string }>;
}

/**
 * Generic "kind / price / last update" settings table with a per-row
 * price-editor dialog. Used by the installation-items and surcharges
 * admin pages, which differ only in headers, labels, action, and toast.
 */
export default function PriceSettingsTable({
  labelHeader,
  priceHeader,
  emptyMessage,
  rows,
}: PriceSettingsTableProps) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="uppercase text-xs">{labelHeader}</TableHead>
            <TableHead className="uppercase text-xs whitespace-nowrap text-right">
              {priceHeader}
            </TableHead>
            <TableHead className="uppercase text-xs whitespace-nowrap">
              Ultimo aggiornamento
            </TableHead>
            <TableHead className="uppercase text-xs">Azioni</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length > 0 ? (
            rows.map(({ id, ...row }) => <PriceSettingRow key={id} {...row} />)
          ) : (
            <TableRow>
              <TableCell
                colSpan={4}
                className="text-center text-muted-foreground text-sm"
              >
                {emptyMessage}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
