import type { DocumentStatus, ProjectDocument } from "@/data/mockData";
import { cn } from "@/lib/utils";

export type DocumentChecklistSummary = {
  total: number;
  complete: number;
  outForSignature: number;
  needsSignature: number;
  pending: number;
};

export type ChecklistRowStyleInput = Pick<ProjectDocument, "status" | "customStatus">;

const COMPLETE_STATUSES = new Set<DocumentStatus>([
  "Completed",
  "Complete",
]);

const UPLOADED_STATUSES = new Set<DocumentStatus>([
  "Uploaded to Brokerage",
  "Uploaded",
]);

const NEEDS_SIG_STATUSES = new Set<DocumentStatus>([
  "Needs Buyer Signature",
  "Needs Seller Signature",
  "Needs Signature",
]);

/** Kathryn spreadsheet: row marked N/A (automation rules or manual). */
export function isChecklistDocNa(doc: ChecklistRowStyleInput): boolean {
  return doc.customStatus?.trim().toUpperCase() === "N/A";
}

export function documentChecklistSummary(
  docs: ChecklistRowStyleInput[],
): DocumentChecklistSummary {
  let complete = 0;
  let outForSignature = 0;
  let needsSignature = 0;
  let pending = 0;
  let total = 0;
  for (const d of docs) {
    if (isChecklistDocNa(d)) continue;
    total += 1;
    if (COMPLETE_STATUSES.has(d.status) || UPLOADED_STATUSES.has(d.status)) complete += 1;
    else if (d.status === "Out for Signature") outForSignature += 1;
    else if (NEEDS_SIG_STATUSES.has(d.status)) needsSignature += 1;
    else if (d.status === "Pending") pending += 1;
  }
  return {
    total,
    complete,
    outForSignature,
    needsSignature,
    pending,
  };
}

/**
 * Full-row Excel-style colors for the document checklist (Kathryn's spreadsheet legend).
 * Bright green = needs signature; pale green = out for signature; grays = done/uploaded; N/A = dark gray + strikethrough on name.
 */
export function checklistRowClass(doc: ChecklistRowStyleInput, options?: { selected?: boolean }): string {
  if (isChecklistDocNa(doc)) {
    return cn(
      "border-l-[3px] border-l-neutral-500",
      "bg-neutral-500/25 dark:bg-neutral-600/35",
      "text-muted-foreground",
      options?.selected && "ring-1 ring-inset ring-accent/40",
    );
  }

  const status = doc.status;
  let row = "transition-colors hover:brightness-[1.02]";

  if (NEEDS_SIG_STATUSES.has(status)) {
    row = cn(
      row,
      "border-l-[3px] border-l-green-600 dark:border-l-green-500",
      "bg-green-400/25 dark:bg-green-500/20",
    );
  } else if (status === "Out for Signature") {
    row = cn(
      row,
      "border-l-[3px] border-l-green-500/90",
      "bg-green-300/15 dark:bg-green-400/12",
    );
  } else if (UPLOADED_STATUSES.has(status)) {
    row = cn(
      row,
      "border-l-[3px] border-l-neutral-500",
      "bg-neutral-400/20 dark:bg-neutral-500/30",
    );
  } else if (COMPLETE_STATUSES.has(status)) {
    row = cn(
      row,
      "border-l-[3px] border-l-neutral-400",
      "bg-neutral-300/20 dark:bg-neutral-400/12",
    );
  } else if (status === "Signed — Needs Upload" || status === "Signed") {
    row = cn(
      row,
      "border-l-[3px] border-l-sky-500",
      "bg-sky-400/12 dark:bg-sky-500/15",
    );
  } else if (status === "Pending") {
    row = cn(row, "border-l-[3px] border-l-border", "bg-transparent");
  } else {
    row = cn(row, "border-l-[3px] border-l-muted-foreground/40", "bg-transparent");
  }

  if (options?.selected) {
    row = cn(row, "ring-1 ring-inset ring-accent/45");
  }

  return row;
}

/** Strikethrough document title when row is N/A (Excel "crossed out"). */
export function checklistDocNameClass(doc: ChecklistRowStyleInput): string {
  return isChecklistDocNa(doc) ? "line-through decoration-neutral-500/90" : "";
}

/** @deprecated Use checklistRowClass — left accent only. */
export function documentRowAccentClass(status: DocumentStatus): string {
  if (COMPLETE_STATUSES.has(status) || UPLOADED_STATUSES.has(status)) return "border-l-2 border-l-emerald-500";
  if (status === "Out for Signature") return "border-l-2 border-l-amber-500";
  if (NEEDS_SIG_STATUSES.has(status)) return "border-l-2 border-l-orange-500";
  if (status === "Signed — Needs Upload" || status === "Signed") return "border-l-2 border-l-sky-500";
  if (status === "Pending") return "border-l-2 border-l-border";
  return "border-l-2 border-l-muted-foreground/40";
}
