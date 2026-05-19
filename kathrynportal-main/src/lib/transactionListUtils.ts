import type { ProjectListItem } from "@/api/projects";
import type { ProjectStage } from "@/data/mockData";

export const TRANSACTION_STAGES: (ProjectStage | "All")[] = [
  "All",
  "Listing Prep",
  "Listing Complete",
  "In Escrow",
  "Ready to Close",
  "Closed",
];

export const KANBAN_STAGES: ProjectStage[] = [
  "Listing Prep",
  "Listing Complete",
  "In Escrow",
  "Ready to Close",
  "Closed",
];

export function propertyStreet(address: string): string {
  return address.split(",")[0]?.trim() || address;
}

export function propertySubline(address: string): string {
  return address.split(",").slice(1).join(",").trim();
}

export function isBuyerTransaction(type: string): boolean {
  return type === "Buyer File" || type === "Buyer Representation";
}

export function transactionTypeLabel(type: string): "Buyer File" | "Listing" {
  return isBuyerTransaction(type) ? "Buyer File" : "Listing";
}

export function dueDateBucket(dateStr: string): "overdue" | "today" | "week" | "later" | "none" {
  const trimmed = dateStr?.trim() ?? "";
  if (!trimmed) return "none";
  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const d = new Date(trimmed);
  if (Number.isNaN(d.getTime())) return "none";
  const dueStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.floor((dueStart.getTime() - todayStart.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return "overdue";
  if (diffDays === 0) return "today";
  if (diffDays <= 7) return "week";
  return "later";
}

export function dueDateClass(bucket: ReturnType<typeof dueDateBucket>): string {
  switch (bucket) {
    case "overdue":
      return "text-destructive font-semibold";
    case "today":
      return "text-accent-foreground font-semibold";
    case "week":
      return "text-foreground font-medium";
    default:
      return "text-muted-foreground";
  }
}

export function docProgressPercent(project: Pick<ProjectListItem, "documentsCompleteCount" | "documentsTotalCount">): number {
  const total = project.documentsTotalCount;
  if (total <= 0) return 0;
  return Math.min(100, Math.round((project.documentsCompleteCount / total) * 100));
}

export function filterTransactions(
  rows: ProjectListItem[],
  search: string,
  filterStage: string,
): ProjectListItem[] {
  const q = search.toLowerCase().trim();
  return rows.filter((p) => {
    const matchSearch =
      !q ||
      p.name.toLowerCase().includes(q) ||
      p.clientName.toLowerCase().includes(q) ||
      p.propertyAddress.toLowerCase().includes(q);
    const matchStage = filterStage === "All" || p.stage === filterStage;
    return matchSearch && matchStage;
  });
}

export const STAGE_PILL_COLORS: Record<ProjectStage, string> = {
  "Listing Prep": "bg-info/15 text-info border-info/30",
  "Listing Complete": "bg-primary/15 text-primary border-primary/30",
  "In Escrow": "bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30",
  "Ready to Close": "bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/30",
  Closed: "bg-success/15 text-success border-success/30",
};
