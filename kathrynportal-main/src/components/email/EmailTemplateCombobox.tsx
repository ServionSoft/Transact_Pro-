import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import type { EmailTemplate } from "@/types/domain";
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
import { cn } from "@/lib/utils";

type EmailTemplateComboboxProps = {
  value?: string;
  onValueChange: (templateId: string) => void;
  templates: EmailTemplate[];
  loading?: boolean;
  disabled?: boolean;
  placeholder?: string;
  id?: string;
  compact?: boolean;
  allowClear?: boolean;
  showCategory?: boolean;
};

function templateLabel(template: EmailTemplate, showCategory: boolean): string {
  return showCategory ? `${template.name} (${template.category})` : template.name;
}

export default function EmailTemplateCombobox({
  value,
  onValueChange,
  templates,
  loading = false,
  disabled = false,
  placeholder = "Choose a template…",
  id,
  compact = false,
  allowClear = false,
  showCategory = true,
}: EmailTemplateComboboxProps) {
  const [open, setOpen] = useState(false);
  const [listResetKey, setListResetKey] = useState(0);

  const selected = templates.find((t) => t.id === value);
  const isDisabled = disabled || loading;
  const triggerLabel = loading
    ? "Loading templates…"
    : templates.length === 0
      ? "No templates — add in Settings"
      : selected
        ? templateLabel(selected, showCategory)
        : placeholder;

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        if (isDisabled) return;
        setOpen(next);
        if (next) setListResetKey((k) => k + 1);
      }}
    >
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={isDisabled}
          className={cn(
            "w-full justify-between font-normal px-3",
            compact ? "h-9" : "h-10",
          )}
        >
          <span className={cn("truncate text-left", !selected && "text-muted-foreground")}>
            {triggerLabel}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="p-0 min-w-[280px] max-w-[95vw] w-[var(--radix-popover-trigger-width)]"
        align="start"
      >
        <Command key={listResetKey} shouldFilter>
          <CommandInput placeholder="Search templates by name, category, or subject…" />
          <CommandList className="max-h-[min(60vh,320px)]">
            <CommandEmpty>No matching templates.</CommandEmpty>
            <CommandGroup heading="Email templates">
              {allowClear ? (
                <CommandItem
                  value="__none__ no template clear"
                  className="justify-between"
                  onSelect={() => {
                    setOpen(false);
                    onValueChange("");
                  }}
                >
                  <span className="text-muted-foreground">No template</span>
                  {!value ? <Check className="h-4 w-4 shrink-0" /> : null}
                </CommandItem>
              ) : null}
              {templates.map((template) => (
                <CommandItem
                  key={template.id}
                  value={`${template.id} ${template.name} ${template.category} ${template.subject}`}
                  className="justify-between gap-2"
                  onSelect={() => {
                    setOpen(false);
                    onValueChange(template.id);
                  }}
                >
                  <span className="min-w-0 truncate">{templateLabel(template, showCategory)}</span>
                  {value === template.id ? <Check className="h-4 w-4 shrink-0" /> : null}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
