"use client";

import { snapshotEngineeringBomAction } from "@/app/actions/engineering-bom-actions";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Workflow } from "lucide-react";
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
    <Button
      variant="outline"
      disabled={isPending}
      onClick={handleSnapshot}
    >
      {isPending ? <Spinner className="h-4 w-4" /> : <Workflow className="h-4 w-4" />}
      <span>Genera distinta ingegneria</span>
    </Button>
  );
};

export default SnapshotButton;
