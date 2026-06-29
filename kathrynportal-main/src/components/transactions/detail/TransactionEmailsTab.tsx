import { useEffect, useMemo, useState } from "react";
import { Mail, Reply, Trash2 } from "lucide-react";
import type { EmailThread, Project } from "@/data/mockData";
import type { EmailComposeDraft } from "@/types/emailCompose";
import { listEmailTemplatesFromApi } from "@/api/emailTemplates";
import EmailComposePanel from "@/components/email/EmailComposePanel";
import EmailThreadBody from "@/components/email/EmailThreadBody";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { applyEmailTemplateToCompose } from "@/lib/emailTemplateTokens";
import { getApiBaseUrl } from "@/lib/apiConfig";
import type { TransactionRecipientSuggestion } from "@/lib/transactionRecipientSuggestions";
import { useAppStore } from "@/store/appStore";
import { listPageBodyClass, transactionTabCardClass } from "@/lib/listPageLayout";
import { emailBodyLooksLikeHtml } from "@/lib/emailHtmlUtils";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Props = {
  project: Project;
  emails: EmailThread[];
  suggestions: TransactionRecipientSuggestion[];
  showCompose: boolean;
  onToggleCompose: () => void;
  composeDraft: EmailComposeDraft;
  onComposeDraftChange: (draft: EmailComposeDraft) => void;
  onSend: () => void;
  onCancelCompose: () => void;
  onReply: (email: EmailThread) => void;
  onDeleteEmail: (emailId: string) => void;
  canDelete: boolean;
  sending?: boolean;
};

function directionBadgeClass(direction: EmailThread["direction"]): string {
  return direction === "outbound"
    ? "bg-info/15 text-info border-info/30"
    : "bg-success/15 text-success border-success/30";
}

function deliveryBadgeClass(status: NonNullable<EmailThread["deliveryStatus"]> | "sent"): string {
  if (status === "sent") return "bg-success/15 text-success border-success/30";
  if (status === "pending") return "bg-secondary text-muted-foreground border-border";
  return "bg-destructive/15 text-destructive border-destructive/30";
}

function bodyToEditorHtml(body: string): string {
  if (!body.trim()) return "";
  if (emailBodyLooksLikeHtml(body)) return body;
  return body.replace(/\n/g, "<br/>");
}

export default function TransactionEmailsTab({
  project,
  emails,
  suggestions,
  showCompose,
  onToggleCompose,
  composeDraft,
  onComposeDraftChange,
  onSend,
  onCancelCompose,
  onReply,
  onDeleteEmail,
  canDelete,
  sending = false,
}: Props) {
  const apiOn = Boolean(getApiBaseUrl());
  const clients = useAppStore((s) => s.clients);
  const emailTemplates = useAppStore((s) => s.emailTemplates);
  const setEmailTemplates = useAppStore((s) => s.setEmailTemplates);
  const linkedClient = useMemo(
    () => clients.find((c) => c.id === project.clientId),
    [clients, project.clientId]
  );
  const [loadingTemplates, setLoadingTemplates] = useState(false);

  useEffect(() => {
    if (!apiOn) return;
    let cancelled = false;
    setLoadingTemplates(true);
    void listEmailTemplatesFromApi()
      .then((rows) => {
        if (!cancelled) setEmailTemplates(rows);
      })
      .catch((e) => {
        if (!cancelled) {
          toast.error("Could not load email templates.", {
            description: e instanceof Error ? e.message : "Unknown error",
          });
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingTemplates(false);
      });
    return () => {
      cancelled = true;
    };
  }, [apiOn, setEmailTemplates]);

  const applyTemplate = (templateId: string) => {
    const tpl = emailTemplates.find((t) => t.id === templateId);
    if (!tpl) return;
    const { subject, body } = applyEmailTemplateToCompose(tpl, project, linkedClient);
    onComposeDraftChange({
      ...composeDraft,
      templateId,
      subject,
      body: bodyToEditorHtml(body),
    });
  };

  const summary = useMemo(() => {
    let outbound = 0;
    let inbound = 0;
    let failed = 0;
    for (const e of emails) {
      if (e.direction === "outbound") {
        outbound += 1;
        if (e.deliveryStatus === "failed") failed += 1;
      } else {
        inbound += 1;
      }
    }
    return { total: emails.length, outbound, inbound, failed };
  }, [emails]);

  return (
    <div className={transactionTabCardClass}>
      <div className="shrink-0 space-y-3 border-b border-border p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="font-display text-sm font-semibold text-foreground">Communication</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {summary.total} email{summary.total === 1 ? "" : "s"} on this file
            </p>
          </div>
          <Button type="button" size="sm" className="h-8 gap-1.5 shrink-0" onClick={onToggleCompose}>
            <Mail className="h-3.5 w-3.5" />
            {showCompose ? "Hide compose" : "Compose email"}
          </Button>
        </div>
        {summary.total > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {summary.outbound > 0 ? (
              <Badge variant="outline" className="border-info/40 bg-info/10 text-[10px] text-info">
                Outbound · {summary.outbound}
              </Badge>
            ) : null}
            {summary.inbound > 0 ? (
              <Badge variant="outline" className="border-success/40 bg-success/10 text-[10px] text-success">
                Received · {summary.inbound}
              </Badge>
            ) : null}
            {summary.failed > 0 ? (
              <Badge variant="outline" className="border-destructive/40 bg-destructive/10 text-[10px] text-destructive">
                Failed · {summary.failed}
              </Badge>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className={listPageBodyClass}>
        {showCompose ? (
          <div className="border-b border-border bg-muted/20 px-4 py-4 sm:px-5">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">New email</p>
            <EmailComposePanel
              draft={composeDraft}
              onDraftChange={onComposeDraftChange}
              suggestions={suggestions}
              projectId={project.id}
              emailTemplates={emailTemplates}
              loadingTemplates={loadingTemplates}
              onApplyTemplate={applyTemplate}
              sending={sending}
              onSend={onSend}
              onCancel={onCancelCompose}
            />
          </div>
        ) : null}

        {emails.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
            <Mail className="mb-3 h-10 w-10 text-muted-foreground/50" />
            <p className="text-sm font-medium text-foreground">No emails yet</p>
            <p className="mt-1 max-w-sm text-xs text-muted-foreground">
              Compose an email here or use Email on a party in Overview to start a thread on this transaction.
            </p>
            {!showCompose ? (
              <Button type="button" size="sm" variant="outline" className="mt-4" onClick={onToggleCompose}>
                Compose email
              </Button>
            ) : null}
          </div>
        ) : (
          <ul className="divide-y divide-border p-2 sm:p-3">
            {emails.map((email) => {
              const delivery = email.deliveryStatus ?? "sent";
              return (
                <li
                  key={email.id}
                  className={cn(
                    "rounded-lg border border-transparent p-3 transition-colors hover:border-border hover:bg-muted/20",
                    email.direction === "outbound" && delivery === "failed" && "border-destructive/30 bg-destructive/5",
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                      <Badge variant="outline" className={cn("text-[10px] font-semibold", directionBadgeClass(email.direction))}>
                        {email.direction === "outbound" ? "Outbound" : "Received"}
                      </Badge>
                      {email.direction === "outbound" ? (
                        <Badge variant="outline" className={cn("text-[10px] font-semibold", deliveryBadgeClass(delivery))}>
                          {delivery === "sent" ? "Delivered" : delivery === "pending" ? "Sending…" : "Failed"}
                        </Badge>
                      ) : null}
                      <span className="text-xs tabular-nums text-muted-foreground">{email.date}</span>
                    </div>
                    <div className="flex shrink-0 items-center gap-0.5">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-muted-foreground"
                        title="Reply"
                        onClick={() => onReply(email)}
                      >
                        <Reply className="h-3.5 w-3.5" />
                      </Button>
                      {canDelete ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                          title="Delete from thread"
                          onClick={() => onDeleteEmail(email.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      ) : null}
                    </div>
                  </div>
                  <p className="mt-2 text-sm font-medium text-foreground">{email.subject}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {email.direction === "outbound" ? `To: ${email.to}` : `From: ${email.from}`}
                  </p>
                  <div className="mt-2">
                    <EmailThreadBody email={email} projectId={project.id} />
                  </div>
                  {email.direction === "outbound" && delivery === "failed" && email.deliveryError ? (
                    <p className="mt-2 text-xs text-destructive">{email.deliveryError}</p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
