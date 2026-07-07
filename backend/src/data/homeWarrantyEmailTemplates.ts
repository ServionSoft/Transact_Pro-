export type HomeWarrantyEmailTemplateSeed = {
  templateKey: string;
  name: string;
  category: string;
  subject: string;
  body: string;
};

/** Kathryn home-warranty email bodies (tokenized from Docs/TC Templates/Home Warranty Templates). */
export const HOME_WARRANTY_EMAIL_TEMPLATES: HomeWarrantyEmailTemplateSeed[] = [
  {
    templateKey: "warranty_order_ahs",
    name: "Email template - AHS home warranty order_",
    category: "Agent Email",
    subject: "{{property_street}} - Home Warranty Order",
    body: `Hello Catherine!

{{agent_name}} would like to purchase a Home Warranty for their Buyer. Could you please place the order for us?

Order details below:

Property Address: {{property_address}}
Property Type: {{property_type}}
Plan/Options: {{home_warranty}}
Buyer Name(s): {{buyer_name}}
Buyer's Contact Info: {{buyer_email}}, {{buyer_phone}}
Escrow Officer/Company/Contact Info: {{escrow_officer}}, {{escrow_company}}
Escrow Number: {{escrow_number}}
Estimated COE date: {{coe_date}}
Agent: {{update_details}}

Please let me know if you need any other info.

Thank you!

Kathryn

Catherine's contact info if needed:
Catherine Foster
catherine.foster@ahs.com
(925) 234-2155`,
  },
  {
    templateKey: "warranty_order_choice",
    name: "Email template - Choice home warranty order_",
    category: "Agent Email",
    subject: "{{property_street}} - Home Warranty Order",
    body: `Hello Karen!

{{agent_name}} would like to purchase a Home Warranty for their Buyer. Could you please place the order for us?

Buyers Name: {{buyer_name}}
Buyers Email: {{buyer_email}}
Buyers Phone #: {{buyer_phone}}
Property Address: {{property_address}}
Plan/Price: {{home_warranty}}
Single Family/Condo/Townhouse: {{property_type}}
Escrow Company: {{escrow_company}}
Escrow Officer: {{escrow_officer}}
Escrow #: {{escrow_number}}
Email invoice to: {{update_details}}
Close of Escrow: {{coe_date}}

Please let me know if you need any other info.

Thank you!

Kathryn`,
  },
  {
    templateKey: "warranty_order_fidelity",
    name: "Email template - Fidelity home warranty order_",
    category: "Agent Email",
    subject: "{{property_street}} - Home Warranty Order",
    body: `Hello Lisa!

{{agent_name}} would like to purchase a Home Warranty for their Buyer. Could you please place the order for us?

Order details below:

Property Address: {{property_address}}
Property Type: {{property_type}}
Plan/Options: {{home_warranty}}
Buyer Name(s): {{buyer_name}}
Escrow Officer/Company: {{escrow_officer}}, {{escrow_company}}
Escrow Number: {{escrow_number}}
Estimated COE date: {{coe_date}}

Please let me know if you need any other info.

Thank you!

Kathryn`,
  },
  {
    templateKey: "warranty_order_first_american",
    name: "Email template - First American home warranty order_",
    category: "Agent Email",
    subject: "{{property_street}} - Home Warranty Order",
    body: `Hello Heather!

{{agent_name}} would like to purchase a Home Warranty for their Buyer. Could you please place the order for us?

Order details below:

Property Address: {{property_address}}
Property Type: {{property_type}}
Plan/Options: {{home_warranty}}
Buyer Name(s): {{buyer_name}}
Escrow Officer/Company: {{escrow_officer}}, {{escrow_company}}
Escrow Number: {{escrow_number}}
Estimated COE date: {{coe_date}}

Please let me know if you need any other info.

Thank you!

Kathryn`,
  },
  {
    templateKey: "warranty_info_buyer",
    name: "Email Template - Home Warranty email to Buyer",
    category: "Client Email",
    subject: "{{property_street}} - Home Warranty",
    body: `Hello {{client_name}}!

I have noted that {{update_details}} will be purchasing a Home Warranty for you for {{property_address}} for an amount up to {{home_warranty}}.

You can choose a home warranty from any company you would like. I have attached brochures from a few popular home warranty companies as reference to some of your options.

If you let me know which plan and options you would like, I am happy to place the order for you.

Thank you!

Kathryn`,
  },
  {
    templateKey: "warranty_info_agent",
    name: "Home warranty email to agent template",
    category: "Agent Email",
    subject: "{{property_street}} - Home Warranty",
    body: `Hello {{agent_name}}!

I have noted that {{update_details}} will be purchasing a Home Warranty for the Buyer of {{property_address}} from {{home_warranty}}.

Attached is the home warranty brochure.

Please let me know which plan and options you would like and I will place the order for you.

Thank you!

Kathryn`,
  },
  {
    templateKey: "warranty_commission_compass",
    name: "Email Template - Home Warranty info to Compass Commissions",
    category: "Agent Email",
    subject: "{{property_street}} - Home Warranty fee paid by Compass Agent",
    body: `Hello Commissions Team!

{{agent_name}} will be paying for a Home Warranty for their clients on {{property_address}}.

The commissions tab is in the "under review by finance" stage so I am not able to add the home warranty fee information at this time. Attached is the invoice. Could you please add the {{home_warranty}} Home Warranty Fee to the commission breakdown for this transaction?

Thank you!

Kathryn`,
  },
];
