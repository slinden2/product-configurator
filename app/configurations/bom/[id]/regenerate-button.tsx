"use client";

import { regenerateEngineeringBomAction } from "@/app/actions/engineering-bom-actions";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { RefreshCw } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";

interface RegenerateButtonProps {
  confId: number;
}

const RegenerateButton = ({ confId }: RegenerateButtonProps) => {
  const [isPending, startTransition] = useTransition();

  const handleRegenerate = () => {
    startTransition(async () => {
      try {
        await regenerateEngineeringBomAction(confId);
        toast.success("Distinta ingegneria rigenerata.");
      } catch (err) {
        toast.error(
          err instanceof Error
            ? err.message
            : "Errore durante la rigenerazione."
        );
      }
    });
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" disabled={isPending}>
          {isPending ? <Spinner className="h-4 w-4" /> : <RefreshCw className="h-4 w-4" />}
          <span>Rigenera distinta</span>
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Rigenerare la distinta?</AlertDialogTitle>
          <AlertDialogDescription>
            Attenzione: questa azione sovrascriverà tutte le modifiche manuali
            alla distinta. La distinta verrà ricalcolata dalla configurazione
            attuale. Continuare?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Annulla</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleRegenerate}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Rigenera
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default RegenerateButton;
