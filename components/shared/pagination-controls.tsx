import Link from "next/link";
import { Button } from "@/components/ui/button";

interface PaginationControlsProps {
  page: number;
  totalPages: number;
  buildHref: (page: number) => string;
}

const PaginationControls = ({
  page,
  totalPages,
  buildHref,
}: PaginationControlsProps) => {
  if (totalPages <= 1) return null;

  const hasPrev = page > 1;
  const hasNext = page < totalPages;

  return (
    <div className="flex items-center justify-end gap-4 mt-4">
      <span className="text-sm text-muted-foreground">
        Pagina {page} di {totalPages}
      </span>
      <div className="flex gap-2">
        {hasPrev ? (
          <Button variant="outline" size="sm" asChild>
            <Link href={buildHref(page - 1)}>Precedente</Link>
          </Button>
        ) : (
          <Button variant="outline" size="sm" disabled>
            Precedente
          </Button>
        )}
        {hasNext ? (
          <Button variant="outline" size="sm" asChild>
            <Link href={buildHref(page + 1)}>Successiva</Link>
          </Button>
        ) : (
          <Button variant="outline" size="sm" disabled>
            Successiva
          </Button>
        )}
      </div>
    </div>
  );
};

export default PaginationControls;
