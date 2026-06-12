import type { ClientStatus } from "@/data/mockData";
import type { Client } from "@/types/domain";
import { CONTACT_ROLE_OPTIONS, isKnownContactRole } from "@/constants/contactRoles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type ClientFormValues = {
  name: string;
  preferredName: string;
  email: string;
  phone: string;
  company: string;
  role: string;
  status: ClientStatus;
  propertyAddress: string;
  city: string;
  state: string;
  zip: string;
  notes: string;
  assistantContactId: string;
};

type ClientFormProps = {
  values: ClientFormValues;
  contactOptions?: Client[];
  excludeContactId?: string;
  isSubmitting?: boolean;
  submitLabel: string;
  onChange: <K extends keyof ClientFormValues>(field: K, value: ClientFormValues[K]) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  /** When set, enables submit button outside the form via the `form` attribute. */
  formId?: string;
  /** Hide built-in Cancel / Save row (e.g. dialog provides its own footer). Default true. */
  showFooterActions?: boolean;
};

export default function ClientForm({
  values,
  contactOptions = [],
  excludeContactId,
  isSubmitting,
  submitLabel,
  onChange,
  onSubmit,
  onCancel,
  formId,
  showFooterActions = true,
}: ClientFormProps) {
  const isEscrowOfficer = values.role.trim().toLowerCase() === "escrow officer";
  const assistantOptions = contactOptions.filter((c) => {
    if (excludeContactId && c.id === excludeContactId) return false;
    const role = c.role.toLowerCase();
    if (!role.includes("escrow assistant")) return false;
    const company = values.company.trim().toLowerCase();
    if (company && c.company.trim().toLowerCase() !== company) return false;
    return true;
  });

  return (
    <form id={formId} onSubmit={onSubmit} className="bg-card border border-border rounded-lg p-6 space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Full Name *</Label>
          <Input
            id="name"
            value={values.name}
            onChange={(e) => onChange("name", e.target.value)}
            placeholder="e.g. Sarah Mitchell"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="preferredName">Preferred name</Label>
          <Input
            id="preferredName"
            value={values.preferredName}
            onChange={(e) => onChange("preferredName", e.target.value)}
            placeholder="What Kathryn uses day-to-day (optional)"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email *</Label>
          <Input
            id="email"
            type="email"
            value={values.email}
            onChange={(e) => onChange("email", e.target.value)}
            placeholder="sarah@realty.com"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            value={values.phone}
            onChange={(e) => onChange("phone", e.target.value)}
            placeholder="(310) 555-0142"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="company">Company</Label>
          <Input
            id="company"
            value={values.company}
            onChange={(e) => onChange("company", e.target.value)}
            placeholder="Pacific Coast Realty"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="role">Role</Label>
          <Select value={values.role} onValueChange={(v) => onChange("role", v)}>
            <SelectTrigger id="role">
              <SelectValue placeholder="Select role" />
            </SelectTrigger>
            <SelectContent>
              {values.role.trim() && !isKnownContactRole(values.role) ? (
                <SelectItem value={values.role}>{values.role}</SelectItem>
              ) : null}
              {CONTACT_ROLE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {isEscrowOfficer ? (
          <div className="md:col-span-2 space-y-2">
            <Label htmlFor="assistantContactId">Default escrow assistant</Label>
            <Select
              value={values.assistantContactId || "__none__"}
              onValueChange={(v) => onChange("assistantContactId", v === "__none__" ? "" : v)}
            >
              <SelectTrigger id="assistantContactId">
                <SelectValue placeholder="Select assistant (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">None</SelectItem>
                {assistantOptions.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {(c.preferredName?.trim() || c.name) + (c.email ? ` · ${c.email}` : "")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Auto-fills Escrow Assistant on transactions when this officer is linked. Filtered by Escrow Assistant role
              {values.company.trim() ? ` and company (${values.company.trim()})` : ""}.
            </p>
          </div>
        ) : null}
        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <Select value={values.status} onValueChange={(v) => onChange("status", v as ClientStatus)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Active">Active</SelectItem>
              <SelectItem value="Inactive">Inactive</SelectItem>
              <SelectItem value="Prospect">Prospect</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="border-t border-border pt-6">
        <h3 className="font-display font-semibold text-foreground mb-2">Primary Address</h3>
        <p className="text-xs text-muted-foreground mb-4">
          Used as this contact's primary address. Listing property addresses belong on the transaction record.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2 space-y-2">
            <Label htmlFor="propertyAddress">Address</Label>
            <Input
              id="propertyAddress"
              value={values.propertyAddress}
              onChange={(e) => onChange("propertyAddress", e.target.value)}
              placeholder="1247 Ocean View Dr"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="city">City</Label>
            <Input id="city" value={values.city} onChange={(e) => onChange("city", e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="state">State</Label>
              <Input id="state" value={values.state} onChange={(e) => onChange("state", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="zip">ZIP</Label>
              <Input id="zip" value={values.zip} onChange={(e) => onChange("zip", e.target.value)} />
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          value={values.notes}
          onChange={(e) => onChange("notes", e.target.value)}
          placeholder="Any notes about this contact..."
          rows={4}
        />
      </div>

      {showFooterActions ? (
        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={Boolean(isSubmitting)}>
            {isSubmitting ? "Saving..." : submitLabel}
          </Button>
        </div>
      ) : null}
    </form>
  );
}
