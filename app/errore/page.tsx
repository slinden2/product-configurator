import { Home, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function ErrorPage() {
  return (
    <div className="flex flex-col items-center justify-center gap-6 py-24 text-center">
      <div className="flex items-center justify-center rounded-full bg-muted p-6">
        <TriangleAlert className="h-12 w-12 text-muted-foreground" />
      </div>

      <div className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
          Errore
        </p>
        <h1 className="text-4xl font-bold tracking-tight">
          Qualcosa è andato storto
        </h1>
        <p className="max-w-sm text-muted-foreground">
          Si è verificato un errore imprevisto. Riprova più tardi.
        </p>
      </div>

      <Button asChild>
        <Link href="/">
          <Home className="mr-2 h-4 w-4" />
          Torna alla home
        </Link>
      </Button>
    </div>
  );
}
