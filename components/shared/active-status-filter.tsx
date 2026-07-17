import { X } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

interface ActiveStatusFilterProps {
  label: string;
  clearHref: string;
}

export function ActiveStatusFilter({
  label,
  clearHref,
}: ActiveStatusFilterProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground">Filtro attivo:</span>
      <Badge variant="secondary" className="gap-1 pr-1">
        {label}
        <Link
          href={clearHref}
          className="ml-1 rounded-sm hover:bg-muted p-0.5"
          aria-label="Rimuovi filtro"
        >
          <X className="h-3 w-3" />
        </Link>
      </Badge>
    </div>
  );
}
