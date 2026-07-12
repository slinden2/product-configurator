"use client";

import { ChevronsUpDown } from "lucide-react";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { searchPartNumbersAction } from "@/app/actions/engineering-bom-actions";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { PartNumber } from "@/db/schemas";
import { MSG } from "@/lib/messages";
import { cn } from "@/lib/utils";

const SEARCH_DEBOUNCE_MS = 300;

interface PartNumberComboboxProps {
  selectedPn: PartNumber | null;
  onSelect: (pn: PartNumber) => void;
  id?: string;
  triggerClassName?: string;
}

export default function PartNumberCombobox({
  selectedPn,
  onSelect,
  id,
  triggerClassName,
}: PartNumberComboboxProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<PartNumber[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [isSearching, startSearchTransition] = useTransition();
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);
  // Monotonic counter so a slow response for an old query can't overwrite
  // the results of a newer one.
  const searchSeqRef = useRef(0);

  const doSearch = useCallback((query: string) => {
    const seq = ++searchSeqRef.current;
    if (query.trim().length === 0) {
      setResults([]);
      setSearchError(null);
      return;
    }
    startSearchTransition(async () => {
      try {
        const result = await searchPartNumbersAction(query);
        if (seq !== searchSeqRef.current) return;
        if (result.success) {
          setResults(result.data);
          setSearchError(null);
        } else {
          console.error("Part number search failed:", result.error);
          setResults([]);
          setSearchError(result.error);
        }
      } catch (err) {
        if (seq !== searchSeqRef.current) return;
        console.error("Part number search failed:", err);
        setResults([]);
        setSearchError(MSG.toast.pnSearchError);
      }
    });
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(
      () => doSearch(searchQuery),
      SEARCH_DEBOUNCE_MS,
    );
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchQuery, doSearch]);

  function handleSelect(pn: PartNumber) {
    onSelect(pn);
    setOpen(false);
    setSearchQuery("");
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "min-w-0 w-full justify-between font-mono text-sm",
            triggerClassName,
          )}
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
            ) : searchError ? (
              <div className="py-4 text-center text-sm text-destructive">
                {searchError}
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
  );
}
