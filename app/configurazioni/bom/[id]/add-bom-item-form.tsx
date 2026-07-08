"use client";

import { Pencil, Plus } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { addEngineeringBomItemAction } from "@/app/actions/engineering-bom-actions";
import PartNumberCombobox from "@/components/shared/part-number-combobox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { PartNumber } from "@/db/schemas";
import { MSG } from "@/lib/messages";
import { type BomLineCategory, type BomTag, BomTagLabels } from "@/types";

interface AddBomItemFormProps {
  confId: number;
  category: BomLineCategory;
  categoryIndex: number;
  tag?: BomTag;
  availableTags?: BomTag[];
}

const AddBomItemForm = ({
  confId,
  category,
  categoryIndex,
  tag: fixedTag,
  availableTags,
}: AddBomItemFormProps) => {
  const [mode, setMode] = useState<"catalog" | "custom">("catalog");
  const [selectedPn, setSelectedPn] = useState<PartNumber | null>(null);
  const [qty, setQty] = useState("1");
  const [isPending, startTransition] = useTransition();

  // Tag selector (only used when availableTags is provided)
  const [selectedTag, setSelectedTag] = useState<BomTag | undefined>(
    fixedTag ?? availableTags?.[0],
  );

  // Custom mode fields
  const [customPn, setCustomPn] = useState("");
  const [customDescription, setCustomDescription] = useState("");

  function handleAdd() {
    const parsedQty = parseInt(qty, 10);
    if (!Number.isInteger(parsedQty) || parsedQty < 1) {
      toast.error(MSG.toast.qtyInvalid);
      return;
    }

    if (mode === "catalog") {
      if (!selectedPn) {
        toast.error(MSG.toast.pnRequired);
        return;
      }
      startTransition(async () => {
        try {
          await addEngineeringBomItemAction(confId, {
            pn: selectedPn.pn,
            qty: parsedQty,
            description: selectedPn.description,
            category,
            category_index: categoryIndex,
            is_custom: false,
            tag: selectedTag,
          });
          setSelectedPn(null);
          setQty("1");
          toast.success(MSG.toast.rowAdded);
        } catch (err) {
          toast.error(err instanceof Error ? err.message : MSG.toast.addError);
        }
      });
    } else {
      if (!customPn.trim()) {
        toast.error(MSG.toast.pnMandatory);
        return;
      }
      startTransition(async () => {
        try {
          await addEngineeringBomItemAction(confId, {
            pn: customPn.trim(),
            qty: parsedQty,
            description: customDescription.trim(),
            category,
            category_index: categoryIndex,
            is_custom: true,
            tag: selectedTag,
          });
          setCustomPn("");
          setCustomDescription("");
          setQty("1");
          toast.success(MSG.toast.customRowAdded);
        } catch (err) {
          toast.error(err instanceof Error ? err.message : MSG.toast.addError);
        }
      });
    }
  }

  const canAdd = mode === "catalog" ? !!selectedPn : customPn.trim().length > 0;

  return (
    <div className="space-y-2 px-2 py-3">
      <div className="flex flex-wrap items-center gap-2">
        {mode === "catalog" ? (
          <PartNumberCombobox
            selectedPn={selectedPn}
            onSelect={setSelectedPn}
            triggerClassName="sm:w-[400px]"
          />
        ) : (
          <>
            <Input
              value={customPn}
              onChange={(e) => setCustomPn(e.target.value)}
              className="w-full sm:w-[160px] font-mono text-sm"
              placeholder="Codice"
              maxLength={25}
            />
            <Input
              value={customDescription}
              onChange={(e) => setCustomDescription(e.target.value)}
              className="w-full sm:w-[240px] text-sm"
              placeholder="Descrizione"
              maxLength={255}
            />
          </>
        )}

        <Input
          type="number"
          min={1}
          value={qty}
          onChange={(e) => setQty(e.target.value)}
          className="w-20 text-center"
          placeholder="Qtà"
        />

        {availableTags && (
          <Select
            value={selectedTag}
            onValueChange={(v) => setSelectedTag(v as BomTag)}
          >
            <SelectTrigger className="w-full sm:w-[200px] text-sm">
              <SelectValue placeholder="Gruppo..." />
            </SelectTrigger>
            <SelectContent>
              {availableTags.map((t) => (
                <SelectItem key={t} value={t}>
                  {BomTagLabels[t]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Button
          variant="outline"
          size="sm"
          onClick={handleAdd}
          disabled={isPending || !canAdd}
        >
          <Plus size={16} />
          <span>Aggiungi</span>
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setMode(mode === "catalog" ? "custom" : "catalog");
            setSelectedPn(null);
            setCustomPn("");
            setCustomDescription("");
          }}
          title={
            mode === "catalog" ? "Inserimento manuale" : "Cerca da catalogo"
          }
        >
          <Pencil size={14} />
          <span className="text-xs">
            {mode === "catalog" ? "Manuale" : "Catalogo"}
          </span>
        </Button>
      </div>
    </div>
  );
};

export default AddBomItemForm;
