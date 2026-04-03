"use client";

import {
  addEngineeringBomItemAction,
  searchPartNumbersAction,
} from "@/app/actions/engineering-bom-actions";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { PartNumber } from "@/db/schemas";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronsUpDown, Pencil, Plus } from "lucide-react";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { MSG } from "@/lib/messages";
import { type BomTag, BomTagLabels } from "@/types";
import { toast } from "sonner";

interface AddBomItemFormProps {
  confId: number;
  category: "GENERAL" | "WATER_TANK" | "WASH_BAY";
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
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<PartNumber[]>([]);
  const [selectedPn, setSelectedPn] = useState<PartNumber | null>(null);
  const [qty, setQty] = useState("1");
  const [isPending, startTransition] = useTransition();
  const [isSearching, setIsSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

  // Tag selector (only used when availableTags is provided)
  const [selectedTag, setSelectedTag] = useState<BomTag | undefined>(
    fixedTag ?? availableTags?.[0],
  );

  // Custom mode fields
  const [customPn, setCustomPn] = useState("");
  const [customDescription, setCustomDescription] = useState("");

  const doSearch = useCallback(async (query: string) => {
    if (query.trim().length === 0) {
      setResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const result = await searchPartNumbersAction(query);
      setResults(result.success ? result.data : []);
    } catch {
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(searchQuery), 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchQuery, doSearch]);

  function handleSelect(pn: PartNumber) {
    setSelectedPn(pn);
    setOpen(false);
    setSearchQuery("");
  }

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
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={open}
                className="min-w-0 w-full sm:w-[400px] justify-between font-mono text-sm"
              >
                <span className="truncate">
                  {selectedPn
                    ? `${selectedPn.pn} — ${selectedPn.description}`
                    : "Cerca codice articolo..."}
                </span>
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent
              className="w-[var(--radix-popover-trigger-width)] p-0"
              align="start"
            >
              <Command shouldFilter={false}>
                <CommandInput
                  placeholder="Cerca per codice o descrizione (usa % come jolly)..."
                  value={searchQuery}
                  onValueChange={setSearchQuery}
                />
                <CommandList>
                  {isSearching ? (
                    <div className="py-4 text-center text-sm text-muted-foreground">
                      Ricerca...
                    </div>
                  ) : results.length === 0 && searchQuery.trim().length > 0 ? (
                    <CommandEmpty>Nessun risultato.</CommandEmpty>
                  ) : (
                    <CommandGroup>
                      {results.map((pn) => (
                        <CommandItem
                          key={pn.id}
                          value={pn.pn}
                          onSelect={() => handleSelect(pn)}
                          className="font-mono text-xs"
                          title={`${pn.pn} — ${pn.description}`}
                        >
                          <span className="font-semibold mr-2">{pn.pn}</span>
                          <span className="text-muted-foreground truncate">
                            {pn.description}
                          </span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  )}
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
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
