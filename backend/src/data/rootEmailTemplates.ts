export type RootEmailTemplateSeed = {
  templateKey: string;
  name: string;
  category: string;
  subject: string;
  body: string;
};

/** Kathryn root-level email bodies (tokenized from Docs/TC Templates root). */
export const ROOT_EMAIL_TEMPLATES: RootEmailTemplateSeed[] = [
  {
    templateKey: "tenant_docs_to_agents",
    name: "Tenant Document email to agents",
    category: "Agent Email",
    subject: "{{property_street}} - Tenant Documents",
    body: `Hello {{agent_name}},

It looks like {{property_address}} is Tenant Occupied per the MLS. We should have the following signed for the file:

[KLA] Keysafe and Lockbox Addendum (signed by tenant)
Tenant Acknowledgement of Obligation to Secure Belongings (signed by Tenant)

Also, if the tenant will be in place when offers are received, we will need the following:

[TOPA] Tenant Occupied Property Addendum - This will go with the contract, but sometimes it's useful to have it filled out upfront and part of the disclosure packet. Completely up to you.

[TEC] Tenant Estoppel Certificate - If the tenant(s) might be staying in place when the transaction closes.

If you send me the Tenant's email(s) and would like me to send the first two to them for signature, I'm happy to do that! The other two need to be filled out first.

Thanks!

Kathryn`,
  },
];
