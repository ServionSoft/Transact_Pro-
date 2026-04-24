import { cn } from "@/lib/utils";
import type { DocumentStatus, ProjectStage, ClientStatus } from "@/data/mockData";

const docStatusStyles: Record<DocumentStatus, string> = {
  "Pending": "bg-muted text-muted-foreground",
  "Needs Buyer Signature": "bg-status-needs-sig/15 text-status-needs-sig",
  "Needs Seller Signature": "bg-status-needs-sig/15 text-status-needs-sig",
  "Out for Signature": "bg-status-out-sig/15 text-status-out-sig",
  "Signed — Needs Upload": "bg-status-signed/15 text-status-signed",
  "Uploaded to Brokerage": "bg-status-uploaded/15 text-status-uploaded",
  "Completed": "bg-status-complete/15 text-status-complete",
  "Other": "bg-secondary text-secondary-foreground",
  "Needs Signature": "bg-status-needs-sig/15 text-status-needs-sig",
  "Signed": "bg-status-signed/15 text-status-signed",
  "Uploaded": "bg-status-uploaded/15 text-status-uploaded",
  "Complete": "bg-status-complete/15 text-status-complete",
};

const stageStyles: Record<ProjectStage, string> = {
  "Listing Prep": "bg-info/15 text-info",
  "Listing Complete": "bg-accent/15 text-accent-foreground",
  "In Escrow": "bg-status-uploaded/15 text-status-uploaded",
  "Ready to Close": "bg-status-needs-sig/15 text-status-needs-sig",
  "Closed": "bg-status-complete/15 text-status-complete",
};

const clientStatusStyles: Record<ClientStatus, string> = {
  "Active": "bg-status-complete/15 text-status-complete",
  "Inactive": "bg-muted text-muted-foreground",
  "Prospect": "bg-info/15 text-info",
};

interface StatusBadgeProps {
  status: DocumentStatus | ProjectStage | ClientStatus;
  type?: "document" | "stage" | "client";
  className?: string;
}

export default function StatusBadge({ status, type = "document", className }: StatusBadgeProps) {
  const styles =
    type === "stage"
      ? stageStyles[status as ProjectStage]
      : type === "client"
      ? clientStatusStyles[status as ClientStatus]
      : docStatusStyles[status as DocumentStatus];

  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap",
        styles,
        className
      )}
    >
      {status}
    </span>
  );
}
