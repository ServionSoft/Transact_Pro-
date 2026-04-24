import { useEffect, useMemo, useState } from "react";
import { ChevronsUpDown, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { FileAttachment } from "@/data/mockData";

export type DocumentSlotChange = { name: string; storedFileId?: string };

type DocumentNameSlotComboboxProps = {
  files: FileAttachment[];
  value: string;
  onChange: (next: DocumentSlotChange) => void;
  /** CRM `stored_files` ids already chosen on other rows (same rule); those files are hidden from the library list. */
  excludeStoredFileIds?: string[];
  placeholder?: string;
  disabled?: boolean;
};

/**
 * Search CRM uploads or type a custom name; selection fills the same logical field as the trigger.
 */
export default function DocumentNameSlotCombobox({
  files,
  value,
  onChange,
  excludeStoredFileIds = [],
  placeholder = "Search library or type a name…",
  disabled,
}: DocumentNameSlotComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (open) setSearch(value);
  }, [open, value]);

  const excluded = useMemo(() => new Set(excludeStoredFileIds.filter(Boolean)), [excludeStoredFileIds]);

  const pickableFiles = useMemo(() => files.filter((f) => !excluded.has(f.id)), [files, excluded]);

  const filteredFiles = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return pickableFiles;
    return pickableFiles.filter((f) => f.name.toLowerCase().includes(q) || f.id.includes(q));
  }, [pickableFiles, search]);

  const showUseTyped =
    search.trim().length > 0 &&
    !pickableFiles.some((f) => f.name.toLowerCase() === search.trim().toLowerCase());

  const searchMatchesExcludedOnly =
    search.trim().length > 0 &&
    pickableFiles.every((f) => !f.name.toLowerCase().includes(search.trim().toLowerCase()) && !f.id.includes(search.trim())) &&
    files.some(
      (f) =>
        excluded.has(f.id) &&
        (f.name.toLowerCase().includes(search.trim().toLowerCase()) || f.id.includes(search.trim())),
    );

  return (
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
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="h-9 w-full justify-between font-normal px-3"
          disabled={disabled}
        >
          <span className={`truncate text-left ${value ? "text-foreground" : "text-muted-foreground"}`}>
            {value || placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[min(calc(100vw-2rem),420px)] min-w-[260px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Type to filter files or enter a custom name…"
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>
              {searchMatchesExcludedOnly
                ? "That file is already used on another row in this rule. Remove it there or pick a different file."
                : "No library files match. Use the option below to add this text."}
            </CommandEmpty>
            {filteredFiles.length > 0 && (
              <CommandGroup heading="CRM library">
                {filteredFiles.map((file) => (
                  <CommandItem
                    key={file.id}
                    value={`lib-${file.id}`}
                    keywords={[file.name, file.id]}
                    onSelect={() => {
                      onChange({ name: file.name, storedFileId: file.id });
                      setOpen(false);
                    }}
                  >
                    <FileText className="mr-2 h-4 w-4 shrink-0 opacity-70" />
                    <span className="truncate">{file.name}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {showUseTyped && (
              <CommandGroup heading="Custom">
                <CommandItem
                  value={`__custom__${search}`}
                  onSelect={() => {
                    onChange({ name: search.trim(), storedFileId: undefined });
                    setOpen(false);
                  }}
                >
                  Use &quot;{search.trim()}&quot; as document name
                </CommandItem>
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
