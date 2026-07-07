export type MiscEmailTemplateSeed = {
  templateKey: string;
  name: string;
  category: string;
  subject: string;
  body: string;
};

/** Kathryn misc email bodies (tokenized from Docs/TC Templates/Misc). */
export const MISC_EMAIL_TEMPLATES: MiscEmailTemplateSeed[] = [
  {
    templateKey: "closing_file_email",
    name: "Closing file email template",
    category: "Client Email",
    subject: "{{property_street}} - Final Settlement Statement and Link to file documents",
    body: `Hello {{client_name}}!

Congratulations on closing escrow for {{property_address}}!

Attached is a copy of your Final Settlement Statement. Please use the link below if you would like to access and download all of the documents in your file for your records.

{{file_link}}

*Please note this single link will be accessible for 3 months. Should you need a copy of documents at a later date, please contact your agent or the brokerage office as the brokerage keeps a copy of your file for 3 years.

Congratulations again! It has been a pleasure working with you and we appreciate your business!

Kathryn`,
  },
  {
    templateKey: "vp_reminder",
    name: "VP Reminder",
    category: "Agent Email",
    subject: "{{property_street}} - Verification of Property Condition Reminder",
    body: `Hello {{agent_name}},

I have {{property_address}} on the calendar to close on {{coe_date}} so I'm sending a reminder for the Verification of Property Condition (VP).

If the Buyer does not do a final walkthrough, could you please have them sign the VP form with the waiver box checked for our file?

The Verification of Property Condition (VP) is the only item that we need to complete this file.

Thank you!`,
  },
];
