"use client";

import { ArrowDownUp } from "lucide-react";
import { TableHead } from "@/components/ui/table";
import type { BomSortKey } from "@/hooks/use-sorted-rows";

interface BomTableHeadsProps {
  onSort: (key: BomSortKey) => void;
}

/**
 * The shared POS / Codice / Descrizione / Qtà header cells of the BOM tables
 * (Codice and Descrizione sortable). Extra columns (e.g. Azioni) follow as
 * siblings inside the same header row.
 */
export function BomTableHeads({ onSort }: BomTableHeadsProps) {
  return (
    <>
      <TableHead className="w-16 hidden sm:table-cell">POS</TableHead>
      <TableHead
        className="w-32 py-2 cursor-pointer whitespace-nowrap"
        onClick={() => onSort("pn")}
      >
        <span className="flex items-center">
          Codice <ArrowDownUp size={16} className="ml-1" />
        </span>
      </TableHead>
      <TableHead
        className="w-full py-2 cursor-pointer"
        onClick={() => onSort("description")}
      >
        <span className="flex items-center">
          Descrizione <ArrowDownUp size={16} className="ml-1" />
        </span>
      </TableHead>
      <TableHead className="w-24 py-2 text-center whitespace-nowrap">
        Qtà
      </TableHead>
    </>
  );
}
