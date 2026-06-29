import { useCallback, useMemo, useRef, useState } from "react";
import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import { isValidEmailAddress, normalizeEmailAddress } from "@/lib/emailAddressList";
import type { TransactionRecipientSuggestion } from "@/lib/transactionRecipientSuggestions";
import { cn } from "@/lib/utils";

type Props = {
  label: string;
  emails: string[];
  onChange: (emails: string[]) => void;
  suggestions: TransactionRecipientSuggestion[];
  id?: string;
  placeholder?: string;
  className?: string;
  showHint?: boolean;
};

function labelForEmail(email: string, suggestions: TransactionRecipientSuggestion[]): string {
  const hit = suggestions.find((s) => s.email.toLowerCase() === email.toLowerCase());
  return hit ? hit.label : email;
}

function isInsideAnchor(target: EventTarget | null, anchor: HTMLElement | null): boolean {
  return Boolean(target instanceof Node && anchor?.contains(target));
}

export default function EmailRecipientChipsField({
  label,
  emails,
  onChange,
  suggestions,
  id,
  placeholder = "Add recipient or type email…",
  className,
  showHint = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const anchorRef = useRef<HTMLDivElement>(null);

  const emailSet = useMemo(() => new Set(emails.map((e) => e.toLowerCase())), [emails]);

  const trimmedInput = input.trim();

  const filtered = useMemo(() => {
    const q = trimmedInput.toLowerCase();
    return suggestions.filter((s) => {
      if (emailSet.has(s.email.toLowerCase())) return false;
      if (!q) return true;
      return s.label.toLowerCase().includes(q) || s.email.toLowerCase().includes(q);
    });
  }, [suggestions, trimmedInput, emailSet]);

  const canAddTypedEmail = useMemo(() => {
    const email = normalizeEmailAddress(trimmedInput);
    return Boolean(email && isValidEmailAddress(email) && !emailSet.has(email));
  }, [trimmedInput, emailSet]);

  const addEmail = useCallback(
    (raw: string) => {
      const email = normalizeEmailAddress(raw);
      if (!email || !isValidEmailAddress(email) || emailSet.has(email)) return;
      onChange([...emails, email]);
      setInput("");
      window.requestAnimationFrame(() => inputRef.current?.focus());
    },
    [emailSet, emails, onChange],
  );

  const commitTypedEmail = useCallback(() => {
    if (!canAddTypedEmail) return;
    addEmail(trimmedInput);
  }, [addEmail, canAddTypedEmail, trimmedInput]);

  const tryCommitInput = useCallback(() => {
    const parts = input.split(/[,;]+/).map((p) => p.trim()).filter(Boolean);
    if (parts.length === 0) return;
    const next = [...emails];
    const seen = new Set(next.map((e) => e.toLowerCase()));
    for (const part of parts) {
      const email = normalizeEmailAddress(part);
      if (!email || !isValidEmailAddress(email) || seen.has(email)) continue;
      seen.add(email);
      next.push(email);
    }
    onChange(next);
    setInput("");
  }, [emails, input, onChange]);

  const commitPendingInput = useCallback(() => {
    if (canAddTypedEmail) {
      commitTypedEmail();
    } else {
      tryCommitInput();
    }
  }, [canAddTypedEmail, commitTypedEmail, tryCommitInput]);

  const closeDropdown = useCallback(() => {
    commitPendingInput();
    setOpen(false);
  }, [commitPendingInput]);

  const keepOpenIfAnchorClick = useCallback((event: Event) => {
    if (isInsideAnchor(event.target, anchorRef.current)) {
      event.preventDefault();
    }
  }, []);

  const handleInputBlur = () => {
    window.setTimeout(() => {
      const active = document.activeElement;
      if (anchorRef.current?.contains(active)) return;
      if (active?.closest("[data-radix-popover-content]")) return;
      closeDropdown();
    }, 150);
  };

  const inputPlaceholder = emails.length === 0 ? placeholder : "Add more…";

  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
      </Label>
      <Popover open={open} onOpenChange={setOpen} modal={false}>
        <PopoverAnchor asChild>
          <div
            ref={anchorRef}
            className="flex min-h-10 flex-wrap items-center gap-1.5 rounded-md border border-input bg-background px-2 py-1.5 focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) {
                e.preventDefault();
                inputRef.current?.focus();
              }
            }}
          >
            {emails.map((email) => (
              <Badge key={email} variant="secondary" className="max-w-full gap-1 pr-1 font-normal">
                <span className="truncate text-xs" title={`${labelForEmail(email, suggestions)} · ${email}`}>
                  {labelForEmail(email, suggestions)}
                </span>
                <button
                  type="button"
                  className="rounded hover:bg-muted"
                  aria-label={`Remove ${email}`}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={(e) => {
                    e.stopPropagation();
                    onChange(emails.filter((x) => x !== email));
                    inputRef.current?.focus();
                  }}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
            <Input
              ref={inputRef}
              id={id}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                setOpen(true);
              }}
              onFocus={() => setOpen(true)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === "," || e.key === ";") {
                  e.preventDefault();
                  if (canAddTypedEmail) {
                    commitTypedEmail();
                  } else {
                    tryCommitInput();
                  }
                } else if (e.key === "Backspace" && !input && emails.length > 0) {
                  onChange(emails.slice(0, -1));
                } else if (e.key === "Escape") {
                  setInput("");
                  setOpen(false);
                }
              }}
              onBlur={handleInputBlur}
              placeholder={inputPlaceholder}
              className="h-7 min-w-[8rem] flex-1 border-0 bg-transparent px-1 shadow-none focus-visible:ring-0"
            />
          </div>
        </PopoverAnchor>
        <PopoverContent
          className="w-[min(calc(100vw-2rem),420px)] p-0"
          align="start"
          sideOffset={4}
          onOpenAutoFocus={(e) => e.preventDefault()}
          onCloseAutoFocus={(e) => e.preventDefault()}
          onPointerDownOutside={keepOpenIfAnchorClick}
          onInteractOutside={(e) => {
            keepOpenIfAnchorClick(e);
            if (!isInsideAnchor(e.target, anchorRef.current)) {
              closeDropdown();
            }
          }}
        >
          <Command shouldFilter={false}>
            <CommandList>
              <CommandEmpty>
                {canAddTypedEmail
                  ? "Press Enter to add this address."
                  : trimmedInput
                    ? "Finish typing a full email (name@domain.com)."
                    : "Type here or pick a contact below."}
              </CommandEmpty>
              {canAddTypedEmail ? (
                <CommandGroup heading="Add address">
                  <CommandItem
                    value={`custom-${trimmedInput}`}
                    onMouseDown={(e) => e.preventDefault()}
                    onSelect={commitTypedEmail}
                  >
                    Add <span className="mx-1 font-medium">{trimmedInput}</span>
                  </CommandItem>
                </CommandGroup>
              ) : null}
              {filtered.length > 0 ? (
                <CommandGroup heading="This transaction">
                  {filtered.map((row) => (
                    <CommandItem
                      key={row.email}
                      value={row.email}
                      onMouseDown={(e) => e.preventDefault()}
                      onSelect={() => addEmail(row.email)}
                    >
                      <span className="min-w-0 truncate">
                        <span className="font-medium">{row.label}</span>
                        <span className="text-muted-foreground"> · {row.email}</span>
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              ) : null}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {showHint ? (
        <p className="text-[11px] text-muted-foreground">
          Type an email address here, or pick a transaction contact from the list.
        </p>
      ) : null}
    </div>
  );
}
