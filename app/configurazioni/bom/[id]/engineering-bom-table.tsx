"use client";

import {
  ArrowDownUp,
  Check,
  ChevronDown,
  ChevronRight,
  FileDown,
  Ghost,
  Pencil,
  Trash2,
  Undo2,
  X,
} from "lucide-react";
import { Fragment, useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { getAssemblyChildrenAction } from "@/app/actions/bom-lines-actions";
import {
  toggleDeleteEngineeringBomItemAction,
  updateEngineeringBomItemQtyAction,
} from "@/app/actions/engineering-bom-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { EngineeringBomItemWithPart } from "@/db/queries";
import { exportBomToXls } from "@/lib/BOM/export-xlsx";
import { MSG } from "@/lib/messages";
import { cn } from "@/lib/utils";
import { AssemblyChildrenRows } from "./assembly-children-rows";

interface EngineeringBomTableProps {
  items: EngineeringBomItemWithPart[];
  confId: number;
  editable: boolean;
}

interface SortState {
  key: "pn" | "description" | null;
  direction: "asc" | "desc";
}

function sortByPn(arr: EngineeringBomItemWithPart[]) {
  return [...arr].sort((a, b) => a.pn.localeCompare(b.pn));
}

const EngineeringBomTable = ({
  items,
  confId,
  editable,
}: EngineeringBomTableProps) => {
  const [dataArr, setDataArr] = useState(() => sortByPn(items));
  const [sorting, setSorting] = useState<SortState>({
    key: "pn",
    direction: "asc",
  });
  // Sync local state when items prop changes (e.g. after adding a row)
  useEffect(() => {
    setDataArr(sortByPn(items));
    setSorting({ key: "pn", direction: "asc" });
  }, [items]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editQty, setEditQty] = useState<string>("");
  const [expandedRowIds, setExpandedRowIds] = useState<Set<number>>(new Set());
  const [isPending, startTransition] = useTransition();

  function toggleExpanded(id: number) {
    setExpandedRowIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function sortTable(key: SortState["key"]) {
    if (!key) return;
    let direction: SortState["direction"] = "asc";
    if (sorting.key === key) {
      direction = sorting.direction === "asc" ? "desc" : "asc";
    }
    const sortedData = [...dataArr].sort((a, b) => {
      if (a[key] < b[key]) return direction === "asc" ? -1 : 1;
      if (a[key] > b[key]) return direction === "asc" ? 1 : -1;
      return 0;
    });
    setDataArr(sortedData);
    setSorting({ key, direction });
  }

  function startEdit(item: EngineeringBomItemWithPart) {
    setEditingId(item.id);
    setEditQty(String(item.qty));
  }

  function cancelEdit() {
    setEditingId(null);
    setEditQty("");
  }

  function saveEdit(itemId: number) {
    const newQty = parseInt(editQty, 10);
    if (!Number.isInteger(newQty) || newQty < 1) {
      toast.error(MSG.toast.qtyInvalid);
      return;
    }
    startTransition(async () => {
      try {
        await updateEngineeringBomItemQtyAction(confId, itemId, newQty);
        setDataArr((prev) =>
          prev.map((item) =>
            item.id === itemId ? { ...item, qty: newQty } : item,
          ),
        );
        setEditingId(null);
        toast.success(MSG.toast.qtyUpdated);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : MSG.toast.updateError);
      }
    });
  }

  function toggleDelete(itemId: number) {
    const current = dataArr.find((i) => i.id === itemId);
    const wasDeleted = current?.is_deleted ?? false;
    startTransition(async () => {
      try {
        await toggleDeleteEngineeringBomItemAction(confId, itemId);
        setDataArr((prev) =>
          prev.map((item) =>
            item.id === itemId
              ? { ...item, is_deleted: !item.is_deleted }
              : item,
          ),
        );
        toast.success(
          wasDeleted ? MSG.toast.rowRestored : MSG.toast.rowDeleted,
        );
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : MSG.toast.operationError,
        );
      }
    });
  }

  function handleExportRow(item: EngineeringBomItemWithPart) {
    startTransition(async () => {
      const result = await getAssemblyChildrenAction(item.pn);
      if (!result.success) {
        toast.error(result.error ?? MSG.toast.subBomLoadFailed);
        return;
      }
      if (result.data.length === 0) {
        toast.error(MSG.toast.subBomEmpty);
        return;
      }
      exportBomToXls(result.data, item.pn);
    });
  }

  function getRowClassName(item: EngineeringBomItemWithPart): string {
    if (item.is_deleted) return "opacity-50 bg-muted/30";
    if (item.is_custom) return "bg-orange-500/10";
    if (item.is_added) return "bg-green-500/10";
    if (item.original_qty !== null && item.qty !== item.original_qty)
      return "bg-yellow-500/10";
    return "";
  }

  return (
    <Table className="mb-3 rounded-lg font-mono">
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className="w-16 hidden sm:table-cell">POS</TableHead>
          <TableHead
            className="w-32 py-2 cursor-pointer whitespace-nowrap"
            onClick={() => sortTable("pn")}
          >
            <span className="flex items-center">
              Codice <ArrowDownUp size={16} className="ml-1" />
            </span>
          </TableHead>
          <TableHead
            className="w-full py-2 cursor-pointer"
            onClick={() => sortTable("description")}
          >
            <span className="flex items-center">
              Descrizione <ArrowDownUp size={16} className="ml-1" />
            </span>
          </TableHead>
          <TableHead className="w-24 py-2 text-center whitespace-nowrap">
            Qtà
          </TableHead>
          {editable && (
            <TableHead className="w-24 py-2 text-center whitespace-nowrap">
              Azioni
            </TableHead>
          )}
        </TableRow>
      </TableHeader>
      <TableBody className="text-sm">
        {dataArr.map((item, index) => (
          <Fragment key={item.id}>
            <TableRow className={cn(getRowClassName(item))}>
              <TableCell className="hidden sm:table-cell">
                <div className="flex items-center gap-0.5">
                  {item.pn_type === "ASSY" && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => toggleExpanded(item.id)}
                      title={
                        expandedRowIds.has(item.id) ? "Comprimi" : "Espandi"
                      }
                    >
                      {expandedRowIds.has(item.id) ? (
                        <ChevronDown size={14} />
                      ) : (
                        <ChevronRight size={14} />
                      )}
                    </Button>
                  )}
                  <span className={cn(item.pn_type !== "ASSY" && "pl-7")}>
                    {index + 1}
                  </span>
                </div>
              </TableCell>
              <TableCell
                className={cn(
                  "w-32 py-2 whitespace-nowrap",
                  item.is_deleted && "line-through",
                )}
              >
                {item.pn}
              </TableCell>
              <TableCell
                className={cn(
                  "py-2 break-words min-w-0",
                  item.is_deleted && "line-through",
                )}
              >
                <span className="flex items-center gap-1.5">
                  {item.is_phantom && (
                    <span title="Phantom">
                      <Ghost
                        size={13}
                        className="shrink-0 text-muted-foreground"
                      />
                    </span>
                  )}
                  {item.description}
                </span>
                {item.is_custom && !item.is_deleted && (
                  <Badge
                    variant="outline"
                    className="ml-2 text-orange-500 border-orange-500 text-[10px] px-1 py-0"
                  >
                    WIP
                  </Badge>
                )}
              </TableCell>
              <TableCell
                className={cn(
                  "w-24 py-2 text-center",
                  item.is_deleted && "line-through",
                )}
              >
                {editingId === item.id ? (
                  <Input
                    type="number"
                    min={1}
                    value={editQty}
                    onChange={(e) => setEditQty(e.target.value)}
                    className="w-20 h-7 text-center mx-auto"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") saveEdit(item.id);
                      if (e.key === "Escape") cancelEdit();
                    }}
                    autoFocus
                  />
                ) : (
                  <span>
                    {item.qty}
                    {!item.is_deleted &&
                      item.original_qty !== null &&
                      item.qty !== item.original_qty && (
                        <span className="text-muted-foreground text-xs ml-1">
                          (era {item.original_qty})
                        </span>
                      )}
                  </span>
                )}
              </TableCell>
              {editable && (
                <TableCell className="text-center">
                  {item.is_deleted ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      disabled={isPending}
                      onClick={() => toggleDelete(item.id)}
                      title="Ripristina"
                    >
                      <Undo2 size={14} />
                    </Button>
                  ) : editingId === item.id ? (
                    <div className="flex items-center justify-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        disabled={isPending}
                        onClick={() => saveEdit(item.id)}
                        title="Conferma"
                      >
                        <Check size={14} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={cancelEdit}
                        title="Annulla"
                      >
                        <X size={14} />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        disabled={isPending}
                        onClick={() => startEdit(item)}
                        title="Modifica quantità"
                      >
                        <Pencil size={14} />
                      </Button>
                      {item.pn_type === "ASSY" && !item.is_deleted && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          disabled={isPending}
                          onClick={() => handleExportRow(item)}
                          title="Esporta sotto-assieme"
                        >
                          <FileDown size={14} />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive"
                        disabled={isPending}
                        onClick={() => toggleDelete(item.id)}
                        title="Elimina"
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  )}
                </TableCell>
              )}
            </TableRow>
            {item.pn_type === "ASSY" && expandedRowIds.has(item.id) && (
              <AssemblyChildrenRows
                parentPn={item.pn}
                depth={1}
                columnCount={editable ? 5 : 4}
              />
            )}
          </Fragment>
        ))}
      </TableBody>
    </Table>
  );
};

export default EngineeringBomTable;
