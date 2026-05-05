import { useEffect, useState } from "react";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { Client } from "@/data/mockData";
import ClientForm, { type ClientFormValues } from "@/components/clients/ClientForm";
import { createClientApi, type ClientUpsertBody } from "@/api/clients";
import { getApiBaseUrl } from "@/lib/apiConfig";
import { useAppStore } from "@/store/appStore";
import { useAuthStore } from "@/store/authStore";
import { hasPermission } from "@/lib/permissions";
import { toast } from "sonner";

function displayContactLabel(c: Client): string {
  const primary = (c.preferredName && c.preferredName.trim()) || c.name;
  return `${primary} — ${c.company || "—"}`;
}

function emptyCreateForm(defaultRole: string): ClientFormValues {
  return {
    name: "",
    preferredName: "",
    email: "",
    phone: "",
    company: "",
    role: defaultRole,
    status: "Active",
    propertyAddress: "",
    city: "",
    state: "CA",
    zip: "",
    notes: "",
};
}

export type ContactLinkPickerProps = {
  value: string;
  options: Client[];
  onValueChange: (id: string) => void;
  variant: "primary" | "party";
  /** Default Role select when creating from this picker (e.g. "Buyer's Agent"). */
  defaultCreateRole: string;
  /** Party variant: button placeholder when nothing selected. */
  partyPlaceholder?: string;
};

export function ContactLinkPicker({
  value,
  options,
  onValueChange,
  variant,
  defaultCreateRole,
  partyPlaceholder,
}: ContactLinkPickerProps) {
  const [open, setOpen] = useState(false);
  const [listResetKey, setListResetKey] = useState(0);
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<ClientFormValues>(() => emptyCreateForm(defaultCreateRole));
  const [saving, setSaving] = useState(false);

  const user = useAuthStore((s) => s.user);
  const upsertClient = useAppStore((s) => s.upsertClient);
  const addClient = useAppStore((s) => s.addClient);

  const apiOn = Boolean(getApiBaseUrl());
  const canCreate = !apiOn || hasPermission(user, "clients.create");

  const selected = options.find((c) => c.id === value);
  const emptyLabel =
    variant === "primary" ? "Search or select a contact…" : partyPlaceholder ?? "Link saved contact…";
  const label = selected ? displayContactLabel(selected) : emptyLabel;

  useEffect(() => {
    if (createOpen) {
      setCreateForm(emptyCreateForm(defaultCreateRole));
    }
  }, [createOpen, defaultCreateRole]);

  const openCreate = () => {
    if (!canCreate) {
      toast.error("You do not have permission to create contacts.");
      return;
    }
    setOpen(false);
    setCreateOpen(true);
  };

  const submitNewContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.name.trim() || !createForm.email.trim()) {
      toast.error("Name and email are required.");
      return;
    }
    setSaving(true);
    try {
      const body: ClientUpsertBody = { ...createForm };
      let created: Client;
      if (apiOn) {
        created = await createClientApi(body);
        upsertClient(created);
      } else {
        created = addClient(body);
      }
      toast.success("Contact saved.", { description: displayContactLabel(created) });
      setCreateOpen(false);
      onValueChange(created.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create contact.");
    } finally {
      setSaving(false);
    }
  };

  const clearLabel = variant === "primary" ? "No primary contact" : "Not linked";

  return (
    <>
      <Popover
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (next) setListResetKey((k) => k + 1);
        }}
      >
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between font-normal h-10 px-3"
          >
            <span className={cn("truncate text-left", !selected && "text-muted-foreground")}>{label}</span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="p-0 min-w-[280px] max-w-[95vw] w-[var(--radix-popover-trigger-width)]"
          align="start"
        >
          <Command key={listResetKey} shouldFilter>
            <CommandInput placeholder="Search by name, preferred name, email, company…" />
            <CommandList>
              <CommandEmpty>No matching contacts.</CommandEmpty>
              <CommandGroup heading="Contacts">
                <CommandItem
                  value="__none__ none clear unassigned"
                  className="justify-between"
                  onSelect={() => {
                    setOpen(false);
                    onValueChange("");
                  }}
                >
                  <span className="text-muted-foreground">{clearLabel}</span>
                  {!value ? <Check className="h-4 w-4 shrink-0" /> : null}
                </CommandItem>
                {options.map((c) => (
                  <CommandItem
                    key={c.id}
                    value={`${c.id} ${c.name} ${c.preferredName ?? ""} ${c.email} ${c.company} ${c.phone}`}
                    className="justify-between"
                    onSelect={() => {
                      setOpen(false);
                      onValueChange(c.id);
                    }}
                  >
                    <span className="truncate">{displayContactLabel(c)}</span>
                    {value === c.id ? <Check className="h-4 w-4 shrink-0" /> : null}
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandSeparator />
              <CommandGroup>
                <CommandItem
                  value="add new contact create"
                  disabled={!canCreate}
                  onSelect={() => {
                    openCreate();
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add new contact…
                </CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New contact</DialogTitle>
            <DialogDescription>
              {variant === "primary"
                ? "Creates a contact record and selects it as the primary contact for this transaction."
                : "Creates a contact record and links it to this party. Duplicate emails use the existing contact."}
            </DialogDescription>
          </DialogHeader>
          <ClientForm
            formId="contact-link-create-form"
            showFooterActions={false}
            values={createForm}
            isSubmitting={saving}
            submitLabel=""
            onChange={(field, v) => setCreateForm((prev) => ({ ...prev, [field]: v }))}
            onSubmit={(e) => void submitNewContact(e)}
            onCancel={() => setCreateOpen(false)}
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setCreateOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" form="contact-link-create-form" disabled={saving}>
              {saving ? "Saving…" : "Save & select"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
