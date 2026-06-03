/** Tooltip copy for transaction form acronyms — edit here without touching layout. */
export type TransactionFieldHelp = {
  fullName: string;
  why: string;
  example?: string;
};

export const TX_FIELD_HELP = {
  docuSign: {
    fullName: "DocuSign e-sign",
    why: "Whether this file will use DocuSign for signatures instead of wet ink only.",
    example: "Yes when sending RPA addenda or disclosures electronically.",
  },
  spbbPct: {
    fullName: "Seller Paid Buyer Broker (SPBB) %",
    why: "Commission percentage the seller pays to the buyer’s broker. Drives disclosures and document rules.",
    example: "2.5",
  },
  ftc: {
    fullName: "FTC (fee / credit on file)",
    why: "Whether an FTC line item applies on this transaction. If yes, enter amount and who pays.",
    example: "Yes when your office tracks an FTC on the deal.",
  },
  ftcAmount: {
    fullName: "FTC amount",
    why: "Dollar amount for the FTC line item on this transaction.",
    example: "5000",
  },
  ftcPaidBy: {
    fullName: "FTC paid by",
    why: "Which party pays the FTC amount — used on summaries and coordinator notes.",
  },
  rpaSeller: {
    fullName: "Residential Purchase Agreement (RPA) — seller",
    why: "Seller name/vesting exactly as written on the signed RPA. Used to compare against title.",
    example: "John Smith and Jane Smith, Trustees of the Smith Family Trust…",
  },
  prelimSeller: {
    fullName: "Preliminary title report — seller",
    why: "Seller name/vesting exactly as shown on the preliminary title report (prelim).",
    example: "John A Smith and Jane B Smith, Trustees…",
  },
  sellerNameMatch: {
    fullName: "Seller name match",
    why: "Confirms RPA seller vesting matches the prelim. Auto-calculated; override only when you have a documented reason.",
  },
  nhdRpa: {
    fullName: "Natural Hazard Disclosure (NHD) — RPA terms",
    why: "NHD company and who orders/pays, as stated in the RPA (with or without environmental, etc.).",
    example: "ABC NHD — seller pays, with environmental",
  },
  escrowNumber: {
    fullName: "Escrow number",
    why: "Escrow file or order number from the escrow holder — used to label emails and documents.",
    example: "12365",
  },
  mlsNumber: {
    fullName: "Multiple Listing Service (MLS) #",
    why: "MLS listing identifier for the property. Numbers only.",
    example: "8566",
  },
  exemptSeller: {
    fullName: "Exempt seller",
    why: "Whether the seller qualifies for an exemption that affects disclosure requirements.",
  },
  hoa: {
    fullName: "Homeowners association (HOA)",
    why: "Whether the property is in an HOA. Affects HOA disclosures and some contingency dates.",
  },
  hoaOrderDetails: {
    fullName: "HOA order details",
    why: "Listing files: who orders HOA documents, dues, contact info, or special instructions.",
  },
  disclosureLink: {
    fullName: "Disclosure link",
    why: "URL where sellers/buyers can access property disclosures (vendor portal, Dropbox, etc.).",
  },
  targetOmd: {
    fullName: "Target on-market date (OMD)",
    why: "Listing: target date the property is expected to go on market.",
  },
  disclosureTiming: {
    fullName: "Disclosure timing",
    why: "Listing: when seller disclosures will be delivered (e.g. before offers, with marketing).",
  },
  questionnairesElectronically: {
    fullName: "Questionnaires electronically",
    why: "Listing: whether seller questionnaires will be sent/completed electronically.",
  },
  nhdCompany: {
    fullName: "NHD company",
    why: "Listing: vendor providing the Natural Hazard Disclosure report.",
  },
  nhdEnvironmental: {
    fullName: "NHD with environmental",
    why: "Listing: whether the NHD order includes environmental coverage (not just statutory hazards).",
  },
  emdToEscrow: {
    fullName: "Earnest money deposit (EMD) to escrow",
    why: "Deadline for the buyer’s earnest money to be deposited with escrow.",
  },
  estimatedCoe: {
    fullName: "Estimated close of escrow (COE)",
    why: "Target closing date — drives reminders and downstream checklist timing.",
  },
  reviewPrelim: {
    fullName: "Review of preliminary title — contingency removal",
    why: "Deadline to remove the contingency for reviewing the preliminary title report.",
  },
  reviewCommIntDiscl: {
    fullName: "Review of common interest disclosures — contingency removal",
    why: "HOA/common interest disclosure review deadline. N/A when there is no HOA.",
  },
  copIntoContract: {
    fullName: "COP — into contract",
    why: "Contingency for Sale of Buyer’s Property: deadline for buyer’s sale to go into contract.",
  },
  copCoe: {
    fullName: "COP — close of escrow",
    why: "Contingency for Sale of Buyer’s Property: deadline for buyer’s sale to close.",
  },
  sprpIntoContract: {
    fullName: "SPRP — into contract",
    why: "Seller purchase of replacement property: deadline for seller’s replacement purchase to go into contract.",
  },
  sprpCoe: {
    fullName: "SPRP — close of escrow",
    why: "Seller purchase of replacement property: deadline for seller’s replacement purchase to close.",
  },
} as const satisfies Record<string, TransactionFieldHelp>;
