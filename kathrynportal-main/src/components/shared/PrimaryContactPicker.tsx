import type { Client } from "@/data/mockData";
import { ContactLinkPicker } from "@/components/shared/ContactLinkPicker";

/** Primary transaction contact (optional); searchable + full add-contact form. */
export function PrimaryContactPicker(props: {
  value: string;
  options: Client[];
  onValueChange: (id: string) => void;
}) {
  return <ContactLinkPicker variant="primary" defaultCreateRole="Other" {...props} />;
}
