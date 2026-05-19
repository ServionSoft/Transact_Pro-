import type { DocumentStatus, ProjectDocument } from "@/data/mockData";

export type DocumentChecklistSummary = {
  total: number;
  complete: number;
  outForSignature: number;
  needsSignature: number;
  pending: number;
};

const COMPLETE_STATUSES = new Set<DocumentStatus>([
  "Completed",
  "Complete",
  "Uploaded to Brokerage",
  "Uploaded",
]);

const NEEDS_SIG_STATUSES = new Set<DocumentStatus>([
  "Needs Buyer Signature",
  "Needs Seller Signature",
  "Needs Signature",
]);

export function documentChecklistSummary(
  docs: Pick<ProjectDocument, "status">[],
): DocumentChecklistSummary {
  let complete = 0;
  let outForSignature = 0;
  let needsSignature = 0;
  let pending = 0;
  for (const d of docs) {
    if (COMPLETE_STATUSES.has(d.status)) complete += 1;
    else if (d.status === "Out for Signature") outForSignature += 1;
    else if (NEEDS_SIG_STATUSES.has(d.status)) needsSignature += 1;
    else if (d.status === "Pending") pending += 1;
  }
  return {
    total: docs.length,
    complete,
    outForSignature,
    needsSignature,
    pending,
  };
}

/** Left accent on checklist rows by document status. */
export function documentRowAccentClass(status: DocumentStatus): string {
  if (COMPLETE_STATUSES.has(status)) return "border-l-2 border-l-emerald-500";
  if (status === "Out for Signature") return "border-l-2 border-l-amber-500";
  if (NEEDS_SIG_STATUSES.has(status)) return "border-l-2 border-l-orange-500";
  if (status === "Signed — Needs Upload" || status === "Signed") return "border-l-2 border-l-sky-500";
  if (status === "Pending") return "border-l-2 border-l-border";
  return "border-l-2 border-l-muted-foreground/40";
}
