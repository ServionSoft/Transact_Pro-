export type CompassSeedPhase = "listing_pre_contract" | "listing_post_contract" | "buyer_all";

export type CompassTaskStage =
  | "Listing Prep"
  | "Listing Complete"
  | "In Escrow"
  | "Ready to Close"
  | "Closed";

export type CompassTaskTemplate = {
  key: string;
  title: string;
  section: string;
  sortOrder: number;
  taskType: "general" | "email";
  emailTemplateKey?: string;
  instructionUrl?: string;
  defaultStage: CompassTaskStage;
  phases: CompassSeedPhase[];
};

function listing(
  key: string,
  title: string,
  section: string,
  sortOrder: number,
  phases: CompassSeedPhase[],
  opts?: {
    taskType?: "general" | "email";
    emailTemplateKey?: string;
    instructionUrl?: string;
    defaultStage?: CompassTaskStage;
  },
): CompassTaskTemplate {
  return {
    key: `compass_listing:${key}`,
    title,
    section,
    sortOrder,
    taskType: opts?.taskType ?? "general",
    emailTemplateKey: opts?.emailTemplateKey,
    instructionUrl: opts?.instructionUrl,
    defaultStage: opts?.defaultStage ?? (phases.includes("listing_post_contract") ? "In Escrow" : "Listing Prep"),
    phases,
  };
}

function buyer(
  key: string,
  title: string,
  section: string,
  sortOrder: number,
  opts?: {
    taskType?: "general" | "email";
    emailTemplateKey?: string;
    instructionUrl?: string;
    defaultStage?: CompassTaskStage;
  },
): CompassTaskTemplate {
  return {
    key: `compass_buyer:${key}`,
    title,
    section,
    sortOrder,
    taskType: opts?.taskType ?? "general",
    emailTemplateKey: opts?.emailTemplateKey,
    instructionUrl: opts?.instructionUrl,
    defaultStage: opts?.defaultStage ?? "In Escrow",
    phases: ["buyer_all"],
  };
}

/** Compass Listing task list — source: Task List - Listings (Compass).pdf */
export const COMPASS_LISTING_TASKS: CompassTaskTemplate[] = [
  listing("L01", "New Listing — open instructions", "New Listing", 10, ["listing_pre_contract"], {
    instructionUrl: "https://docs.google.com/",
  }),
  listing("L02", "Enter New Listing Information", "New Listing", 20, ["listing_pre_contract"]),
  listing("L03", "Link Business Tracker folder to the address above", "New Listing", 30, ["listing_pre_contract"]),
  listing("L04", "Review listing docs, note items missing or needing correction", "New Listing", 40, ["listing_pre_contract"]),
  listing("L05", "Enter Answers to Listing Questions", "New Listing", 50, ["listing_pre_contract"]),
  listing("L06", "Check Prelim — Seller info matches what is on the RLA", "New Listing", 60, ["listing_pre_contract"]),
  listing("L07", "Set up Checklist", "New Listing", 70, ["listing_pre_contract"]),
  listing("L08", "Send listing questions to agent", "New Listing", 80, ["listing_pre_contract"], {
    taskType: "email",
    emailTemplateKey: "listing_questions_agent",
  }),
  listing("L09", "Open pre-escrow and request prelim", "New Listing", 90, ["listing_pre_contract"], {
    taskType: "email",
    emailTemplateKey: "new_pre_escrow",
  }),
  listing("L10", "Order NHD", "New Listing", 100, ["listing_pre_contract"]),

  listing(
    "L11",
    "Create Seller Disclosure Packet in Glide and add any missing listing disclosures",
    "Seller Disclosure Packet",
    110,
    ["listing_pre_contract"],
  ),
  listing(
    "L12",
    "Email intro to client with preview of disclosures to fill out",
    "Seller Disclosure Packet",
    120,
    ["listing_pre_contract"],
    { taskType: "email", emailTemplateKey: "listing_disclosure_intro_client" },
  ),
  listing("L13", "Send docs to Seller to fill out", "Seller Disclosure Packet", 130, ["listing_pre_contract"], {
    taskType: "email",
    emailTemplateKey: "listing_disclosures_to_fill_out",
  }),
  listing(
    "L14",
    "Email Additional Disclosures to Seller to Review",
    "Seller Disclosure Packet",
    140,
    ["listing_pre_contract"],
    { taskType: "email", emailTemplateKey: "listing_additional_disclosures_seller" },
  ),
  listing("L15", "Send docs to Seller for signature", "Seller Disclosure Packet", 150, ["listing_pre_contract"]),
  listing("L16", "Order HOA docs", "Seller Disclosure Packet", 160, ["listing_pre_contract"], {
    taskType: "email",
    emailTemplateKey: "hoa_document_request",
  }),
  listing(
    "L17",
    "Send Disclosure link and list of remaining items to agent",
    "Seller Disclosure Packet",
    170,
    ["listing_pre_contract"],
    { taskType: "email", emailTemplateKey: "listing_disclosure_link_agent" },
  ),
  listing("L18", "Send Disclosure link to BA/TC for Buyer's signature", "Seller Disclosure Packet", 180, ["listing_pre_contract"], {
    taskType: "email",
    emailTemplateKey: "seller_disclosures_batc",
  }),
  listing("L19", "Audit and Upload Buyer signed docs", "Seller Disclosure Packet", 190, ["listing_pre_contract"], {
    instructionUrl: "https://docs.google.com/",
  }),
  listing("L20", "Request any missing disclosures from BATC", "Seller Disclosure Packet", 200, ["listing_pre_contract"], {
    taskType: "email",
    emailTemplateKey: "missing_buyer_signed_batc",
  }),

  listing("L21", "New Contract/Accepted Offer — open instructions", "Remaining Contract Items and Disclosures", 210, ["listing_post_contract"], {
    instructionUrl: "https://docs.google.com/",
  }),
  listing("L22", "Create timeline", "Timeline", 220, ["listing_post_contract"]),
  listing("L23", "Send timeline to escrow, other agent/ask if TC", "Timeline", 230, ["listing_post_contract"], {
    taskType: "email",
    emailTemplateKey: "timeline_parties",
  }),
  listing("L24", "Send timeline to client/agent", "Timeline", 240, ["listing_post_contract"], {
    taskType: "email",
    emailTemplateKey: "timeline_email_seller",
  }),
  listing("L25", "Add timeline to Calendar", "Timeline", 250, ["listing_post_contract"]),

  listing("L26", "Review signed documents to ensure completion", "Business Tracker", 260, ["listing_post_contract"]),
  listing("L27", "Upload Listing Disclosures to BT and Drive, Audit BT Listing Checklist", "Business Tracker", 270, ["listing_post_contract"]),
  listing("L28", "Upload signed SDP to GDP/DIO and update spreadsheet", "Business Tracker", 280, ["listing_post_contract"]),
  listing("L29", "Duplicate this Spreadsheet Tab and Rename for Escrow", "Business Tracker", 290, ["listing_post_contract"]),
  listing(
    "L30",
    "Add to Escrow Snapshot with links to Next Step, Next Step Date, COE date",
    "Business Tracker",
    300,
    ["listing_post_contract"],
  ),
  listing("L31", "Review Signed Documents for Completion, Upload to Drive, Update Spreadsheet", "Business Tracker", 310, ["listing_post_contract"]),
  listing("L32", "Enter info from contract, emails, and MLS", "Business Tracker", 320, ["listing_post_contract"]),
  listing("L33", "Enter Escrow and TC fee into Commission tab", "Business Tracker", 330, ["listing_post_contract"]),
  listing("L34", "Upload Contract Docs to Business Tracker", "Business Tracker", 340, ["listing_post_contract"]),
  listing(
    "L35",
    "Send NHD Invoice to Escrow Officer if different from Pre-Escrow Officer",
    "Business Tracker",
    350,
    ["listing_post_contract"],
    { taskType: "email", emailTemplateKey: "nhd_invoice_escrow" },
  ),
  listing("L36", "Add Accepted Offer to Business Tracker", "Business Tracker", 360, ["listing_post_contract"]),
  listing("L37", "File Audit", "Business Tracker", 370, ["listing_post_contract"]),
  listing("L38", "Contingency Removals and Negotiation Forms Completed", "Business Tracker", 380, ["listing_post_contract"]),
  listing("L39", "Order Home Warranty", "Business Tracker", 390, ["listing_post_contract"]),
  listing("L40", "Add Home Warranty fee to Business Tracker Commissions if our agent is paying", "Business Tracker", 400, ["listing_post_contract"], {
    taskType: "email",
    emailTemplateKey: "warranty_commission_compass",
  }),
  listing("L41", "Upload all but final documents into Business Tracker", "Business Tracker", 410, ["listing_post_contract"]),
  listing("L42", "Brochures and Templates", "Business Tracker", 420, ["listing_post_contract"], {
    instructionUrl: "https://docs.google.com/",
  }),

  listing("L43", "Remind of Verification of Property Condition", "Closing", 430, ["listing_post_contract"], {
    defaultStage: "Ready to Close",
    taskType: "email",
    emailTemplateKey: "vp_reminder",
  }),
  listing("L44", "Send file link to client and copy agent", "Closing", 440, ["listing_post_contract"], {
    defaultStage: "Ready to Close",
    taskType: "email",
    emailTemplateKey: "closing_file_email",
  }),
  listing("L45", "Upload Closing Docs / Final File Audit", "Closing", 450, ["listing_post_contract"], {
    defaultStage: "Ready to Close",
  }),
  listing("L46", "Turn off Disclosure packet sharing / Archive in Glide", "Closing", 460, ["listing_post_contract"], {
    defaultStage: "Closed",
  }),
  listing("L47", "Delete Listing tab for this property and move to closed on Snapshot", "Closing", 470, ["listing_post_contract"], {
    defaultStage: "Closed",
  }),
  listing("L48", "Upload Documents", "Closing", 480, ["listing_post_contract"], { defaultStage: "Closed" }),
];

/** Compass Buyer File task list — source: Task List - Buyer Files (Compass).pdf */
export const COMPASS_BUYER_TASKS: CompassTaskTemplate[] = [
  buyer("B01", "Opening a New File — open instructions", "New Contract / Opening", 10, {
    instructionUrl: "https://docs.google.com/",
  }),
  buyer("B02", "Enter New Buyer File Information", "New Contract / Opening", 20),
  buyer("B03", "Review Signed Documents for Completion, Update Spreadsheet", "New Contract / Opening", 30),
  buyer("B04", "Set up Checklist", "New Contract / Opening", 40),
  buyer("B05", "Link Business Tracker folder", "New Contract / Opening", 50),
  buyer("B06", "Add Accepted Offer to Business Tracker", "New Contract / Opening", 60),
  buyer("B07", "Upload Initial Contract Docs", "New Contract / Opening", 70),
  buyer("B08", "Enter Escrow and TC fee into Commission tab", "New Contract / Opening", 80),
  buyer("B09", "Look up/request disclosures from LA/TC", "New Contract / Opening", 90, {
    taskType: "email",
    emailTemplateKey: "missing_disclosure_request_la_tc",
  }),
  buyer("B10", "Enter details from emails, contract, and MLS", "New Contract / Opening", 100),
  buyer("B11", "Email \"Notes and Questions\" to Buyer's Agent", "New Contract / Opening", 110, {
    taskType: "email",
    emailTemplateKey: "notes_questions_ba",
  }),

  buyer("B12", "Send Disclosures to Buyer — open instructions", "Remaining Contract Items and Disclosures", 120, {
    instructionUrl: "https://docs.google.com/",
  }),
  buyer("B13", "Review Seller disclosure packet and request any missing items/corrections", "Remaining Contract Items and Disclosures", 130, {
    taskType: "email",
    emailTemplateKey: "missing_disclosure_request_la_tc",
  }),
  buyer("B14", "Send to Buyer for review", "Remaining Contract Items and Disclosures", 140, {
    taskType: "email",
    emailTemplateKey: "buyer_disclosures_separate_packet",
  }),
  buyer("B15", "Send to Buyer for signature", "Remaining Contract Items and Disclosures", 150, {
    taskType: "email",
    emailTemplateKey: "buyer_disclosures_separate_additional",
  }),
  buyer("B16", "Download and Review for Completion", "Remaining Contract Items and Disclosures", 160),
  buyer("B17", "Send Buyer signed docs to LA/TC from email draft", "Remaining Contract Items and Disclosures", 170, {
    taskType: "email",
    emailTemplateKey: "buyer_signed_docs_la_tc",
  }),
  buyer("B18", "Prep email to send Buyer signed docs to LA/TC", "Remaining Contract Items and Disclosures", 180, {
    taskType: "email",
    emailTemplateKey: "buyer_signed_disclosures_la_tc",
  }),
  buyer("B19", "Add in additional disclosures needed from our side (brokerage disclosures, etc.)", "Remaining Contract Items and Disclosures", 190),
  buyer("B20", "Audit and Upload Buyer Signed Disclosures", "Remaining Contract Items and Disclosures", 200, {
    instructionUrl: "https://docs.google.com/",
  }),
  buyer("B21", "Upload to BT, Drive, and Update Spreadsheet", "Remaining Contract Items and Disclosures", 210),
  buyer("B22", "File Audit", "Remaining Contract Items and Disclosures", 220),
  buyer("B23", "Contingency Removals and Negotiation Forms Completed", "Remaining Contract Items and Disclosures", 230),
  buyer("B24", "Order Home Warranty", "Remaining Contract Items and Disclosures", 240),
  buyer("B25", "Add Home Warranty Fee to Business Tracker Commissions if our agent is paying", "Remaining Contract Items and Disclosures", 250, {
    taskType: "email",
    emailTemplateKey: "warranty_commission_compass",
  }),
  buyer("B26", "Upload all but final documents into Business Tracker", "Remaining Contract Items and Disclosures", 260),
  buyer("B27", "Brochures and Templates", "Remaining Contract Items and Disclosures", 270, {
    instructionUrl: "https://docs.google.com/",
  }),

  buyer("B28", "Create timeline", "Timeline", 280),
  buyer("B29", "Send timeline to escrow, other agent/ask if TC", "Timeline", 290, {
    taskType: "email",
    emailTemplateKey: "timeline_parties",
  }),
  buyer("B30", "Send timeline to client/agent", "Timeline", 300, {
    taskType: "email",
    emailTemplateKey: "timeline_client",
  }),
  buyer("B31", "Add timeline to Calendar", "Timeline", 310),

  buyer("B32", "Close out File — open instructions", "Closing", 320, {
    instructionUrl: "https://docs.google.com/",
    defaultStage: "Ready to Close",
  }),
  buyer("B33", "Remind of Verification of Property Condition", "Closing", 330, {
    defaultStage: "Ready to Close",
    taskType: "email",
    emailTemplateKey: "vp_reminder",
  }),
  buyer("B34", "Send file link to client and copy agent", "Closing", 340, {
    defaultStage: "Ready to Close",
    taskType: "email",
    emailTemplateKey: "closing_file_email",
  }),
  buyer("B35", "Upload Closing Docs / Final File Audit", "Closing", 350, { defaultStage: "Ready to Close" }),
  buyer("B36", "Archive in Glide", "Closing", 360, { defaultStage: "Closed" }),
  buyer("B37", "Upload Documents to Appropriate Folders", "Closing", 370, { defaultStage: "Closed" }),
];

export function getCompassTasksForPhase(
  transactionType: "Listing" | "Buyer File",
  phase: CompassSeedPhase,
): CompassTaskTemplate[] {
  if (transactionType === "Buyer File") {
    return COMPASS_BUYER_TASKS;
  }
  return COMPASS_LISTING_TASKS.filter((t) => t.phases.includes(phase));
}
