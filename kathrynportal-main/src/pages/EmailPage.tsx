import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import { useAppStore } from "@/store/appStore";
import { isTransactionProject, type EmailThread } from "@/data/mockData";
import {
  createProjectEmailApi,
  getProjectFromApi,
  listProjectsFromApi,
  listRecentEmailsFromApi,
  type ProjectListItem,
  type RecentEmailApi,
} from "@/api/projects";
import { listEmailTemplatesFromApi } from "@/api/emailTemplates";
import { getApiBaseUrl } from "@/lib/apiConfig";
import { useAuthStore } from "@/store/authStore";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { getTransactionRecipientSuggestions } from "@/lib/transactionRecipientSuggestions";
import {
  applyEmailTemplateToCompose,
  buildTransactionDocumentList,
  TRANSACTION_EMAIL_TOKENS,
} from "@/lib/emailTemplateTokens";
import { emptyEmailComposeDraft, type EmailComposeDraft } from "@/types/emailCompose";
import { isValidEmailAddress } from "@/lib/emailAddressList";
import { emailBodyLooksLikeHtml } from "@/lib/emailHtmlUtils";
import EmailComposePanel from "@/components/email/EmailComposePanel";
import { cn } from "@/lib/utils";

const EMAIL_TOKENS = TRANSACTION_EMAIL_TOKENS;

function bodyToEditorHtml(body: string): string {
  if (!body.trim()) return "";
  if (emailBodyLooksLikeHtml(body)) return body;
  return body.replace(/\n/g, "<br/>");
}

type SidebarEmail = EmailThread & { projectLabel?: string };

function mapRecentApiToSidebar(row: RecentEmailApi): SidebarEmail {
  const label = row.propertyAddress?.split(",")[0]?.trim() || row.projectName;
  return {
    id: row.id,
    subject: row.subject,
    from: row.from,
    to: row.to,
    date: row.date,
    body: row.body,
    direction: row.direction,
    deliveryStatus: row.deliveryStatus,
    ...(row.deliveryError != null && row.deliveryError !== "" ? { deliveryError: row.deliveryError } : {}),
    projectLabel: label,
  };
}

export default function EmailPage() {
  const [searchParams] = useSearchParams();
  const toParam = searchParams.get("to") || "";

  const clients = useAppStore(s => s.clients);
  const projects = useAppStore(s => s.projects);
  const transactionProjects = projects.filter(isTransactionProject);
  const emailTemplates = useAppStore(s => s.emailTemplates);
  const setEmailTemplates = useAppStore((s) => s.setEmailTemplates);
  const sendEmail = useAppStore(s => s.sendEmail);
  const upsertProject = useAppStore(s => s.upsertProject);
  const user = useAuthStore((s) => s.user);
  const apiOn = Boolean(getApiBaseUrl());
  const [apiTransactions, setApiTransactions] = useState<ProjectListItem[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [recentSidebarEmails, setRecentSidebarEmails] = useState<SidebarEmail[]>([]);
  const [loadingRecentEmails, setLoadingRecentEmails] = useState(false);

  const [composeDraft, setComposeDraft] = useState<EmailComposeDraft>(() =>
    emptyEmailComposeDraft({
      to: toParam.trim() && isValidEmailAddress(toParam) ? [toParam.trim().toLowerCase()] : [],
    }),
  );
  const [sending, setSending] = useState(false);
  const [selectedProject, setSelectedProject] = useState("");
  const [selectedProjectDocList, setSelectedProjectDocList] = useState<string>("• [Documents listed here]");
  const [tokensOpen, setTokensOpen] = useState(false);

  const linkedProjectForRecipients = useMemo(
    () => (selectedProject ? projects.find((p) => p.id === selectedProject) : undefined),
    [projects, selectedProject],
  );
  const linkedClientForRecipients = useMemo(() => {
    const cid = linkedProjectForRecipients?.clientId;
    if (!cid) return undefined;
    return clients.find((c) => c.id === cid);
  }, [clients, linkedProjectForRecipients?.clientId]);
  const toRecipientSuggestions = useMemo(
    () => getTransactionRecipientSuggestions(linkedProjectForRecipients, linkedClientForRecipients),
    [linkedProjectForRecipients, linkedClientForRecipients],
  );

  useEffect(() => {
    if (!apiOn) {
      setApiTransactions([]);
      return;
    }
    let cancelled = false;
    setLoadingTransactions(true);
    void listProjectsFromApi()
      .then((rows) => {
        if (!cancelled) {
          setApiTransactions(rows.filter((p) => p.type === "Listing" || p.type === "Buyer File"));
        }
      })
      .catch((e) => {
        if (!cancelled) {
          toast.error("Could not load transactions.", {
            description: e instanceof Error ? e.message : "Unknown error",
          });
          setApiTransactions([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingTransactions(false);
      });
    return () => {
      cancelled = true;
    };
  }, [apiOn]);

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

  useEffect(() => {
    if (!apiOn) {
      setRecentSidebarEmails([]);
      return;
    }
    let cancelled = false;
    setLoadingRecentEmails(true);
    void listRecentEmailsFromApi(50)
      .then((rows) => {
        if (!cancelled) setRecentSidebarEmails(rows.map(mapRecentApiToSidebar));
      })
      .catch((e) => {
        if (!cancelled) {
          toast.error("Could not load recent emails.", {
            description: e instanceof Error ? e.message : "Unknown error",
          });
          setRecentSidebarEmails([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingRecentEmails(false);
      });
    return () => {
      cancelled = true;
    };
  }, [apiOn]);

  const transactionOptions = useMemo(
    () =>
      apiOn
        ? apiTransactions.map((p) => ({
            id: p.id,
            name: p.name,
            propertyAddress: p.propertyAddress,
            clientName: p.clientName,
            clientId: p.clientId,
            stage: p.stage,
            type: p.type,
            nextStep: p.nextStep,
            nextStepDate: p.nextStepDate,
            listPrice: p.listPrice,
            escrowOfficer: p.escrowOfficer,
            escrowCompany: p.escrowCompany,
            propertyType: p.propertyType,
          }))
        : transactionProjects.map((p) => ({
            id: p.id,
            name: p.name,
            propertyAddress: p.propertyAddress,
            clientName: p.clientName,
            clientId: p.clientId,
            stage: p.stage,
            type: p.type,
            nextStep: p.nextStep,
            nextStepDate: p.nextStepDate,
            listPrice: p.listPrice,
            escrowOfficer: p.escrowOfficer,
            escrowCompany: p.escrowCompany,
            propertyType: p.propertyType,
          })),
    [apiOn, apiTransactions, transactionProjects]
  );

  const handleProjectChange = async (projectId: string) => {
    setSelectedProject(projectId);
    const selected = transactionOptions.find((p) => p.id === projectId);
    if (!selected) return;
    const linkedClient = clients.find((c) => c.id === selected.clientId);
    const clientEmail = linkedClient?.email?.trim();
    const localProject = transactionProjects.find((p) => p.id === projectId);
    setSelectedProjectDocList(buildTransactionDocumentList(localProject));
    setComposeDraft((prev) => ({
      ...prev,
      to: clientEmail && isValidEmailAddress(clientEmail) ? [clientEmail.toLowerCase()] : [],
      attachments: [],
    }));
    if (apiOn) {
      try {
        const full = await getProjectFromApi(projectId);
        upsertProject(full);
        setSelectedProjectDocList(buildTransactionDocumentList(full));
      } catch {
        // leave current fallback list if full project fetch fails
      }
    }
  };

  const applyTemplate = (templateId: string) => {
    const tpl = emailTemplates.find((t) => t.id === templateId);
    if (!tpl) return;

    const option = transactionOptions.find((p) => p.id === selectedProject);
    if (!option) {
      setComposeDraft((prev) => ({
        ...prev,
        templateId,
        subject: tpl.subject.replace(/\\n/g, "\n"),
        body: bodyToEditorHtml(tpl.body.replace(/\\n/g, "\n")),
      }));
      return;
    }
    const fullProject = transactionProjects.find((p) => p.id === selectedProject);
    const projectForTokens = fullProject ?? {
      ...option,
      documents: [],
      tasks: [],
      emails: [],
      deadlines: [],
      attachments: [],
      fileFolders: [],
      createdAt: "",
    };
    const client = clients.find((c) => c.id === option.clientId);
    const docList = buildTransactionDocumentList(fullProject) || selectedProjectDocList;
    const { subject: subj, body: bd } = applyEmailTemplateToCompose(tpl, projectForTokens, client, docList);
    setComposeDraft((prev) => ({
      ...prev,
      templateId,
      subject: subj,
      body: bodyToEditorHtml(bd),
    }));
  };

  const handleSend = async () => {
    if (composeDraft.to.length === 0 || !composeDraft.subject.trim()) {
      toast.error("Please fill in recipient and subject.");
      return;
    }
    if (apiOn && !selectedProject) {
      toast.error("Please link a transaction before sending.");
      return;
    }
    if (composeDraft.to.some((e) => !isValidEmailAddress(e))) {
      toast.error("One or more recipient emails are invalid.");
      return;
    }
    try {
      if (apiOn && selectedProject) {
        setSending(true);
        const { project: updated, emailSendFailed, emailSendError } = await createProjectEmailApi(selectedProject, {
          to: composeDraft.to,
          cc: composeDraft.cc,
          bcc: composeDraft.bcc,
          subject: composeDraft.subject,
          body: composeDraft.body,
          ...(composeDraft.templateId ? { templateId: composeDraft.templateId } : {}),
          ...(composeDraft.attachments.length
            ? { attachmentStoredFileIds: composeDraft.attachments.map((a) => a.storedFileId) }
            : {}),
        });
        upsertProject(updated);
        void listRecentEmailsFromApi(50)
          .then((rows) => setRecentSidebarEmails(rows.map(mapRecentApiToSidebar)))
          .catch(() => {});
        if (emailSendFailed) {
          toast.warning("Email saved; SMTP delivery failed.", {
            description: emailSendError ?? "Check Settings → Email / SMTP.",
          });
        } else {
          toast.success("Email sent!", { description: `Email sent to ${composeDraft.to.join(", ")}` });
        }
      } else {
        sendEmail({
          to: composeDraft.to.join(", "),
          subject: composeDraft.subject,
          body: composeDraft.body,
          projectId: selectedProject || undefined,
        });
        toast.success("Email sent!", { description: `Email sent to ${composeDraft.to.join(", ")}` });
      }
      setComposeDraft(emptyEmailComposeDraft());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not send email.");
    } finally {
      setSending(false);
    }
  };

  const recentEmails = useMemo((): SidebarEmail[] => {
    if (apiOn) return recentSidebarEmails;
    return projects
      .flatMap((p) =>
        p.emails.map((em) => ({
          ...em,
          projectLabel: p.propertyAddress.split(",")[0]?.trim() || p.name,
        }))
      )
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 50);
  }, [apiOn, recentSidebarEmails, projects]);

  const failedRecentCount = useMemo(
    () => recentEmails.filter((e) => e.deliveryStatus === "failed").length,
    [recentEmails],
  );

  const failedDetail =
    failedRecentCount > 0
      ? `${failedRecentCount} failed send${failedRecentCount === 1 ? "" : "s"} in your recent email history (sidebar count uses the same window).`
      : null;

  return (
    <div className="page-padding mx-auto flex w-full max-w-5xl flex-col gap-4 pb-8 sm:gap-6">
      <div className="mb-4 min-w-0 sm:mb-8">
        <h1 className="font-display text-xl font-bold text-foreground sm:text-2xl">Email</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Send emails using templates and track communication.
          {failedRecentCount > 0 ? (
            <Badge variant="destructive" className="ml-2 align-middle text-[10px] sm:hidden">
              {failedRecentCount} failed
            </Badge>
          ) : null}
        </p>
        {failedDetail ? (
          <p className="mt-1 hidden text-sm text-muted-foreground sm:block">{failedDetail}</p>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:gap-6 xl:grid-cols-3">
        {/* Compose */}
        <div className="rounded-lg border border-border bg-card p-4 sm:p-5 xl:col-span-2">
          <h3 className="mb-3 font-display text-sm font-semibold text-foreground sm:text-base">Compose Email</h3>
          <div className="space-y-3 sm:space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Link to transaction</label>
              <Select value={selectedProject} onValueChange={(v) => { void handleProjectChange(v); }}>
                <SelectTrigger>
                  <SelectValue placeholder={loadingTransactions ? "Loading transactions..." : "Select transaction..."} />
                </SelectTrigger>
                <SelectContent>
                  {transactionOptions.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.propertyAddress.split(",")[0]} — {p.clientName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <button
              type="button"
              className="flex w-full items-center justify-between rounded-md border border-border/60 bg-muted/20 px-2.5 py-2 text-left text-xs text-muted-foreground sm:hidden"
              onClick={() => setTokensOpen((v) => !v)}
              aria-expanded={tokensOpen}
            >
              <span>Available tokens</span>
              <ChevronDown className={cn("h-3.5 w-3.5 shrink-0 transition-transform", tokensOpen && "rotate-180")} />
            </button>
            <div className={cn("flex flex-wrap gap-1.5", !tokensOpen && "hidden sm:flex")}>
              {EMAIL_TOKENS.map((token) => (
                <span
                  key={token}
                  className="rounded border border-border bg-muted/40 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground"
                >
                  {token}
                </span>
              ))}
            </div>
            <EmailComposePanel
              draft={composeDraft}
              onDraftChange={setComposeDraft}
              suggestions={toRecipientSuggestions}
              projectId={selectedProject || undefined}
              emailTemplates={emailTemplates}
              loadingTemplates={loadingTemplates}
              onApplyTemplate={applyTemplate}
              sending={sending}
              onSend={() => void handleSend()}
              onCancel={() => setComposeDraft(emptyEmailComposeDraft())}
            />
          </div>
        </div>

        {/* Recent Emails Sidebar */}
        <div className="rounded-lg border border-border bg-card">
          <div className="border-b border-border px-4 py-3 sm:px-5 sm:py-4">
            <h3 className="font-display text-sm font-semibold text-foreground">Recent Emails</h3>
            <p className="mt-0.5 text-[11px] text-muted-foreground">Across all transactions you can access</p>
          </div>
          <div
            className={cn(
              "touch-pan-y divide-y divide-border",
              "xl:max-h-[600px] xl:overflow-y-auto xl:overscroll-contain",
            )}
          >
            {apiOn && loadingRecentEmails && recentEmails.length === 0 ? (
              <div className="px-4 py-8 text-center text-xs text-muted-foreground sm:px-5">Loading recent emails…</div>
            ) : recentEmails.length === 0 ? (
              <div className="px-4 py-8 text-center text-xs text-muted-foreground sm:px-5">No emails yet.</div>
            ) : (
              recentEmails.map((email) => {
                const failed = email.direction === "outbound" && email.deliveryStatus === "failed";
                return (
                  <div
                    key={email.id}
                    className={cn(
                      "touch-pan-y px-4 py-3 transition-colors hover:bg-secondary/30 sm:px-5",
                      failed && "border-l-2 border-l-destructive bg-destructive/5",
                    )}
                  >
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <span
                        className={cn(
                          "h-2 w-2 shrink-0 rounded-full",
                          email.direction === "outbound" ? "bg-info" : "bg-success",
                        )}
                      />
                      {failed ? (
                        <Badge variant="destructive" className="h-4 px-1.5 text-[9px]">
                          Failed
                        </Badge>
                      ) : null}
                      <span className="text-xs text-muted-foreground">{email.date}</span>
                    </div>
                    <p className="line-clamp-2 break-words text-sm font-medium text-foreground">{email.subject}</p>
                    <p className="mt-0.5 break-all text-xs text-muted-foreground">
                      {email.direction === "outbound" ? `To: ${email.to}` : `From: ${email.from}`}
                    </p>
                    {email.projectLabel ? (
                      <Badge variant="secondary" className="mt-2 h-5 max-w-full truncate text-[10px] font-normal">
                        {email.projectLabel}
                      </Badge>
                    ) : null}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
