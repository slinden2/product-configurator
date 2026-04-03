import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Home, SearchX } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center gap-6 py-24 text-center">
      <div className="flex items-center justify-center rounded-full bg-muted p-6">
        <SearchX className="h-12 w-12 text-muted-foreground" />
      </div>

      <div className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
          Errore 404
        </p>
        <h1 className="text-4xl font-bold tracking-tight">
          Pagina non trovata
        </h1>
        <p className="max-w-sm text-muted-foreground">
          La pagina che stai cercando non esiste o è stata spostata.
        </p>
      </div>

      <Button asChild>
        <Link href="/configurazioni">
          <Home className="mr-2 h-4 w-4" />
          Torna alla home
        </Link>
      </Button>
    </div>
  );
}
