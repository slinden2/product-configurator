"use client";

import { updateSurchargeSettingAction } from "@/app/actions/surcharge-actions";
import PriceSettingsTable from "@/components/shared/price-settings-table";
import type { SurchargeSetting } from "@/db/schemas/surcharge-settings";
import { MSG } from "@/lib/messages";
import { SurchargeKindLabels } from "@/types";

interface SurchargesTableProps {
  rows: SurchargeSetting[];
}

export default function SurchargesTable({ rows }: SurchargesTableProps) {
  return (
    <PriceSettingsTable
      labelHeader="Tipo"
      priceHeader="Prezzo"
      emptyMessage="Nessuna maggiorazione trovata."
      rows={rows.map((row) => ({
        id: row.kind,
        label: SurchargeKindLabels[row.kind],
        price: Number(row.price),
        updatedAt: row.updated_at,
        successMsg: MSG.toast.surchargeUpdated,
        onSave: (price) =>
          updateSurchargeSettingAction({ kind: row.kind, price }),
      }))}
    />
  );
}
