"use client";

import { ChevronDown, ChevronRight } from "lucide-react";
import { Fragment, useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { getAssemblyChildrenAction } from "@/app/actions/bom-lines-actions";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { TableCell, TableRow } from "@/components/ui/table";
import type { AssemblyChild } from "@/db/queries";
import { MSG } from "@/lib/messages";
import { cn } from "@/lib/utils";

const MAX_SUB_BOM_DEPTH = 10;

type LoadStatus = "idle" | "loading" | "loaded" | "error";

interface AssemblyChildrenRowsProps {
  parentPn: string;
  depth: number;
  columnCount: number;
}

export function AssemblyChildrenRows({
  parentPn,
  depth,
  columnCount,
}: AssemblyChildrenRowsProps) {
  const [status, setStatus] = useState<LoadStatus>("idle");
  const [children, setChildren] = useState<AssemblyChild[]>([]);
  const [expandedPns, setExpandedPns] = useState<Set<string>>(new Set());
  const [, startTransition] = useTransition();

  useEffect(() => {
    setStatus("loading");
    startTransition(async () => {
      const result = await getAssemblyChildrenAction(parentPn);
      if (!result.success) {
        toast.error(MSG.toast.subBomLoadFailed);
        setStatus("error");
        return;
      }
      setChildren(result.data);
      setStatus("loaded");
    });
  }, [parentPn]);

  if (status === "loading" || status === "idle") {
    return (
      <TableRow>
        <TableCell colSpan={columnCount} className="py-2 text-center">
          <Spinner size="small" className="h-4 w-4" />
        </TableCell>
      </TableRow>
    );
  }

  if (status === "error" || children.length === 0) {
    return null;
  }

  const paddingClass = `pl-${Math.min(depth * 4, 16)}`;

  function toggleExpanded(pn: string) {
    setExpandedPns((prev) => {
      const next = new Set(prev);
      if (next.has(pn)) {
        next.delete(pn);
      } else {
        next.add(pn);
      }
      return next;
    });
  }

  return (
    <>
      {children.map((child) => {
        const isAssy = child.pn_type === "ASSY";
        const canExpand = isAssy && depth < MAX_SUB_BOM_DEPTH;
        const isExpanded = expandedPns.has(child.pn);

        if (isAssy && depth >= MAX_SUB_BOM_DEPTH) {
          console.warn(
            `[sub-BOM] depth cap (${MAX_SUB_BOM_DEPTH}) reached at PN: ${child.pn}`,
          );
        }

        return (
          <Fragment key={`${parentPn}::${child.sort_order}::${child.pn}`}>
            <TableRow className="text-muted-foreground text-xs">
              <TableCell className="hidden sm:table-cell whitespace-nowrap">
                <div className="flex items-center gap-0.5">
                  {canExpand && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5"
                      onClick={() => toggleExpanded(child.pn)}
                      title={isExpanded ? "Comprimi" : "Espandi"}
                    >
                      {isExpanded ? (
                        <ChevronDown size={12} />
                      ) : (
                        <ChevronRight size={12} />
                      )}
                    </Button>
                  )}
                  <span className={cn(!canExpand && "pl-5")}>
                    └─ {child.sort_order}
                  </span>
                </div>
              </TableCell>
              <TableCell className={cn("py-1 whitespace-nowrap", paddingClass)}>
                {child.pn}
              </TableCell>
              <TableCell className="py-1 break-words min-w-0">
                {child.description}
              </TableCell>
              <TableCell className="py-1 text-center">{child.qty}</TableCell>
              {columnCount === 5 && <TableCell />}
            </TableRow>
            {canExpand && isExpanded && (
              <AssemblyChildrenRows
                parentPn={child.pn}
                depth={depth + 1}
                columnCount={columnCount}
              />
            )}
          </Fragment>
        );
      })}
    </>
  );
}
