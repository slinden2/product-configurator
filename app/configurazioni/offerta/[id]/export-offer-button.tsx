"use client";

import { Share } from "lucide-react";
import { AsyncActionButton } from "@/components/shared/async-action-button";
import type { UserData } from "@/db/queries";
import type { ExportOfferData } from "./create-offer-excel-file";
import { createOfferExcelFile } from "./create-offer-excel-file";

interface ExportOfferButtonProps {
  data: ExportOfferData;
  user: NonNullable<UserData>;
  discountPct: number;
}

const ExportOfferButton = ({
  data,
  user,
  discountPct,
}: ExportOfferButtonProps) => (
  <AsyncActionButton
    action={() => createOfferExcelFile(data, user, discountPct)}
    icon={<Share />}
    errorMsg="Errore durante l'esportazione dell'offerta."
    variant="outline"
    size="sm"
  >
    Esporta offerta
  </AsyncActionButton>
);

export default ExportOfferButton;
