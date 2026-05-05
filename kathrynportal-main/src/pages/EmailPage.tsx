import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Send } from "lucide-react";
import { useAppStore } from "@/store/appStore";
import { isTransactionProject } from "@/data/mockData";
import { createProjectEmailApi, listProjectsFromApi, type ProjectListItem } from "@/api/projects";
import { listEmailTemplatesFromApi } from "@/api/emailTemplates";
import { getApiBaseUrl } from "@/lib/apiConfig";
import { useAuthStore } from "@/store/authStore";
import PageHeader from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

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

  const [to, setTo] = useState(toParam);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [selectedProject, setSelectedProject] = useState("");

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

  const transactionOptions = useMemo(
    () =>
      apiOn
        ? apiTransactions.map((p) => ({
            id: p.id,
            propertyAddress: p.propertyAddress,
            clientName: p.clientName,
            clientId: p.clientId,
          }))
        : transactionProjects.map((p) => ({
            id: p.id,
            propertyAddress: p.propertyAddress,
            clientName: p.clientName,
            clientId: p.clientId,
          })),
    [apiOn, apiTransactions, transactionProjects]
  );

  const handleProjectChange = (projectId: string) => {
    setSelectedProject(projectId);
    const selected = transactionOptions.find((p) => p.id === projectId);
    if (!selected) return;
    const linkedClient = clients.find((c) => c.id === selected.clientId);
    if (linkedClient?.email) {
      setTo(linkedClient.email);
    }
  };

  const applyTemplate = (templateId: string) => {
    const tpl = emailTemplates.find(t => t.id === templateId);
    if (!tpl) return;
    setSelectedTemplate(templateId);

    const project = transactionOptions.find(p => p.id === selectedProject);
    let subj = tpl.subject;
    let bd = tpl.body;

    if (project) {
      const client = clients.find(c => c.id === project.clientId);
      subj = subj.replace("{{property_address}}", project.propertyAddress);
      bd = bd.replace(/\{\{property_address\}\}/g, project.propertyAddress);
      bd = bd.replace(/\{\{agent_name\}\}/g, client?.name || "");
      bd = bd.replace(/\{\{document_list\}\}/g, "• [Documents listed here]");
      bd = bd.replace(/\{\{deadline_name\}\}/g, "[Deadline]");
      bd = bd.replace(/\{\{deadline_date\}\}/g, "[Date]");
      bd = bd.replace(/\{\{update_details\}\}/g, "[Update details here]");
    }
    setSubject(subj);
    setBody(bd);
  };

  const handleSend = async () => {
    if (!to || !subject) {
      toast.error("Please fill in recipient and subject.");
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

  // Recently sent (mock)
  const recentEmails = projects.flatMap(p => p.emails).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 8);

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
                <Select value={selectedProject} onValueChange={handleProjectChange}>
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
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">To</label>
              <Input value={to} onChange={e => setTo(e.target.value)} placeholder="recipient@email.com" />
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
          </div>
          <div className="divide-y divide-border max-h-[600px] overflow-y-auto">
            {recentEmails.map(email => (
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
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
