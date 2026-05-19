import type { EmailThread } from "@/data/mockData";

export function directionBadgeClass(direction: EmailThread["direction"]): string {
  return direction === "outbound"
    ? "bg-info/15 text-info border-info/30"
    : "bg-success/15 text-success border-success/30";
}

export function deliveryBadgeClass(status: NonNullable<EmailThread["deliveryStatus"]> | "sent"): string {
  if (status === "sent") return "bg-success/15 text-success border-success/30";
  if (status === "pending") return "bg-secondary text-muted-foreground border-border";
  return "bg-destructive/15 text-destructive border-destructive/30";
}
