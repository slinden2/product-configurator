import BackButton from "@/components/back-button";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20">
      <h1 className="text-3xl font-bold">Configurazione non trovata</h1>
      <p className="text-muted-foreground">
        La configurazione richiesta non esiste o è stata rimossa.
      </p>
      <BackButton fallbackPath="/configurazioni" />
    </div>
  );
}
