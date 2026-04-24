"use client";

import { Share } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import type { UserData } from "@/db/queries";
import type { GroupedOfferData } from "@/lib/offer";
import { createOfferExcelFile } from "./create-offer-excel-file";

interface ExportOfferButtonProps {
  data: GroupedOfferData & {
    total_list_price: number;
    discounted_total: number;
  };
  user: NonNullable<UserData>;
  discountPct: number;
}

const ExportOfferButton = ({
  data,
  user,
  discountPct,
}: ExportOfferButtonProps) => {
  const [isPending, startTransition] = useTransition();

  const handleExport = () => {
    startTransition(async () => {
      try {
        await createOfferExcelFile(data, user, discountPct);
      } catch {
        toast.error("Errore durante l'esportazione dell'offerta.");
      }
    });
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleExport}
      disabled={isPending}
    >
      {isPending ? <Spinner size="small" /> : <Share />}
      <span>Esporta offerta</span>
    </Button>
  );
};

export default ExportOfferButton;
