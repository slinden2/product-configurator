"use client";

import { snapshotEngineeringBomAction } from "@/app/actions/engineering-bom-actions";
import { LoadingButton } from "@/components/ui/loading-button";
import { Sparkles } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";

interface SnapshotButtonProps {
  confId: number;
}

const SnapshotButton = ({ confId }: SnapshotButtonProps) => {
  const [isPending, startTransition] = useTransition();

  const handleSnapshot = () => {
    startTransition(async () => {
      try {
        await snapshotEngineeringBomAction(confId);
        toast.success("Distinta ingegneria generata.");
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Errore durante la generazione."
        );
      }
    });
  };

  return (
    <LoadingButton
      variant="outline"
      loading={isPending}
      onClick={handleSnapshot}
    >
      <Sparkles />
      <span>Genera distinta ingegneria</span>
    </LoadingButton>
  );
};

export default SnapshotButton;
