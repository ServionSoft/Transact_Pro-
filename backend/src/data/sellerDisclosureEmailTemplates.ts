export type SellerDisclosureEmailTemplateSeed = {
  templateKey: string;
  name: string;
  category: string;
  subject: string;
  body: string;
};

/** Kathryn seller-disclosure email bodies (tokenized from Docs/TC Templates/Seller Disclosure Templates). */
export const SELLER_DISCLOSURE_EMAIL_TEMPLATES: SellerDisclosureEmailTemplateSeed[] = [
  {
    templateKey: "listing_questions_agent",
    name: "MASTER - Listing Questions",
    category: "Agent Email",
    subject: "{{property_street}} - Listing Questions",
    body: `Hello {{listing_agent_name}}!

Congrats on your new listing at {{property_address}}. Below are the questions I have for this listing so I can prepare the disclosure packet:

Target On Market Date: Do you have an estimate for the Target OMD?

Disclosure timing: Would you like the disclosures sent for review and signature within a week, or at a later date? (No need to ask this question when Agent tells their clients K will be sending them disclosures to sign/handling the disclosures)

Docusign: Will we be using DocuSign for this Seller in the future, or will they be signing everything by hand?

Completing Questionnaires Electronically: I will send the Seller a link from Glide to fill out questionnaires electronically. Please let me know if you prefer otherwise for this client.

Exempt Seller: Please let me know if this Seller is Exempt from the TDS.

Solar, Well, Septic, Tenant Occupied: Do any of these apply?

HOA: Is there an HOA?

If Yes:

Do you know the process to order the HOA documents? If not, do you have the HOA contact info?

Would you like the HOA docs ordered ASAP or once in contract?

NHD: I will order the NHD from JCP. Would you like me to include the environmental report?

Pre-Inspections: What pre-inspections will you be having done, if any?

CMA: Do you have a CMA you would like me to send for the Seller's signature? Or Attached is a compressed version of the CMA that I found in Business Tracker. I will send this to the Seller for signature unless you prefer otherwise.

Pre-escrow: Who is/will be the Escrow Officer for this listing? Would you like me to pre-open escrow for you?

Thank you!

Kathryn Santos

Realtor | Transaction Coordinator

DRE#: 01916709

Cell: 707.338.1231`,
  },
  {
    templateKey: "listing_disclosure_intro_client",
    name: "Seller - Intro and Disclosures",
    category: "Client Email",
    subject: "{{property_street}} - Seller disclosures preview",
    body: `Hello {{client_name}}!

My name is Kathryn and I am {{listing_agent_name}}'s Transaction Coordinator. I will be helping with the sale of {{property_address}} by sending you documents to review and sign throughout the process.

For your review, I have attached Disclosures and Reports associated with selling a home in your area. They include:

Disclosures to fill out - I will send you a separate email from Glide with a link to view and complete the documents electronically. They are simply attached for your reference. -OR- {{listing_agent_name}} will work with you to fill these out in person. They are simply attached for your reference.

Transfer Disclosure Statement (TDS)

Seller Property Questionnaire (SPQ)

Fire Hardening and Defensible Space Advisory (FHDS)

Exempt Seller Disclosure (ESD)

Lead Based Paint & Lead Based Hazard Disclosure (LPD)

Residential Earthquake Hazard Disclosure Statement

Parking and Storage Disclosure (PSD)

Solar Advisory and Questionnaire (SOLAR)

Property Specific Disclosures

Natural Hazards Disclosure Report (NHD Report)

Natural Hazards Disclosure Invoice (NHD Invoice) - This will be paid out of the proceeds of the sale through escrow.

Square Footage and Lot Size Advisory (SFLS) - The square footage information on this form has been taken from the Realist Property Details (below). Please review and let us know if this information does not look correct to you.

Realist Property Details

Comparative Market Analysis (CMA)

Representative Capacity Signature Disclosure (RCSD-S)

Additional Agent Acknowledgment (AAA)

Seller Instruction to Exclude Listing From the Multiple Listing Service (SELM)

Standard Disclosures

Disclosure Information Advisory (DIA) - This is a great resource to refer to before and during the process of filling out disclosure questionnaires.

Market Conditions Advisory (MCA)

Statewide Buyer & Seller Advisory (SBSA)

Sonoma County Disclosures and Disclaimers Advisory (SCDDA)

Affiliated Business Arrangement Disclosure (Compass ABAD)

Buyer Preliminary Title Report ("PTR") Advisory (Compass PTR)

Compass Receipt to Links for Booklets (Compass RFL)

California Water Restrictions, Shortages, and Conservation Advisory (Compass WRSC)

Trust Advisory

Water Heater and Smoke Detector Disclosure (WHSD)

Water Conserving Plumbing Fixtures & Carbon Monoxide Detector Notice (WCMD)

Seller Acknowledgement of Obligation to Secure Belongings

Keysafe and Lockbox Addendum (KLA)

Wire Fraud Advisory (WFA)

While the Transfer Disclosure Statement and Seller Property Questionnaire need to be filled out, the other items simply need your review, acknowledgement and signature. I will send them to you for your electronic signature in the near future, but want you to have a chance to review them first.

Please reach out to {{listing_agent_name}} if you have any questions regarding the content or purpose of these disclosures, and please let me know if you have any trouble opening the attachments.

Thank you and I look forward to working with you!`,
  },
  {
    templateKey: "listing_disclosures_to_fill_out",
    name: "Email Template - Disclosures to fill out",
    category: "Client Email",
    subject: "{{property_street}} - Disclosures to fill out",
    body: `Hello {{client_name}}!

My name is Kathryn and I am {{listing_agent_name}}'s Transaction Coordinator. I will be helping with the sale of {{property_address}} by sending you documents to review and sign throughout the process.

Today you will be receiving emails from me with Disclosures and Reports associated with selling a property in your area.

Attached to this first email are disclosure questionnaires for you to fill out. I will send you a separate email from a program called Glide with a link to view and complete these documents. They are simply attached for your reference.

[TDS] Transfer Disclosure Statement

[SPQ] Seller Property Questionnaire

[ESD] Exempt Seller Disclosure

[LPD] Lead Based Paint & Lead Based Hazard Disclosure

[PSD] Parking and Storage Disclosure

Residential Earthquake Hazard Risk Disclosure Statement

Next, I will send you an email with additional disclosures and reports that only need your review and signature...

Thank you and I look forward to working with you!

Kathryn`,
  },
  {
    templateKey: "listing_additional_disclosures_seller",
    name: "Email Template - Additional Disclosures and Reports for Seller_s Review",
    category: "Client Email",
    subject: "{{property_street}} - Additional Disclosures and Reports",
    body: `Hello {{client_name}},

Attached to this email are disclosures and reports associated with your sale of {{property_address}} that simply need your review and signature. They include:

Property Specific Disclosures

[NHD Report] Natural Hazards Disclosure Report

[NHD Invoice] Natural Hazards Disclosure Invoice - This will be paid out of the proceeds of the sale through escrow.

[SFLS] Square Footage and Lot Size Advisory - The square footage information on this form has been taken from the Realist Property Details (below). Please review and let us know if this information does not look correct to you.

Realist Property Details

[AAA] Additional Agent Acknowledgment

[CMA] Comparative Market Analysis

[RCSD-S] Representative Capacity Signature Disclosure

Standard Disclosures

Compass Advisories

[Compass ABAD] Affiliated Business Arrangement Disclosure

[Compass ARVR]  Advisory Regarding Vendor / Service Provider Recommendations

[Compass PTR] Buyer Preliminary Title Report ("PTR") Advisory

[Compass RFL] Compass Receipt to Links for Booklets

[Compass WRSC] California Water Restrictions, Shortages, and Conservation Advisory

[DIA] Disclosure Information Advisory - This is a great resource to refer to before and during the process of filling out disclosure questionnaires.

[MCA] Market Conditions Advisory

[SBSA] Statewide Buyer & Seller Advisory

[SCDDA] Sonoma County Disclosures and Disclaimers Advisory be sure this is correct county

[WFA] Wire Fraud Advisory

Compass Seller Acknowledgement of Obligation to Secure Belongings

[TA] Trust Advisory

[WCMD] Water Conserving Plumbing Fixtures & Carbon Monoxide Detector Notice

[WHSD] Water Heater and Smoke Detector Disclosure

I will send these documents to you via DocuSign for your electronic signature in the near future, but want you to have a chance to review them first.

Please reach out to {{listing_agent_name}} if you have any questions regarding the content or purpose of these disclosures, and please let me know if you have any trouble opening the attachments.

Thanks again!

Kathryn`,
  },
  {
    templateKey: "listing_disclosure_link_agent",
    name: "Disclosure Link Template",
    category: "Agent Email",
    subject: "{{property_street}} - Disclosure Link and Remaining Items",
    body: `Hello {{listing_agent_name}}!

The disclosures and reports for {{property_address}} have been uploaded and published to the Glide disclosure packet. The share link is: {{disclosure_link}}

The only remaining items needed to complete the disclosure packet are:

{{missing_documents_list}}

We do not have a CMA on file for this listing yet. Please let me know if you have one you would like the Seller to sign. <You can also put any remaining listing documents here (SELM, etc.)>

Thank you!`,
  },
  {
    templateKey: "seller_remaining_disclosures",
    name: "Email Template - Remaining disclosures",
    category: "Client Email",
    subject: "{{property_street}} - Remaining disclosures",
    body: `Hello {{client_name}},

Attached are 3 remaining disclosures for {{property_address}}. They include:

Buyer's Agent's Visual Inspection Disclosure (AVID)

Transfer Disclosure Statement (TDS) pg3 - You've already completed pages 1 and 2 of this disclosure. It is now ready for your signature on page 3 below the information about the Agent Visual Inspections.

MLS Printout

Any other remaining disclosures needing the Seller's signature

I will send you a separate email from DocuSign with a link to view and sign these documents.

Thank you!

Kathryn`,
  },
  {
    templateKey: "seller_disclosures_batc",
    name: "TEMPLATE - Email - Seller disclosures to BATC",
    category: "Agent Email",
    subject: "{{property_street}} - Disclosures",
    body: `Hello {{buyer_agent_tc_name}},

Please click here to view and download the Seller disclosures packet for {{property_address}}. This package should be complete with the exception of the {{missing_documents_list}} which I will send to you as soon as available. Please let me know if you have any questions or are missing anything else from us.

Along with the Seller disclosure packet, could you please have the Buyer sign the following:

Updated Prelim - when available

Buyer's Agent's Visual Inspection Disclosure (AVID)

Buyer Home Inspection or Buyer Inspection Waiver (BIW)

Buyer Pest Inspection or Buyer Inspection Waiver (BIW)

Thank you!

Kathryn`,
  },
  {
    templateKey: "missing_buyer_signed_batc",
    name: "Email Template - Missing B signed disclosure request to BATC",
    category: "Agent Email",
    subject: "{{property_street}} - File Check-in",
    body: `Hello BATC!

Thank you for providing the Buyer signed disclosures for {{property_address}}.

Could you please send us the following missing items?

{{missing_documents_list}}

I believe the only other item needed to complete our file is the Verification of Property Condition (VP) when the time comes.

Thanks again!

Kathryn`,
  },
  {
    templateKey: "hoa_document_request",
    name: "Email Template - HOA Document Request",
    category: "Agent Email",
    subject: "HOA Document Request - {{property_street}}",
    body: `Hello {{hoa_contact}}!

Thank you for taking my call and explaining the process to order HOA documents for the sale of {{property_address}}.

I have attached the HOA-IR, HOA-RS, and HOA-RN for your completion, and I have sent the owner, {{client_name}}, the payment instructions.

I have copied the Listing Agent for this property, {{listing_agent_name}}, so everyone is in the loop.

Please let me know if you need anything else from us.

Thanks again!

Kathryn`,
  },
  {
    templateKey: "hoa_focus_order_instructions",
    name: "Email Template - Focus Real Estate HOA Doc order instructions",
    category: "Agent Email",
    subject: "{{property_street}} - HOA document order instructions",
    body: `Hello {{listing_agent_name}},

Below are the HOA Document order instructions for {{property_address}} so we have them when we're ready.

Step 1: I send the completed CAR forms to Nora at Focus Real Estate at info@focus-re.com

Step 2: Payment in the amount of $300 must be made to the Focus Real Estate office by cash or check. They do not accept credit cards.

The Focus Real Estate office is located at: 3936 Mayette Ave, Santa Rosa, CA

Please let me know when you would like me to initiate the order. For now, I'll just save this information and check back in with you farther along in the process.

Thanks!

Kathryn`,
  },
  {
    templateKey: "seller_questionnaires_review",
    name: "Email Template - Completed Seller Questionnaires for Review",
    category: "Client Email",
    subject: "{{property_street}} - Completed Disclosure Questionnaires",
    body: `Hello {{client_name}}!

Thank you for completing the Disclosure Questionnaires for {{property_address}}.

Attached is a PDF of each completed questionnaire. I will also send you a separate email from DocuSign with a link to view and sign each document.

Before signing, please double-check that everything in these disclosures is complete and correct to the best of your knowledge. If everything looks good, please click the link in the DocuSign email and follow the prompts to initial and sign where indicated.

Thanks again!

Kathryn`,
  },
  {
    templateKey: "seller_disclosures_docusign",
    name: "Docusign Template - Seller Disclosures and Reports",
    category: "Client Email",
    subject: "Complete with Docusign: Disclosures and Reports for {{property_street}}",
    body: `Hello {{client_name}}!

Above is the link to view and sign the Disclosures and Reports for {{property_address}} that were recently sent to you for review.

Thank you!

Kathryn`,
  },
];
