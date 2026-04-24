/**
 * Source data for DB seed (document_types, document_sets, conditional_rules).
 * Mirrors kathrynportal-main mock checklist; keep in sync when mock changes.
 */
export type ListingRow = readonly [mockId: string, section: string, name: string, required: boolean, note?: string];

/** Full standard listing checklist (60 rows). */
export const STANDARD_LISTING_ROWS: ListingRow[] = [
  ["sd1", "Listing Agreement Documents", "[AD] Disclosure Regarding Real Estate Agency Relationships", true],
  ["sd2", "Listing Agreement Documents", "[RLA] Residential Listing Agreement", true],
  ["sd3", "Listing Agreement Documents", "[MLSA] Multiple Listing Service Addendum", true],
  ["sd4", "Listing Agreement Documents", "[BCA] Broker Compensation Advisory", true],
  ["sd5", "Listing Agreement Documents", "[PRBS] Possible Representation of more than one Buyer or Seller", true],
  ["sd6", "Listing Agreement Documents", "[FHDA] Fair Housing & Discrimination Advisory", true],
  ["sd7", "Listing Agreement Documents", "[SA] Seller's Advisory", true],
  ["sd8", "Listing Agreement Documents", "[CCPA] California Consumer Privacy Act Advisory", true],
  ["sd9", "Listing Disclosures", "[Compass ABAD] Compass Affiliated Business Arrangement Disclosure", true, "Duplicate w/checklist below. Only needs to be signed by Seller once"],
  ["sd10", "Listing Disclosures", "[Compass ARVR] Advisory Regarding Vendor / Service Provider Recommendations", true],
  ["sd11", "Listing Disclosures", "[DIA] Disclosure Information Advisory", true],
  ["sd12", "Listing Disclosures", "[MCA] Market Conditions Advisory", true, "Duplicate w/checklist below. Only needs to be signed by Seller once"],
  ["sd13", "Listing Disclosures", "[WFA] Wire Fraud Advisory", true],
  ["sd14", "Listing Disclosures", "[CMA] Comparative Market Analysis", true],
  ["sd15", "Listing Disclosures", "NHD Invoice", true],
  ["sd16", "Listing Disclosures", "Preliminary Title Report", true],
  ["sd17", "Listing Disclosures", "Realist Property Details", true, "Duplicate w/checklist below. Only needs to be signed by Seller once"],
  ["sd18", "Listing Disclosures", "Compass Seller Acknowledgement of Obligation to Secure Belongings", true],
  ["sd19", "Listing Disclosures", "MLS Printout", true],
  ["sd20", "Listing Disclosures", "Rejected Offer 1", false],
  ["sd21", "Seller Disclosures - Questionnaires", "[TDS] Transfer Disclosure Statement", true],
  ["sd22", "Seller Disclosures - Questionnaires", "[AVID] Agent Visual Inspection Disclosure - Listing Agent", true],
  ["sd23", "Seller Disclosures - Questionnaires", "[SPQ] Seller Property Questionnaire", true],
  ["sd24", "Seller Disclosures - Inspection Reports", "Home Inspection", true],
  ["sd25", "Seller Disclosures - Inspection Reports", "Pest Inspection", true],
  ["sd26", "Seller Disclosures - Inspection Reports", "Other Inspection Reports", false],
  ["sd27", "Seller Disclosures - Preliminary Title Report", "Preliminary Title Report", true],
  ["sd28", "Seller Disclosures - Preliminary Title Report", "Prelim Links (#)", true],
  ["sd29", "Seller Disclosures - Property Specific", "[NHD] Natural Hazard Disclosure Report", true],
  ["sd30", "Seller Disclosures - Property Specific", "[SFLS] Square Footage and Lot Size Advisory", true],
  ["sd31", "Seller Disclosures - Property Specific", "Realist Property Details", true],
  ["sd32", "Seller Disclosures - Standard", "[MCA] Market Conditions Advisory", true],
  ["sd33", "Seller Disclosures - Standard", "[SBSA] Statewide Buyer & Seller Advisory", true],
  ["sd34", "Seller Disclosures - Standard", "County Disclosures and Disclaimers Advisory", true],
  ["sd35", "Seller Disclosures - Standard", "[WFDA] Wildfire Disaster Advisory", true],
  ["sd36", "Seller Disclosures - Standard", "[Compass ABAD] Affiliated Business Arrangement Disclosure", true],
  ["sd37", "Seller Disclosures - Standard", "[Compass EHA] Environmental Hazards Advisory", true],
  ["sd38", "Seller Disclosures - Standard", "[Compass PTR] Buyer Preliminary Title Report (PTR) Advisory", true],
  ["sd39", "Seller Disclosures - Standard", "[Compass RFL] Receipt to Links for Booklets", true],
  ["sd40", "Seller Disclosures - Standard", "[Compass WRSC] California Water Restrictions, Shortages, and Conservation Advisory", true],
  ["sd41", "Buyer Inspection Reports", "Buyer's Home Inspection", true],
  ["sd42", "Buyer Inspection Reports", "Buyer's Pest Inspection", true],
  ["sd43", "Buyer Inspection Reports", "[BIW] Buyer Inspection Waiver", false],
  ["sd44", "Buyer Inspection Reports", "Additional Buyer Inspection Reports", false],
  ["sd45", "Other In-Escrow Disclosures and Reports", "[Updated Prelim] Updated Preliminary Title Report", true],
  ["sd46", "Other In-Escrow Disclosures and Reports", "[AVID] Agent Visual Inspection Disclosure - Buyer's Agent", true],
  ["sd47", "Other In-Escrow Disclosures and Reports", "[CMA] Comparative Market Analysis", false, "Buyer files only"],
  ["sd48", "Contingencies", "Investigation", true],
  ["sd49", "Contingencies", "Insurance", true],
  ["sd50", "Contingencies", "Review of Seller Documents", true],
  ["sd51", "Contingencies", "Review of Prelim", true],
  ["sd52", "Contingencies", "Review of Common Interest Disclosures", true],
  ["sd53", "Contingencies", "Appraisal", true],
  ["sd54", "Contingencies", "Loan", true],
  ["sd55", "Contingencies", "Other Contingencies", false],
  ["sd56", "Contingencies", "Full Contingency Removals", true],
  ["sd57", "Final Contract Documents", "Home Warranty Order Verification", true],
  ["sd58", "Final Contract Documents", "[VP] Verification of Property Condition", true],
  ["sd59", "Final Contract Documents", "Title Verification of FIRPTA/QS/AS-FIRPTA", true],
  ["sd60", "Final Contract Documents", "Final Settlement Statement", true],
];

const BUYER_SECTIONS = new Set([
  "Buyer Inspection Reports",
  "Other In-Escrow Disclosures and Reports",
  "Contingencies",
  "Final Contract Documents",
]);

export function standardBuyerRows(): ListingRow[] {
  return STANDARD_LISTING_ROWS.filter((r) => BUYER_SECTIONS.has(r[1]));
}

export type ActionSeed = { id: string; documentName: string; action: "add-required" | "add-optional" | "mark-na"; note?: string };

export type ConditionalRuleSeed = {
  id: number;
  name: string;
  kind: "standard" | "conditional";
  triggers: { field: string; value: string }[];
  actions: ActionSeed[];
  transactionType: "listing" | "buyer_file" | null;
};

export const SEEDED_RULES: ConditionalRuleSeed[] = [
  {
    id: 10011,
    name: "Standard Listing Checklist",
    kind: "standard",
    triggers: [{ field: "transactionType", value: "Listing" }],
    actions: [],
    transactionType: "listing",
  },
  {
    id: 10012,
    name: "Standard Buyer File Checklist",
    kind: "standard",
    triggers: [{ field: "transactionType", value: "Buyer File" }],
    actions: [],
    transactionType: "buyer_file",
  },
  {
    id: 10013,
    name: 'When "Exempt Seller" is Yes',
    kind: "conditional",
    triggers: [{ field: "exemptSeller", value: "Yes" }],
    actions: [
      { id: "a1", documentName: "[ESD] Exempt Seller Disclosure", action: "add-required" },
      { id: "a2", documentName: "[WCMD] Water Conserving Plumbing Fixtures & Carbon Monoxide Notice", action: "add-required" },
      { id: "a3", documentName: "[WHSD] Water Heater and Smoke Detector Disclosure", action: "add-required" },
      { id: "a4", documentName: "[TA] Trust Advisory", action: "add-required", note: "if Seller Entity is also a Trust" },
      { id: "a5", documentName: "[TDS] Transfer Disclosure Statement", action: "mark-na" },
      { id: "a6", documentName: "[SPQ] Seller Property Questionnaire", action: "mark-na" },
      { id: "a7", documentName: "Residential Earthquake Risk Disclosure Statement", action: "mark-na" },
      { id: "a8", documentName: "[FHDS] Fire Hazard and Defensible Space Disclosure and Addendum", action: "mark-na" },
    ],
    transactionType: null,
  },
  {
    id: 10014,
    name: 'When "HOA" is Yes',
    kind: "conditional",
    triggers: [{ field: "hoa", value: "Yes" }],
    actions: [
      { id: "h1", documentName: "HOA Documents (#)", action: "add-required" },
      { id: "h2", documentName: "HOA-IR", action: "add-required" },
      { id: "h3", documentName: "HOA-RS", action: "add-required" },
      { id: "h4", documentName: "HOA-RN", action: "add-required" },
      { id: "h5", documentName: "[BHAA] Buyer's Homeowners Association Advisory", action: "add-required" },
    ],
    transactionType: null,
  },
  {
    id: 10015,
    name: 'When "Tenant Occupied" is Yes',
    kind: "conditional",
    triggers: [{ field: "tenantOccupied", value: "Yes" }],
    actions: [
      { id: "t1", documentName: "[KLA] Keysafe and Lockbox Addendum (signed by tenant)", action: "add-required", note: "Listing Files only" },
      { id: "t2", documentName: "Tenant Acknowledgement of Obligation to Secure Belongings (signed by Tenant)", action: "add-required", note: "Listing Files only" },
      { id: "t3", documentName: "[TOPA] Tenant Occupied Property Addendum", action: "add-required" },
      { id: "t4", documentName: "[TEC] Tenant Estoppel Certificate", action: "add-required", note: "if Tenant will stay in place at COE" },
    ],
    transactionType: null,
  },
  {
    id: 10016,
    name: 'When Property Type is "Vacant Land"',
    kind: "conditional",
    triggers: [{ field: "propertyType", value: "Vacant Land" }],
    actions: [
      { id: "v1", documentName: "[TDS] Transfer Disclosure Statement", action: "mark-na" },
      { id: "v2", documentName: "[SPQ] Seller Property Questionnaire", action: "mark-na" },
      { id: "v3", documentName: "Residential Earthquake Risk Disclosure Statement", action: "mark-na" },
      { id: "v4", documentName: "[FHDS] Fire Hazard and Defensible Space Disclosure and Addendum", action: "mark-na" },
      { id: "v5", documentName: "[RLA] Residential Listing Agreement", action: "mark-na" },
      { id: "v6", documentName: "[SA] Seller's Advisory", action: "mark-na" },
      { id: "v7", documentName: "[VLLA] Vacant Land Listing Agreement", action: "add-required" },
      { id: "v8", documentName: "[SVLA] Seller Vacant Land Advisory", action: "add-required" },
      { id: "v9", documentName: "[RPA] Residential Purchase Agreement", action: "mark-na" },
      { id: "v10", documentName: "[BIA] Buyer Inspection Advisory", action: "mark-na" },
      { id: "v11", documentName: "[VLPA] Vacant Land Purchase Agreement", action: "add-required" },
      { id: "v12", documentName: "[BVLIA] Buyer's Additional Vacant Land Inspection Advisory", action: "add-required" },
    ],
    transactionType: null,
  },
  {
    id: 10017,
    name: 'When County is "Marin"',
    kind: "conditional",
    triggers: [{ field: "county", value: "Marin" }],
    actions: [
      { id: "m1", documentName: "City Re-Sale Inspection Report", action: "add-required" },
      { id: "m2", documentName: "Corte Madera/Larkspur Central Marin Fire Property Resale Inspection Program", action: "add-required" },
      { id: "m3", documentName: "Fire Inspection (San Anselmo/Fairfax)", action: "add-required" },
      { id: "m4", documentName: "Sewer Lateral", action: "add-required" },
      { id: "m5", documentName: "Water Cert", action: "add-required" },
    ],
    transactionType: null,
  },
  {
    id: 10018,
    name: "When Dual Agency is Yes",
    kind: "conditional",
    triggers: [{ field: "dualAgency", value: "Yes" }],
    actions: [
      { id: "da1", documentName: "Buyer CMA", action: "add-required" },
      { id: "da2", documentName: "[BRBC] Buyer Representation and Broker Compensation Agreement", action: "add-required" },
      { id: "da3", documentName: "Buyer's Affirmation Regarding Other Representation Agreements", action: "add-required" },
      { id: "da4", documentName: "[BCA] Broker Compensation Advisory", action: "add-required" },
    ],
    transactionType: null,
  },
];

export const DOCUMENT_SET_LISTING_ID = 10001;
export const DOCUMENT_SET_BUYER_ID = 10002;
