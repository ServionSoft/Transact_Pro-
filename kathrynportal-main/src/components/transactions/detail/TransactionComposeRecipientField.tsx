import { useEffect, useMemo, useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { TransactionRecipientSuggestion } from "@/lib/transactionRecipientSuggestions";
import { cn } from "@/lib/utils";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Props = {
  value: string;
  onChange: (value: string) => void;
  suggestions: TransactionRecipientSuggestion[];
  id?: string;
};

export default function TransactionComposeRecipientField({ value, onChange, suggestions, id = "compose-to" }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (open) setSearch(value.trim());
  }, [open, value]);

  const selectedSuggestion = useMemo(
    () => suggestions.find((s) => s.email.toLowerCase() === value.trim().toLowerCase()),
    [suggestions, value],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return suggestions;
    return suggestions.filter(
      (s) => s.label.toLowerCase().includes(q) || s.email.toLowerCase().includes(q),
    );
  }, [search, suggestions]);

  const trimmedSearch = search.trim();
  const canUseCustom =
    trimmedSearch.length > 0 &&
    EMAIL_RE.test(trimmedSearch) &&
    !suggestions.some((s) => s.email.toLowerCase() === trimmedSearch.toLowerCase());

  const triggerLabel = selectedSuggestion
    ? `${selectedSuggestion.label} · ${selectedSuggestion.email}`
    : value.trim() || "Choose recipient or type an address…";

  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-sm font-medium text-foreground">
        To
      </Label>
      <Popover
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) setSearch("");
        }}
      >
        <PopoverTrigger asChild>
          <Button
            type="button"
            id={id}
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="h-10 w-full justify-between font-normal"
          >
            <span className={cn("truncate text-left", value.trim() ? "text-foreground" : "text-muted-foreground")}>
              {triggerLabel}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[min(calc(100vw-2rem),420px)] min-w-[280px] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Search parties or type email…"
              value={search}
              onValueChange={setSearch}
            />
            <CommandList>
              <CommandEmpty>
                {canUseCustom ? "Press below to use the typed address." : "No matches. Type a valid email to use a custom address."}
              </CommandEmpty>
              {filtered.length > 0 ? (
                <CommandGroup heading="This transaction">
                  {filtered.map((row) => (
                    <CommandItem
                      key={row.email}
                      value={row.email}
                      onSelect={() => {
                        onChange(row.email);
                        setOpen(false);
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4 shrink-0",
                          value.toLowerCase() === row.email.toLowerCase() ? "opacity-100" : "opacity-0",
                        )}
                      />
                      <span className="min-w-0 truncate">
                        <span className="font-medium">{row.label}</span>
                        <span className="text-muted-foreground"> · {row.email}</span>
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              ) : null}
              {canUseCustom ? (
                <CommandGroup>
                  <CommandItem
                    value={`custom-${trimmedSearch}`}
                    onSelect={() => {
                      onChange(trimmedSearch);
                      setOpen(false);
                    }}
                  >
                    Use <span className="mx-1 font-medium">{trimmedSearch}</span>
                  </CommandItem>
                </CommandGroup>
              ) : null}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      <p className="text-[11px] text-muted-foreground">
        Contact, parties, escrow, and assigned team—or type any valid email in the search box.
      </p>
    </div>
  );
}
