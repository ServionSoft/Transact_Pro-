export type NewEscrowEmailTemplateSeed = {
  templateKey: string;
  name: string;
  category: string;
  subject: string;
  body: string;
};

/** Kathryn new-escrow email bodies (tokenized from Docs/TC Templates/New Escrow). */
export const NEW_ESCROW_EMAIL_TEMPLATES: NewEscrowEmailTemplateSeed[] = [
  {
    templateKey: "new_pre_escrow",
    name: "NEW PRE-ESCROW Template",
    category: "Agent Email",
    subject: "NEW PRE-ESCROW | {{property_street}} | {{listing_agent_name}}",
    body: `Hello {{escrow_officer}},

{{listing_agent_name}} would like to pre-open escrow with you on their new listing at {{property_address}}.

Attached tax records show it as a {{property_type}} with the Seller as {{client_name}}.

When able, could you please send us an escrow number and request a prelim?

Please let me know if you need anything else from us!

Thank you!

Kathryn`,
  },
  {
    templateKey: "new_escrow",
    name: "New Escrow - MASTER",
    category: "Agent Email",
    subject: "NEW ESCROW | {{property_street}} | {{buyer_agent_name}}",
    body: `Hello {{escrow_officer}},

{{buyer_agent_name}} would like to open escrow with you for their Buyer's purchase of {{property_address}}.

Attached is a copy of the Ratified Contract and Buyer Broker Agreement.

The Buyer's contact information is:

{{client_name}}
{{client_email}}
{{client_phone}}

Please reach out to the Buyer with instructions for submitting the EMD, and please send us the escrow number and prelim when you have those available.

In the meantime, please let me know if you need anything else from us!

Thank you!

Kathryn`,
  },
];
