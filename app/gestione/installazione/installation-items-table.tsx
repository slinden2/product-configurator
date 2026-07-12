"use client";

import { updateInstallationItemSettingAction } from "@/app/actions/installation-actions";
import PriceSettingsTable from "@/components/shared/price-settings-table";
import type { InstallationItemSetting } from "@/db/schemas/installation-item-settings";
import { MSG } from "@/lib/messages";
import { InstallationItemKindLabels } from "@/types";

interface InstallationItemsTableProps {
  rows: InstallationItemSetting[];
}

export default function InstallationItemsTable({
  rows,
}: InstallationItemsTableProps) {
  return (
    <PriceSettingsTable
      labelHeader="Voce"
      priceHeader="Prezzo predefinito"
      emptyMessage="Nessuna voce di installazione trovata."
      rows={rows.map((row) => ({
        id: row.kind,
        label: InstallationItemKindLabels[row.kind],
        price: Number(row.price),
        updatedAt: row.updated_at,
        successMsg: MSG.toast.installationItemUpdated,
        onSave: (price) =>
          updateInstallationItemSettingAction({ kind: row.kind, price }),
      }))}
    />
  );
}
