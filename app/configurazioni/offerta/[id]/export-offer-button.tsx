"use client";

import { Share } from "lucide-react";
import { AsyncActionButton } from "@/components/shared/async-action-button";
import type { UserData } from "@/db/queries";
import type { OfferSnapshotSettings } from "@/lib/offer-settings";
import type { ExportOfferData } from "./create-offer-excel-file";
import { createOfferExcelFile } from "./create-offer-excel-file";

interface ExportOfferButtonProps {
  data: ExportOfferData;
  user: NonNullable<UserData>;
  discountPct: number;
  settings: OfferSnapshotSettings;
}

const ExportOfferButton = ({
  data,
  user,
  discountPct,
  settings,
}: ExportOfferButtonProps) => (
  <AsyncActionButton
    action={() => createOfferExcelFile(data, user, discountPct, settings)}
    icon={<Share />}
    errorMsg="Errore durante l'esportazione dell'offerta."
    variant="outline"
    size="sm"
  >
    Esporta offerta
  </AsyncActionButton>
);

export default ExportOfferButton;
