export type TimelineEmailTemplateSeed = {
  templateKey: string;
  name: string;
  category: string;
  subject: string;
  body: string;
};

/** Kathryn timeline email bodies (tokenized from Docs/TC Templates/Timeline Templates). */
export const TIMELINE_EMAIL_TEMPLATES: TimelineEmailTemplateSeed[] = [
  {
    templateKey: "timeline_parties",
    name: "Timeline Email - Other Agent and Escrow",
    category: "Agent Email",
    subject: "{{property_street}} | {{escrow_number}} | Transaction Timeline",
    body: `Hello {{other_side_agent_name}} and {{escrow_officer}},

I am {{agent_name}}'s Transaction Coordinator. I look forward to working with you all on {{property_address}}!

Please find the Transaction Timeline for this escrow below. Please let me know if you see any discrepancies or notice any errors on my end.

{{timeline_table}}

{{other_side_agent_name}}, do you have a Transaction Coordinator who you would like me to copy on future emails?

OR

{{other_side_agent_tc_name}}, I have the link to the disclosure packet and will let you know if I have any questions.

OR

{{other_side_agent_tc_name}}, I will send you disclosure information in a separate email.

**To help me provide you with the best service, please put "{{property_street}}" in the subject line on all emails related to this transaction.**

Thank you!

Kathryn

Kathryn Santos
Realtor | Transaction Coordinator
DRE#: 01916709
Cell: 707.338.1231`,
  },
  {
    templateKey: "timeline_client",
    name: "Timeline Email - Buyer",
    category: "Client Email",
    subject: "{{property_street}} - Transaction Timeline",
    body: `Hello {{client_name}},

Congratulations on having your offer accepted to purchase {{property_address}}!

I am {{buyer_agent_name}}'s Transaction Coordinator. I help by keeping track of timelines and sending you documents to review and sign as needed throughout the transaction.

Below is a Transaction Timeline showing key dates throughout the process. Should you have any questions along the way, please let us know!

{{timeline_table}}

**To help me take the best care of you, please put "{{property_street}}" in the subject line on all emails related to this transaction.**

Thank you and I look forward to working with you!

Kathryn`,
  },
  {
    templateKey: "timeline_email_seller",
    name: "Transaction Timeline - Seller",
    category: "Client Email",
    subject: "{{property_street}} - Transaction Timeline",
    body: `Hello {{client_name}},

Congratulations on accepting an offer for the sale of {{property_address}}! I am {{listing_agent_name}}'s Transaction Coordinator and will be helping by sending you documents to review and sign as needed throughout the transaction.

Below is a Transaction Timeline showing key dates throughout the process. Should you have any questions along the way, please let us know!

{{timeline_table}}

**To help me take the best care of you, please put "{{property_street}}" in the subject line on emails related to this transaction.**

Thank you!

Kathryn Santos
Realtor | Transaction Coordinator
DRE#: 01916709
Cell: 707.338.1231`,
  },
  {
    templateKey: "timeline_cr_reminder",
    name: "Timeline_CR Reminder Template",
    category: "Agent Email",
    subject: "{{property_street}} - {{deadline_name}} Reminder",
    body: `Hello {{agent_name}},

Sending a reminder that today, {{today_date}}, is the date on the calendar for the {{deadline_name}} for {{property_address}}.

Thank you!

Kathryn`,
  },
];
