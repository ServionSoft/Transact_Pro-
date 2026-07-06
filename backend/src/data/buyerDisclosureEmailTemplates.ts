export type BuyerDisclosureEmailTemplateSeed = {
  templateKey: string;
  name: string;
  category: string;
  subject: string;
  body: string;
};

/** Kathryn buyer-disclosure email bodies (tokenized from Docs/TC Templates/Buyer Disclosure Templates). */
export const BUYER_DISCLOSURE_EMAIL_TEMPLATES: BuyerDisclosureEmailTemplateSeed[] = [
  {
    templateKey: "notes_questions_ba",
    name: "Notes and Questions - New file, Buyer_s Agent",
    category: "Agent Email",
    subject: "{{property_street}} - Notes and Questions",
    body: `Hello {{buyer_agent_name}},

Congrats on the new escrow for {{property_address}}! Below are some notes and questions I have for this transaction:

Business Tracker: Please add me to the file when you get the chance

Any other documents with offer: Please also send me all, if any, other documents signed or submitted with the offer.

Preapproval: Please send me a copy of the Preapproval Letter. Was this already submitted with the offer? If not, would you like me to pass it along for you?

Proof of Funds: Please send me a copy of the Proof of Funds. Was this already submitted with the offer? If not, would you like me to pass it along for you?

Buyer Representation and Broker Compensation Agreement (BRBC): Please send me the entire BRBC packet for this Buyer to add to the file.

Buyer's Affirmation Regarding Other Representation Agreements: Do you have a signed copy of this agreement you can send to me for your file? If not, could you please have one signed?

CMA: Do you have a CMA that you would like sent to the Buyer for signature? Or Attached is the CMA I found in Business Tracker. I will send this to the Buyer for signature unless you prefer otherwise.

Buyer Inspections or Waiver: When able, please let me know if the Buyer will be doing their own Home and Pest Inspections. If they are not, I will send them a Buyer Inspection Waiver (BIW).

Your AVID: Please send me a copy when it's ready for signatures.

I think that's everything! Thanks!

Kathryn`,
  },
  {
    templateKey: "missing_disclosure_request_la_tc",
    name: "Missing Disclosure Request - MASTER",
    category: "Agent Email",
    subject: "{{property_street}} - Disclosures",
    body: `Hello {{listing_agent_name}} and {{listing_agent_tc_name}},

Thank you for providing the majority of the disclosures upfront for {{property_address}}!

I believe the only missing/remaining items are:

{{missing_documents_list}}

Thanks again!

Kathryn`,
  },
  {
    templateKey: "buyer_disclosures_review",
    name: "Buyer - Disclosures and Reports for Review",
    category: "Client Email",
    subject: "{{property_street}} - Disclosures and Reports for Review",
    body: `Hello {{client_name}}!

For your review, I am sending you Disclosures and Reports associated with your purchase of {{property_address}}:

Option 1 The majority of the disclosures are from the Seller's disclosure packet. They are listed on the attached Coversheet and are noted as Items 1-#.*

*Please note that Item __ is attached below as a link as it was too large as an email attachment

OR Option 2 if Option 1 doesn't work

Please click here to view the majority of the disclosures which are from the Seller's disclosure packet: {{disclosure_link}}

They are also listed on the attached Coversheet and are noted as Items 1-#.

Additional documents attached for your review include:

Property Specific Disclosures
[AAA] Additional Agent Acknowledgement
[BIW] Buyer's Inspection Waiver - I will set this up for you to initial Items 3A, 3B, and 4B, and to sign at the bottom
[CMA] Comparative Market Analysis
[AC] Confirmation of Agency
Updated Preliminary Title Report and __ Associated Documents - This report contains blue hyperlinks. Please be sure to click on each link to view all of the information contained within this report.
[DEDA] Designated Electronic Delivery Address

Standard Disclosures
Compass Advisories
[Compass ABAD] Affiliated Business Arrangement Disclosure
[Compass ARVR]  Advisory Regarding Vendor / Service Provider Recommendations
[Compass EHA] Compass Environmental Hazards Advisory
[Compass PTR] Buyer Preliminary Title Report ("PTR") Advisory
[Compass RFL] Compass Receipt to Links for Booklets
[Compass WRSC] California Water Restrictions, Shortages, and Conservation Advisory
[MCA] Market Conditions Advisory
[SBSA] Statewide Buyer & Seller Advisory
[SCDDA] Sonoma County Disclosures and Disclaimers Advisory
[WFDA] Wildfire Disaster Advisory
[BHAA] Buyer's Homeowners Association Advisory
[TA] Trust Advisory
[WCMD] Water Conserving Plumbing Fixtures & Carbon Monoxide Detector Notice
[WHSD] Water Heater and Smoke Detector Disclosure
[WFA] Wire Fraud Advisory
Protect your Family from Lead in your Home booklet
Septic Pamphlet and Receipt
Well Pamphlet and Receipt

Please reach out to {{buyer_agent_name}} if you have any questions regarding the content or purpose of these disclosures, and please let me know if you have any trouble opening the attachments.

After you've had a chance to review these items, I will send them to you for your acknowledgement and electronic signature via DocuSign.

There are additional documents we are waiting on. I will send those to you as they come available.

Thank you!`,
  },
  {
    templateKey: "buyer_disclosures_separate_packet",
    name: "Disclosures and Reports (Buyer) - Separate Emails Template",
    category: "Client Email",
    subject: "{{property_street}} - Seller disclosure packet for review",
    body: `Hello {{client_name}}!

For your review, I am sending you two emails with Disclosures and Reports associated with your purchase of {{property_address}}.

Attached to this email are documents from the Seller disclosure packet, listed on the Coversheet.

I will send you a separate email with additional disclosures and reports.

Thank you!

Kathryn`,
  },
  {
    templateKey: "buyer_disclosures_separate_additional",
    name: "Disclosures and Reports (Buyer) - Separate Emails - Additional",
    category: "Client Email",
    subject: "{{property_street}} - Additional Disclosures and Reports",
    body: `Hello {{client_name}},

Attached to this email are additional Disclosures and Reports for {{property_address}}. They include:

Property Specific Disclosures
Natural Hazards Disclosure Report (NHD Report)
Square Footage and Lot Size Advisory (SFLS) - The Seller did not fill out the square footage information on this form so it is being sent as a general advisory. (Only include this note if it's applicable)
Realist Property Details
MLS Printout
Additional Agent Acknowledgement (AAA)
Confirmation of Agency (AC)
Addendum
{{buyer_agent_name}}'s Agent Visual Inspection Disclosure (BA AVID)
Buyer Inspection Waiver (BIW) - I will set this up for you to initial Items 3A, 3B, and 4, and to sign at the bottom
Comparative Market Analysis (CMA)
Exempt Seller Disclosure (ESD)
Fire Hardening and Defensible Space Advisory (FHDS)
Lead Based Paint & Lead Based Hazard Disclosure (LPD)
{{listing_agent_name}}'s Agent Visual Inspection Disclosure (LA AVID)
Parking and Storage Disclosure (PSD)
Preliminary Title Report and __ Associated Documents
Representative Capacity Signature Disclosure (RCSD-S)
Residential Earthquake Hazard Disclosure Statement
Solar Advisory and Questionnaire (SOLAR)
Updated Preliminary Title Report and __ Associated Documents

Standard Disclosures

Compass Advisories
Affiliated Business Arrangement Disclosure (Compass ABAD)
Compass Environmental Hazards Advisory (Compass EHA)
Buyer Preliminary Title Report ("PTR") Advisory (Compass PTR)
Compass Receipt to Links for Booklets (Compass RFL)
California Water Restrictions, Shortages, and Conservation Advisory (Compass WRSC)
Broker Compensation Advisory (BCA)
Market Conditions Advisory (MCA)
Septic Pamphlet and Receipt
Statewide Buyer & Seller Advisory (SBSA)
Sonoma County Disclosures and Disclaimers Advisory (SCDDA)
Trust Advisory (TA)
Water Conserving Plumbing Fixtures & Carbon Monoxide Detector Notice (WCMD)
Wire Fraud Advisory (WFA)
Water Heater and Smoke Detector Disclosure (WHSD)
Well Pamphlet and Receipt
Wildfire Disaster Advisory (WFDA)

After you've had a chance to review these items, I will send them to you for your acknowledgement and electronic signature via DocuSign.

There are additional documents we are waiting on. I will send those to you as they come available.

Please reach out to {{buyer_agent_name}} if you have any questions regarding the content or purpose of these disclosures, and please let me know if you have any trouble opening the attachments.

Thank you!

Kathryn`,
  },
  {
    templateKey: "buyer_signed_docs_la_tc",
    name: "Buyer signed docs - EMAIL TEMPLATE",
    category: "Agent Email",
    subject: "{{property_street}} - Buyer signed docs",
    body: `Hello {{listing_agent_tc_name}}!

Please click here to view and download the Buyer signed disclosures and reports for {{property_address}}: {{disclosure_link}}

Could you please have the following documents signed for our file? They are attached to this email and are within the link in a folder titled "Needs Signature".

{{buyer_agent_name}}'s AVID

Compass Advisories - If your brokerage does not have your Seller sign these items, please let me know and I will note our file.

{{missing_documents_list}}

I believe the only other items needed to complete our file are the Full Contingency Removal and the Verification of Property Condition (VP).

Please let me know if you need anything else from us.

Thank you!

Kathryn`,
  },
  {
    templateKey: "buyer_signed_disclosures_la_tc",
    name: "TEMPLATE - Buyer signed disclosures",
    category: "Agent Email",
    subject: "{{property_street}} - Buyer signed disclosures / Request for Seller signature",
    body: `Hello {{listing_agent_name}} and {{listing_agent_tc_name}}!

Please click here to view and download the Buyer signed disclosures and reports for {{property_address}}: {{disclosure_link}}

Could you please have the following documents signed for our file? They are attached to this email and are also within the link in a folder titled "Needs Seller".

{{missing_documents_list}}

We still owe you {{update_details}}.

Please let me know if you need anything else from us disclosure-wise.

Thank you!

Kathryn`,
  },
  {
    templateKey: "missing_buyer_signed_disclosure",
    name: "Missing Buyer signed disclosure Template",
    category: "Agent Email",
    subject: "{{property_street}} - Remaining Disclosures",
    body: `Hello {{buyer_agent_name}} and {{buyer_agent_tc_name}},

Thank you for providing Buyer signed disclosures for {{property_address}}!

I believe the only remaining disclosures for the Buyer to sign are:

{{missing_documents_list}}

Thanks again!

Kathryn`,
  },
];
