import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Send } from "lucide-react";
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
import PageHeader from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { getTransactionRecipientSuggestions } from "@/lib/transactionRecipientSuggestions";

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
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

function applyTokens(input: string, tokenMap: Record<string, string>): string {
  let out = input.replace(/\\n/g, "\n");
  for (const [key, value] of Object.entries(tokenMap)) {
    const re = new RegExp(`\\{\\{\\s*${escapeRegExp(key)}\\s*\\}\\}`, "gi");
    out = out.replace(re, value);
  }
  return out;
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

  const [to, setTo] = useState(toParam);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [selectedProject, setSelectedProject] = useState("");
  const [selectedProjectDocList, setSelectedProjectDocList] = useState<string>("• [Documents listed here]");

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

  const toMatchesSuggestion = useMemo(() => {
    const t = to.trim().toLowerCase();
    if (!t) return false;
    return toRecipientSuggestions.some((s) => s.email.toLowerCase() === t);
  }, [to, toRecipientSuggestions]);

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
    void listRecentEmailsFromApi(25)
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

  const buildDocumentList = (projectLike: { documents?: Array<{ name: string; status: string }> } | undefined): string => {
    if (!projectLike?.documents || projectLike.documents.length === 0) return "• [Documents listed here]";
    const pending = projectLike.documents.filter((d) => d.status !== "Completed" && d.status !== "Complete");
    const source = pending.length > 0 ? pending : projectLike.documents;
    const lines = source.slice(0, 10).map((d) => `• ${d.name}`);
    return lines.length > 0 ? lines.join("\n") : "• [Documents listed here]";
  };

  const handleProjectChange = async (projectId: string) => {
    setSelectedProject(projectId);
    const selected = transactionOptions.find((p) => p.id === projectId);
    if (!selected) return;
    const linkedClient = clients.find((c) => c.id === selected.clientId);
    setTo(linkedClient?.email?.trim() || "");
    const localProject = transactionProjects.find((p) => p.id === projectId);
    setSelectedProjectDocList(buildDocumentList(localProject));
    if (apiOn) {
      try {
        const full = await getProjectFromApi(projectId);
        upsertProject(full);
        setSelectedProjectDocList(buildDocumentList(full));
      } catch {
        // leave current fallback list if full project fetch fails
      }
    }
  };

  const applyTemplate = (templateId: string) => {
    const tpl = emailTemplates.find(t => t.id === templateId);
    if (!tpl) return;
    setSelectedTemplate(templateId);

    const project = transactionOptions.find(p => p.id === selectedProject);
    let subj = tpl.subject.replace(/\\n/g, "\n");
    let bd = tpl.body.replace(/\\n/g, "\n");

    if (project) {
      const client = clients.find(c => c.id === project.clientId);
      const parts = project.propertyAddress.split(",").map((x) => x.trim());
      const currentProjectDetails = transactionProjects.find((p) => p.id === selectedProject);
      const tokenMap: Record<string, string> = {
        agent_name: client?.name || project.clientName || "",
        client_name: project.clientName || "",
        property_address: project.propertyAddress || "",
        property_street: parts[0] || "",
        property_city: parts[1] || "",
        property_state: parts[2] || "",
        property_zip: parts[3] || "",
        transaction_name: project.name || "",
        transaction_type: project.type || "",
        stage_name: project.stage || "",
        deadline_name: project.nextStep || "Next deadline",
        deadline_date: project.nextStepDate || "TBD",
        next_step: project.nextStep || "",
        next_step_date: project.nextStepDate || "",
        list_price: project.listPrice || "",
        escrow_officer: project.escrowOfficer || "",
        escrow_company: project.escrowCompany || "",
        property_type: project.propertyType || "",
        document_list: buildDocumentList(currentProjectDetails) || selectedProjectDocList,
        update_details: "[Update details here]",
        today_date: new Date().toLocaleDateString(),
      };
      subj = applyTokens(subj, tokenMap);
      bd = applyTokens(bd, tokenMap);
    }
    setSubject(subj);
    setBody(bd);
  };

  const handleSend = async () => {
    if (!to || !subject) {
      toast.error("Please fill in recipient and subject.");
      return;
    }
    if (apiOn && !selectedProject) {
      toast.error("Please link a transaction before sending.");
      return;
    }
    if (!isValidEmail(to)) {
      toast.error("Recipient email is invalid.");
      return;
    }
    try {
      if (apiOn && selectedProject) {
        const { project: updated, emailSendFailed, emailSendError } = await createProjectEmailApi(selectedProject, {
          to,
          subject,
          body,
          from: user?.email || undefined,
          ...(selectedTemplate ? { templateId: selectedTemplate } : {}),
        });
        upsertProject(updated);
        void listRecentEmailsFromApi(25)
          .then((rows) => setRecentSidebarEmails(rows.map(mapRecentApiToSidebar)))
          .catch(() => {});
        if (emailSendFailed) {
          toast.warning("Email saved; SMTP delivery failed.", {
            description: emailSendError ?? "Check Settings → Email / SMTP.",
          });
        } else {
          toast.success("Email sent!", { description: `Email sent to ${to}` });
        }
      } else {
        sendEmail({ to, subject, body, projectId: selectedProject || undefined });
        toast.success("Email sent!", { description: `Email sent to ${to}` });
      }
      setTo("");
      setSubject("");
      setBody("");
      setSelectedTemplate("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not send email.");
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
      .slice(0, 25);
  }, [apiOn, recentSidebarEmails, projects]);

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <PageHeader title="Email" subtitle="Send emails using templates and track communication." />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Compose */}
        <div className="lg:col-span-2 bg-card border border-border rounded-lg p-6">
          <h3 className="font-display font-semibold text-foreground mb-4">Compose Email</h3>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Use Template</label>
                <Select value={selectedTemplate} onValueChange={applyTemplate}>
                  <SelectTrigger><SelectValue placeholder={loadingTemplates ? "Loading templates..." : "Choose a template..."} /></SelectTrigger>
                  <SelectContent>
                    {emailTemplates.map(t => (
                      <SelectItem key={t.id} value={t.id}>{t.name} ({t.category})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground">
                  Tokens: {"{{agent_name}}"} {"{{client_name}}"} {"{{property_address}}"} {"{{stage_name}}"} {"{{deadline_name}}"} {"{{deadline_date}}"} {"{{next_step}}"} {"{{next_step_date}}"} {"{{transaction_type}}"} {"{{list_price}}"} {"{{today_date}}"}
                </p>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">To</label>
              {toRecipientSuggestions.length > 0 ? (
                <Select
                  value={toMatchesSuggestion ? to.trim() : undefined}
                  onValueChange={(v) => setTo(v)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Choose recipient from this transaction…" />
                  </SelectTrigger>
                  <SelectContent>
                    {toRecipientSuggestions.map((row) => (
                      <SelectItem key={row.email} value={row.email}>
                        <span className="font-medium">{row.label}</span>
                        <span className="text-muted-foreground"> · {row.email}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : null}
              <Input
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder="recipient@email.com"
                autoComplete="off"
              />
              <p className="text-[11px] text-muted-foreground">
                {selectedProject
                  ? "Use the list for contact, parties on the file (buyers, sellers, agents, escrow, TCs), and assigned team—or type any address above."
                  : "Choose a transaction to enable the recipient list (saved parties and assignees on that file)."}
              </p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Subject</label>
              <Input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Email subject..." />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Message</label>
              <Textarea value={body} onChange={e => setBody(e.target.value)} rows={10} placeholder="Write your email..." />
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => { setTo(""); setSubject(""); setBody(""); }}>Clear</Button>
              <Button onClick={handleSend} className="gap-2"><Send className="w-4 h-4" /> Send Email</Button>
            </div>
          </div>
        </div>

        {/* Recent Emails Sidebar */}
        <div className="bg-card border border-border rounded-lg">
          <div className="px-5 py-4 border-b border-border">
            <h3 className="font-display font-semibold text-foreground text-sm">Recent Emails</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">Across all transactions you can access</p>
          </div>
          <div className="divide-y divide-border max-h-[600px] overflow-y-auto">
            {apiOn && loadingRecentEmails && recentEmails.length === 0 ? (
              <div className="px-5 py-8 text-center text-xs text-muted-foreground">Loading recent emails…</div>
            ) : recentEmails.length === 0 ? (
              <div className="px-5 py-8 text-center text-xs text-muted-foreground">No emails yet.</div>
            ) : (
              recentEmails.map((email) => (
                <div key={email.id} className="px-5 py-3 hover:bg-secondary/30 transition-colors cursor-pointer">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <span className={`w-2 h-2 rounded-full ${email.direction === "outbound" ? "bg-info" : "bg-success"}`} />
                    {email.direction === "outbound" && email.deliveryStatus === "failed" && (
                      <span className="text-xs text-destructive">Failed</span>
                    )}
                    <span className="text-xs text-muted-foreground">{email.date}</span>
                  </div>
                  <p className="text-sm font-medium text-foreground truncate">{email.subject}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {email.direction === "outbound" ? `To: ${email.to}` : `From: ${email.from}`}
                  </p>
                  {email.projectLabel ? (
                    <p className="text-[10px] text-muted-foreground truncate mt-0.5">{email.projectLabel}</p>
                  ) : null}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
