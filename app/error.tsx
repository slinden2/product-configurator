"use client";

import { Home, RotateCcw, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

/**
 * Root App Router error boundary: catches uncaught exceptions from any page
 * or server component below the root layout (the layout itself is covered by
 * global-error.tsx). Distinct from the `/errore` route, which is a plain page
 * that auth flows redirect to on purpose.
 */
export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Uncaught route error:", error);
  }, [error]);

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
          Si è verificato un errore imprevisto. Riprova oppure torna alla home.
        </p>
      </div>

      <div className="flex gap-4">
        <Button onClick={reset}>
          <RotateCcw className="mr-2 h-4 w-4" />
          Riprova
        </Button>
        <Button asChild variant="outline">
          <Link href="/">
            <Home className="mr-2 h-4 w-4" />
            Torna alla home
          </Link>
        </Button>
      </div>
    </div>
  );
}
