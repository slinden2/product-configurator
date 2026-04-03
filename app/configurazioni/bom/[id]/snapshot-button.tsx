"use client";

import { snapshotEngineeringBomAction } from "@/app/actions/engineering-bom-actions";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Workflow } from "lucide-react";
import { useTransition } from "react";
import { MSG } from "@/lib/messages";
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
        toast.success(MSG.toast.bomGenerated);
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : MSG.toast.generateError,
        );
      }
    });
  };

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={isPending}
      onClick={handleSnapshot}
    >
      {isPending ? (
        <Spinner className="h-4 w-4" />
      ) : (
        <Workflow className="h-4 w-4" />
      )}
      <span>Genera distinta di commessa</span>
    </Button>
  );
};

export default SnapshotButton;
