import type { Project } from "@/data/mockData";

export type OverviewDetailRow = { label: string; value: string };

export type TimelineOverviewRow = {
  title: string;
  value: string;
  sortDate: number | null;
  isTextField?: boolean;
};

function asRecord(v: unknown): Record<string, unknown> | null {
  if (v && typeof v === "object" && !Array.isArray(v)) return v as Record<string, unknown>;
  return null;
}

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function yesNo(v: unknown): string {
  if (v === "yes") return "Yes";
  if (v === "no") return "No";
  return "";
}

function row(label: string, value: string): OverviewDetailRow | null {
  const v = value.trim();
  if (!v) return null;
  return { label, value: v };
}

function parseSortDate(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const iso = /^\d{4}-\d{2}-\d{2}$/.test(trimmed);
  const d = new Date(trimmed);
  if (Number.isNaN(d.getTime())) return null;
  if (iso) return d.getTime();
  const slash = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (slash) {
    const year = slash[3]!.length === 2 ? 2000 + Number(slash[3]) : Number(slash[3]);
    const parsed = new Date(year, Number(slash[1]) - 1, Number(slash[2]));
    return Number.isNaN(parsed.getTime()) ? null : parsed.getTime();
  }
  return d.getTime();
}

const FORM_MANAGED_TITLES = new Set([
  "Contract Date",
  "Acceptance Date",
  "Preapproval",
  "Verification of Funds",
  "EMD to Escrow",
  "Seller Disclosures to Buyer",
  "Investigation Contingency Removal",
  "Insurance Contingency Removal",
  "Review of Seller Docs Contingency Removal",
  "Review of Prelim Contingency Removal",
  "Review of Comm Int Discl Contingency Removal",
  "Appraisal Contingency Removal",
  "Loan Contingency Removal",
  "Estimated COE",
  "COP — Into Contract",
  "COP — COE",
  "SPRP — Into Contract",
  "SPRP — COE",
]);

export function getPropertyDetailRows(
  metadata: Record<string, unknown> | undefined,
  project: Pick<Project, "propertyAddress" | "propertyType" | "yearBuilt" | "listPrice" | "representationSide" | "type">,
): OverviewDetailRow[] {
  const p = asRecord(metadata?.property);
  const rows: OverviewDetailRow[] = [];

  const push = (r: OverviewDetailRow | null) => {
    if (r) rows.push(r);
  };

  push(row("Address", project.propertyAddress));
  push(row("MLS #", str(p?.mlsNumber)));
  push(row("Property type", str(p?.propertyType) || project.propertyType || ""));
  push(row("City", str(p?.city)));
  push(row("State", str(p?.state)));
  push(row("ZIP", str(p?.zip)));
  push(row("County", str(p?.county)));
  push(row("Year built", str(p?.yearBuilt) || project.yearBuilt || ""));
  push(row("Lot size", str(p?.lotSize)));
  push(row("Square feet", str(p?.squareFeet)));
  push(row("Disclosure link", str(p?.disclosureLink)));
  push(row("Exempt seller", yesNo(p?.exemptSeller)));
  push(row("Solar", yesNo(p?.solar)));
  push(row("Well", yesNo(p?.well)));
  push(row("Septic", yesNo(p?.septic)));
  push(row("HOA", yesNo(p?.hoa)));
  push(row("HOA order details", str(p?.hoaOrderDetails)));
  push(row("Tenant occupied", yesNo(p?.tenantOccupied)));
  push(row("List price", project.listPrice || ""));
  push(row("Representation", project.representationSide || ""));

  return rows;
}

export function getTransactionDetailRows(metadata: Record<string, unknown> | undefined): OverviewDetailRow[] {
  const t = asRecord(metadata?.transaction);
  if (!t) return [];

  const rows: OverviewDetailRow[] = [];
  const push = (r: OverviewDetailRow | null) => {
    if (r) rows.push(r);
  };

  push(row("Purchase price", str(t.purchasePrice)));
  push(row("DocuSign", yesNo(t.docuSign)));
  push(row("Loan type", str(t.loanType)));
  push(row("SPBB %", str(t.spbbPct)));
  push(row("FTC", yesNo(t.ftc)));
  push(row("FTC amount", str(t.ftcAmount)));
  push(row("FTC paid by", str(t.ftcPaidBy)));
  push(row("RPA seller", str(t.rpaSeller)));
  push(row("Prelim seller", str(t.prelimSeller)));
  push(row("Seller name match", yesNo(t.sellerMatchOverride)));
  push(row("Mismatch notes", str(t.sellerMismatchNotes)));
  push(row("NHD details (RPA)", str(t.nhdRpa)));
  push(row("Home warranty", str(t.homeWarranty)));
  push(row("Escrow #", str(t.escrowNumber)));
  push(row("Notes", str(t.notes)));

  return rows;
}

export function getListingDetailRows(metadata: Record<string, unknown> | undefined): OverviewDetailRow[] {
  const l = asRecord(metadata?.listing);
  if (!l) return [];

  const rows: OverviewDetailRow[] = [];
  const push = (r: OverviewDetailRow | null) => {
    if (r) rows.push(r);
  };

  push(row("Target OMD", str(l.targetOMD)));
  push(row("Disclosure timing", str(l.disclosureTiming)));
  push(row("Questionnaires electronically", yesNo(l.questionnairesElectronically)));
  push(row("Seller on listing agreement", str(l.sellerOnListingAgreement)));
  push(row("Seller on prelim", str(l.sellerOnPrelim)));
  push(row("DocuSign", yesNo(l.docuSign)));
  push(row("NHD company", str(l.nhdCompany)));
  if (l.nhdEnvironmental === true) push({ label: "NHD environmental", value: "Yes" });

  return rows;
}

export function getTransactionTimelineRows(
  metadata: Record<string, unknown> | undefined,
  deadlines: Project["deadlines"] = [],
): TimelineOverviewRow[] {
  const tl = asRecord(metadata?.timeline);
  const rows: TimelineOverviewRow[] = [];
  const seenTitles = new Set<string>();

  const pushDate = (title: string, raw: unknown) => {
    const value = str(raw);
    if (!value) return;
    seenTitles.add(title);
    rows.push({ title, value, sortDate: parseSortDate(value) });
  };

  if (tl) {
    pushDate("Contract Date", tl.contractDate);
    pushDate("Acceptance Date", tl.acceptanceDate);
    pushDate("Preapproval", tl.preapproval);
    pushDate("Verification of Funds", tl.verificationOfFunds);
    pushDate("EMD to Escrow", tl.emdToEscrow);
    pushDate("Estimated COE", tl.estimatedCOE);
    pushDate("Seller Disclosures to Buyer", tl.sellerDisclosuresToBuyer);
    pushDate("Investigation Contingency Removal", tl.investigationContingency);
    pushDate("Insurance Contingency Removal", tl.insuranceContingency);
    pushDate("Review of Seller Docs Contingency Removal", tl.reviewSellerDocs);
    pushDate("Review of Prelim Contingency Removal", tl.reviewPrelim);
    pushDate("Review of Comm Int Discl Contingency Removal", tl.reviewCommIntDiscl);
    pushDate("Appraisal Contingency Removal", tl.appraisalContingency);
    pushDate("Loan Contingency Removal", tl.loanContingency);

    const vpc = str(tl.verificationOfPropertyCondition);
    if (vpc) {
      seenTitles.add("Verification of Property Condition");
      rows.push({ title: "Verification of Property Condition", value: vpc, sortDate: null, isTextField: true });
    }
    const possession = str(tl.possession);
    if (possession) {
      seenTitles.add("Possession");
      rows.push({ title: "Possession", value: possession, sortDate: null, isTextField: true });
    }
  }

  if (metadata?.showCOP === true) {
    const cop = asRecord(metadata.cop);
    if (cop) {
      pushDate("COP — Into Contract", cop.intoContract);
      pushDate("COP — COE", cop.coe);
    }
  }

  if (metadata?.showSPRP === true) {
    const sprp = asRecord(metadata.sprp);
    if (sprp) {
      pushDate("SPRP — Into Contract", sprp.intoContract);
      pushDate("SPRP — COE", sprp.coe);
    }
  }

  for (const d of deadlines) {
    const title = d.title?.trim();
    const date = d.date?.trim();
    if (!title || !date) continue;
    if (FORM_MANAGED_TITLES.has(title) && seenTitles.has(title)) continue;
    if (seenTitles.has(title)) continue;
    seenTitles.add(title);
    rows.push({
      title,
      value: date,
      sortDate: parseSortDate(date),
    });
  }

  const dated = rows.filter((r) => r.sortDate !== null && !r.isTextField);
  const undated = rows.filter((r) => r.sortDate === null && !r.isTextField);
  const text = rows.filter((r) => r.isTextField);

  dated.sort((a, b) => (a.sortDate ?? 0) - (b.sortDate ?? 0));

  return [...dated, ...undated, ...text];
}
