import type { Project } from "@/data/mockData";
import { formatUsdDisplay, formatPercentDisplay } from "@/lib/displayFormat";
import { resolveEffectiveSellerMatchLabel } from "@/lib/sellerNameMatch";
import { buildOverviewTimelineRows, type TimelineOverviewRow } from "@/lib/transactionTimelineFields";

export type OverviewDetailRow = { label: string; value: string };

export type { TimelineOverviewRow };

function asRecord(v: unknown): Record<string, unknown> | null {
  if (v && typeof v === "object" && !Array.isArray(v)) return v as Record<string, unknown>;
  return null;
}

function str(v: unknown): string {
  if (typeof v === "string") return v.trim();
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  return "";
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

  push(row("Purchase price", formatUsdDisplay(str(t.purchasePrice)) || str(t.purchasePrice)));
  push(row("DocuSign", yesNo(t.docuSign)));
  push(row("Loan type", str(t.loanType)));
  push(row("SPBB %", formatPercentDisplay(str(t.spbbPct)) || str(t.spbbPct)));
  push(row("FTC", yesNo(t.ftc)));
  push(row("FTC amount", formatUsdDisplay(str(t.ftcAmount)) || str(t.ftcAmount)));
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
  const listingMatch = resolveEffectiveSellerMatchLabel(
    str(l.sellerMatchOverride),
    str(l.sellerOnListingAgreement),
    str(l.sellerOnPrelim),
  );
  if (listingMatch !== "Pending" || str(l.sellerOnListingAgreement) || str(l.sellerOnPrelim)) {
    push({ label: "Seller name match", value: listingMatch });
  }
  if (listingMatch === "No") {
    push(row("Mismatch notes", str(l.sellerMismatchNotes)));
  }
  push(row("DocuSign", yesNo(l.docuSign)));
  push(row("NHD company", str(l.nhdCompany)));
  if (l.nhdEnvironmental === true) push({ label: "NHD environmental", value: "Yes" });

  return rows;
}

export function getTransactionTimelineRows(
  metadata: Record<string, unknown> | undefined,
  deadlines: Project["deadlines"] = [],
): TimelineOverviewRow[] {
  return buildOverviewTimelineRows(metadata, deadlines);
}
