/**
 * Contact "Type of Contact" values used in forms and stored on the contact record.
 * A contact's type is a broad category (what the person generally is); the deal-specific
 * role (Listing Agent vs Buyer's Agent, Buyer vs Seller) is captured per-transaction by
 * the party slot, not by this field.
 *
 * Keep in sync with party pickers (`defaultCreateRole` on `ContactLinkPicker`).
 */
export const CONTACT_ROLE_OPTIONS = [
  { value: "Agent", label: "Agent" },
  { value: "TC", label: "TC" },
  { value: "Escrow Officer", label: "Escrow Officer" },
  { value: "Buyer/Seller", label: "Buyer/Seller" },
  { value: "Agent Team Member/Assistant", label: "Agent Team Member/Assistant" },
  { value: "Lender", label: "Lender" },
  { value: "Other", label: "Other" },
] as const;

export const CONTACT_ROLE_VALUES: ReadonlySet<string> = new Set(
  CONTACT_ROLE_OPTIONS.map((o) => o.value)
);

export function isKnownContactRole(role: string): boolean {
  return CONTACT_ROLE_VALUES.has(role);
}

/**
 * Maps legacy contact role strings to the simplified "Type of Contact" set.
 * Used for display fallback and by the backend remap migration.
 */
export const LEGACY_CONTACT_ROLE_REMAP: Record<string, string> = {
  "Listing Agent": "Agent",
  "Buyer's Agent": "Agent",
  "Dual Agent": "Agent",
  Buyer: "Buyer/Seller",
  Seller: "Buyer/Seller",
  "Buyer/Seller": "Buyer/Seller",
  "Listing Agent's TC": "TC",
  "Buyer's Agent's TC": "TC",
  "Transaction Coordinator": "TC",
  "Escrow Officer": "Escrow Officer",
  "Escrow Assistant/Team Member": "Other",
  "Escrow Assistant": "Other",
  "Listing Agent's Assistant": "Agent Team Member/Assistant",
  "Buyer's Agent's Assistant/Team Member": "Agent Team Member/Assistant",
  "Listing Agent Team Member/Assistant": "Agent Team Member/Assistant",
  "Buyer's Agent Team Member/Assistant": "Agent Team Member/Assistant",
  Lender: "Lender",
  "Lender Assistant": "Lender",
  Assistant: "Other",
  Other: "Other",
};

/** Normalizes any stored/legacy role to a current "Type of Contact" value. */
export function normalizeContactRole(role: string): string {
  const trimmed = (role || "").trim();
  if (!trimmed) return "";
  if (CONTACT_ROLE_VALUES.has(trimmed)) return trimmed;
  return LEGACY_CONTACT_ROLE_REMAP[trimmed] ?? "Other";
}
