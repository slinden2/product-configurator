"use client";

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
import { EngineeringBomItem } from "@/db/schemas";
import { cn } from "@/lib/utils";
import { ArrowDownUp, Check, Pencil, Trash2, Undo2, X } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { MSG } from "@/lib/messages";
import { toast } from "sonner";

interface EngineeringBomTableProps {
  items: EngineeringBomItem[];
  confId: number;
  editable: boolean;
}

interface SortState {
  key: "pn" | "description" | null;
  direction: "asc" | "desc";
}

const EngineeringBomTable = ({
  items,
  confId,
  editable,
}: EngineeringBomTableProps) => {
  const sortByPn = (arr: EngineeringBomItem[]) =>
    [...arr].sort((a, b) => a.pn.localeCompare(b.pn));
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
  const [isPending, startTransition] = useTransition();

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

  function startEdit(item: EngineeringBomItem) {
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
            item.id === itemId ? { ...item, qty: newQty } : item
          )
        );
        setEditingId(null);
        toast.success(MSG.toast.qtyUpdated);
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : MSG.toast.updateError
        );
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
              : item
          )
        );
        toast.success(wasDeleted ? MSG.toast.rowRestored : MSG.toast.rowDeleted);
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : MSG.toast.operationError
        );
      }
    });
  }

  function getRowClassName(item: EngineeringBomItem): string {
    if (item.is_deleted) return "opacity-50 bg-muted/30";
    if (item.is_custom) return "bg-orange-500/10";
    if (item.is_added) return "bg-green-500/10";
    if (
      item.original_qty !== null &&
      item.qty !== item.original_qty
    )
      return "bg-yellow-500/10";
    return "";
  }

  return (
    <Table className="mb-3 rounded-lg font-mono">
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className="w-16">POS</TableHead>
          <TableHead
            className="table-cell w-32 py-2 cursor-pointer"
            onClick={() => sortTable("pn")}
          >
            <span className="flex items-center">
              Codice <ArrowDownUp size={16} className="ml-1" />
            </span>
          </TableHead>
          <TableHead
            className="table-cell flex-1 py-2 cursor-pointer"
            onClick={() => sortTable("description")}
          >
            <span className="flex items-center">
              Descrizione <ArrowDownUp size={16} className="ml-1" />
            </span>
          </TableHead>
          <TableHead className="table-cell w-24 py-2 text-center">
            Qtà
          </TableHead>
          {editable && (
            <TableHead className="w-24 py-2 text-center">Azioni</TableHead>
          )}
        </TableRow>
      </TableHeader>
      <TableBody className="text-sm">
        {dataArr.map((item, index) => (
          <TableRow key={item.id} className={cn(getRowClassName(item))}>
            <TableCell>{index + 1}</TableCell>
            <TableCell
              className={cn(
                "table-cell w-24 py-2",
                item.is_deleted && "line-through"
              )}
            >
              {item.pn}
            </TableCell>
            <TableCell
              className={cn(
                "table-cell flex-1 py-2",
                item.is_deleted && "line-through"
              )}
            >
              {item.description}
              {item.is_custom && !item.is_deleted && (
                <Badge variant="outline" className="ml-2 text-orange-500 border-orange-500 text-[10px] px-1 py-0">
                  WIP
                </Badge>
              )}
            </TableCell>
            <TableCell
              className={cn(
                "table-cell w-24 py-2 text-center",
                item.is_deleted && "line-through"
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
        ))}
      </TableBody>
    </Table>
  );
};

export default EngineeringBomTable;
