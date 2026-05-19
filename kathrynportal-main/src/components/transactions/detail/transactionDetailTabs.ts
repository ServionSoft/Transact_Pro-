import type { LucideIcon } from "lucide-react";
import { Calendar, CheckSquare, FileText, Mail, MessageSquare, Paperclip } from "lucide-react";

export type TransactionDetailTabId =
  | "overview"
  | "documents"
  | "attachments"
  | "tasks"
  | "emails"
  | "notes"
  | "calendar";

export type TransactionDetailTab = {
  id: TransactionDetailTabId;
  label: string;
  icon: LucideIcon;
};

export const TRANSACTION_DETAIL_TABS: TransactionDetailTab[] = [
  { id: "overview", label: "Overview", icon: FileText },
  { id: "documents", label: "Document Checklist", icon: CheckSquare },
  { id: "attachments", label: "Stored Documents", icon: Paperclip },
  { id: "tasks", label: "Tasks", icon: CheckSquare },
  { id: "emails", label: "Emails", icon: Mail },
  { id: "notes", label: "Notes", icon: MessageSquare },
  { id: "calendar", label: "Timeline", icon: Calendar },
];
