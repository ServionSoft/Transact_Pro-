import { toast } from "sonner";
import type { ClientStatus } from "@/data/mockData";
import type { Client, ClientDetails } from "@/types/domain";
import { CONTACT_ROLE_OPTIONS, isKnownContactRole } from "@/constants/contactRoles";
import { AddressAutocompleteInput } from "@/components/shared/AddressAutocompleteInput";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

/** Max source image size accepted for an agent logo (stored inline as a base64 data URL). */
const MAX_LOGO_BYTES = 600 * 1024;

export type ClientFormValues = {
  name: string;
  firstName: string;
  lastName: string;
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
  // Type-specific fields (persisted in the contact's `details` JSONB).
  licenseNumber: string;
  brokerageLicense: string;
  logo: string;
  assistantFirstName: string;
  assistantLastName: string;
  assistantPreferredName: string;
  assistantEmail: string;
};

const roleKey = (role: string) => role.trim().toLowerCase();

/** Ensures the combined `name` matches first/last and trims name parts before save. */
export function normalizeClientForm(values: ClientFormValues): ClientFormValues {
  const firstName = values.firstName.trim();
  const lastName = values.lastName.trim();
  const name = [firstName, lastName].filter(Boolean).join(" ") || values.name.trim();
  const preferredName = values.preferredName.trim();
  return { ...values, firstName, lastName, name, preferredName };
}

/** Assembles the type-specific `details` object from flat form values, keyed by role. */
export function buildClientDetails(values: ClientFormValues): ClientDetails {
  const role = roleKey(values.role);
  const details: ClientDetails = {};
  if (role === "agent") {
    if (values.licenseNumber.trim()) details.licenseNumber = values.licenseNumber.trim();
    if (values.brokerageLicense.trim()) details.brokerageLicense = values.brokerageLicense.trim();
    if (values.logo.trim()) details.logo = values.logo.trim();
  }
  if (role === "escrow officer") {
    const assistant = {
      firstName: values.assistantFirstName.trim() || undefined,
      lastName: values.assistantLastName.trim() || undefined,
      preferredName: values.assistantPreferredName.trim() || undefined,
      email: values.assistantEmail.trim() || undefined,
    };
    if (assistant.firstName || assistant.lastName || assistant.preferredName || assistant.email) {
      details.assistant = assistant;
    }
  }
  return details;
}

/** Flattens a contact's `details` back into form fields for editing. */
export function detailsToFormValues(details: ClientDetails | undefined): Pick<
  ClientFormValues,
  | "licenseNumber"
  | "brokerageLicense"
  | "logo"
  | "assistantFirstName"
  | "assistantLastName"
  | "assistantPreferredName"
  | "assistantEmail"
> {
  const d = details ?? {};
  const a = d.assistant ?? {};
  return {
    licenseNumber: d.licenseNumber ?? "",
    brokerageLicense: d.brokerageLicense ?? "",
    logo: d.logo ?? "",
    assistantFirstName: a.firstName ?? "",
    assistantLastName: a.lastName ?? "",
    assistantPreferredName: a.preferredName ?? "",
    assistantEmail: a.email ?? "",
  };
}

/** Detail defaults for a blank form; spread into the initial `ClientFormValues`. */
export const emptyClientDetailFields = {
  licenseNumber: "",
  brokerageLicense: "",
  logo: "",
  assistantFirstName: "",
  assistantLastName: "",
  assistantPreferredName: "",
  assistantEmail: "",
} as const;

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
  isSubmitting,
  submitLabel,
  onChange,
  onSubmit,
  onCancel,
  formId,
  showFooterActions = true,
}: ClientFormProps) {
  const role = roleKey(values.role);
  const isAgent = role === "agent";
  const isEscrowOfficer = role === "escrow officer";
  const isLender = role === "lender";
  const isOther = role === "other" || !isKnownContactRole(values.role);

  // Field visibility by contact type (per the parties/contacts field spec).
  const showEmail = !isLender;
  const showPhone = !isLender;
  const showCompany = isAgent || isEscrowOfficer || isLender || isOther;
  const showAddress = isEscrowOfficer || isOther;

  const companyLabel = isAgent
    ? "Brokerage name"
    : isEscrowOfficer
    ? "Company name"
    : "Company";
  const notesLabel = isAgent ? "Agent notes" : "Notes";
  const addressHeading = isEscrowOfficer ? "Company Address" : "Primary Address";

  const combineName = (first: string, last: string) => [first.trim(), last.trim()].filter(Boolean).join(" ");
  const handleFirstName = (value: string) => {
    onChange("firstName", value);
    onChange("name", combineName(value, values.lastName));
  };
  const handleLastName = (value: string) => {
    onChange("lastName", value);
    onChange("name", combineName(values.firstName, value));
  };

  const handleLogoFile = (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file for the logo.");
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      toast.error("Logo image is too large. Please use an image under 600 KB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => onChange("logo", String(reader.result));
    reader.onerror = () => toast.error("Could not read that image. Please try another file.");
    reader.readAsDataURL(file);
  };

  return (
    <form id={formId} onSubmit={onSubmit} className="bg-card border border-border rounded-lg p-6 space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="firstName">First Name *</Label>
          <Input
            id="firstName"
            value={values.firstName}
            onChange={(e) => handleFirstName(e.target.value)}
            placeholder="e.g. Sarah"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="lastName">Last Name *</Label>
          <Input
            id="lastName"
            value={values.lastName}
            onChange={(e) => handleLastName(e.target.value)}
            placeholder="e.g. Mitchell"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="preferredName">Preferred name *</Label>
          <Input
            id="preferredName"
            value={values.preferredName}
            onChange={(e) => onChange("preferredName", e.target.value)}
            placeholder="Name used in email greetings"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="role">Type of Contact</Label>
          <Select value={values.role} onValueChange={(v) => onChange("role", v)}>
            <SelectTrigger id="role">
              <SelectValue placeholder="Select type of contact" />
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
        {showEmail ? (
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
        ) : null}
        {showPhone ? (
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              value={values.phone}
              onChange={(e) => onChange("phone", e.target.value)}
              placeholder="(310) 555-0142"
            />
          </div>
        ) : null}
        {showCompany ? (
          <div className="space-y-2">
            <Label htmlFor="company">{companyLabel}</Label>
            <Input
              id="company"
              value={values.company}
              onChange={(e) => onChange("company", e.target.value)}
              placeholder="Pacific Coast Realty"
            />
          </div>
        ) : null}
        {isAgent ? (
          <>
            <div className="space-y-2">
              <Label htmlFor="licenseNumber">License number</Label>
              <Input
                id="licenseNumber"
                value={values.licenseNumber}
                onChange={(e) => onChange("licenseNumber", e.target.value)}
                placeholder="DRE #01234567"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="brokerageLicense">Brokerage license number</Label>
              <Input
                id="brokerageLicense"
                value={values.brokerageLicense}
                onChange={(e) => onChange("brokerageLicense", e.target.value)}
                placeholder="DRE #01987654"
              />
            </div>
          </>
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

      {isAgent ? (
        <div className="border-t border-border pt-6">
          <h3 className="font-display font-semibold text-foreground mb-2">Agent logo</h3>
          <p className="text-xs text-muted-foreground mb-4">
            Optional. Shown on the agent's contact profile. Use a square image under 600 KB.
          </p>
          <div className="flex items-center gap-4">
            {values.logo ? (
              <img
                src={values.logo}
                alt="Agent logo preview"
                className="h-16 w-16 rounded-md border border-border object-contain bg-muted"
              />
            ) : (
              <div className="h-16 w-16 rounded-md border border-dashed border-border flex items-center justify-center text-xs text-muted-foreground">
                No logo
              </div>
            )}
            <div className="flex items-center gap-2">
              <Input
                id="logo"
                type="file"
                accept="image/*"
                className="max-w-xs"
                onChange={(e) => {
                  handleLogoFile(e.target.files?.[0] ?? null);
                  e.target.value = "";
                }}
              />
              {values.logo ? (
                <Button type="button" variant="outline" size="sm" onClick={() => onChange("logo", "")}>
                  Remove
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {isEscrowOfficer ? (
        <div className="border-t border-border pt-6">
          <h3 className="font-display font-semibold text-foreground mb-2">Escrow assistant</h3>
          <p className="text-xs text-muted-foreground mb-4">
            Optional. Stored on this officer's record and used to auto-fill the assistant on transactions.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="assistantFirstName">Assistant first name</Label>
              <Input
                id="assistantFirstName"
                value={values.assistantFirstName}
                onChange={(e) => onChange("assistantFirstName", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="assistantLastName">Assistant last name</Label>
              <Input
                id="assistantLastName"
                value={values.assistantLastName}
                onChange={(e) => onChange("assistantLastName", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="assistantPreferredName">Assistant preferred name</Label>
              <Input
                id="assistantPreferredName"
                value={values.assistantPreferredName}
                onChange={(e) => onChange("assistantPreferredName", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="assistantEmail">Assistant email</Label>
              <Input
                id="assistantEmail"
                type="email"
                value={values.assistantEmail}
                onChange={(e) => onChange("assistantEmail", e.target.value)}
              />
            </div>
          </div>
        </div>
      ) : null}

      {showAddress ? (
        <div className="border-t border-border pt-6">
          <h3 className="font-display font-semibold text-foreground mb-2">{addressHeading}</h3>
          {!isEscrowOfficer ? (
            <p className="text-xs text-muted-foreground mb-4">
              Used as this contact's primary address. Listing property addresses belong on the transaction record.
            </p>
          ) : null}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="propertyAddress">Address</Label>
              <AddressAutocompleteInput
                id="propertyAddress"
                value={values.propertyAddress}
                onChange={(street) => onChange("propertyAddress", street)}
                onPlaceSelected={(parsed) => {
                  if (parsed.street) onChange("propertyAddress", parsed.street);
                  if (parsed.city) onChange("city", parsed.city);
                  if (parsed.state) onChange("state", parsed.state);
                  if (parsed.zip) onChange("zip", parsed.zip);
                }}
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
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="notes">{notesLabel}</Label>
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
