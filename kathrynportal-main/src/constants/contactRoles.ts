/**
 * Contact `role` values used in forms and stored on the contact record.
 * Keep in sync with party pickers (`defaultCreateRole` on `ContactLinkPicker`).
 */
export const CONTACT_ROLE_OPTIONS = [
  { value: "Listing Agent", label: "Listing Agent" },
  { value: "Buyer's Agent", label: "Buyer's Agent" },
  { value: "Dual Agent", label: "Dual Agent" },
  { value: "Listing Agent's TC", label: "Listing Agent's TC" },
  { value: "Buyer's Agent's TC", label: "Buyer's Agent's TC" },
  { value: "Listing Agent's Assistant", label: "Listing Agent's Assistant" },
  { value: "Buyer's Agent's Assistant/Team Member", label: "Buyer's Agent's Assistant/Team Member" },
  { value: "Escrow Officer", label: "Escrow Officer" },
  { value: "Escrow Assistant/Team Member", label: "Escrow Assistant/Team Member" },
  { value: "Lender", label: "Lender" },
  { value: "Lender Assistant", label: "Lender Assistant" },
  { value: "Seller", label: "Seller" },
  { value: "Buyer", label: "Buyer" },
  /** Legacy / generic labels still allowed if already in DB */
  { value: "Transaction Coordinator", label: "Transaction Coordinator" },
  { value: "Assistant", label: "Assistant" },
  { value: "Other", label: "Other" },
] as const;

export const CONTACT_ROLE_VALUES: ReadonlySet<string> = new Set(
  CONTACT_ROLE_OPTIONS.map((o) => o.value)
);

export function isKnownContactRole(role: string): boolean {
  return CONTACT_ROLE_VALUES.has(role);
}
