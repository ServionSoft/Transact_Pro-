import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft, FileText, CheckSquare, Mail, Calendar, Clock, Send,
  Paperclip, PenLine, Plus, X, Save, MessageSquare,
} from "lucide-react";
import { useState, useMemo, useLayoutEffect } from "react";
import { useAppStore } from "@/store/appStore";
import TransactionDocumentsWorkspace from "@/components/documents/TransactionDocumentsWorkspace";
import PageHeader from "@/components/shared/PageHeader";
import StatusBadge from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { CRM_DOCUMENT_VAULT_PROJECT_ID } from "@/data/mockData";

const tabs = [
  { id: "overview", label: "Overview", icon: FileText },
  { id: "documents", label: "Document Checklist", icon: CheckSquare },
  { id: "attachments", label: "Stored Documents", icon: Paperclip },
  { id: "tasks", label: "Tasks", icon: CheckSquare },
  { id: "emails", label: "Emails", icon: Mail },
  { id: "notes", label: "Notes", icon: MessageSquare },
  { id: "calendar", label: "Timeline", icon: Calendar },
];

export default function ProjectDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  useLayoutEffect(() => {
    if (id === CRM_DOCUMENT_VAULT_PROJECT_ID) {
      navigate("/documents", { replace: true });
    }
  }, [id, navigate]);
  const project = useAppStore((s) => s.projects.find((p) => p.id === id));
  const clients = useAppStore((s) => s.clients);
  const setNextStepStore = useAppStore((s) => s.setNextStep);
  const setTaskStatusStore = useAppStore((s) => s.setTaskStatus);
  const addProjectDeadlineStore = useAppStore((s) => s.addProjectDeadline);
  const sendEmailStore = useAppStore((s) => s.sendEmail);
  const [activeTab, setActiveTab] = useState("overview");

  // Editable next step
  const [editingNextStep, setEditingNextStep] = useState(false);
  const [nextStepText, setNextStepText] = useState("");
  const [nextStepDate, setNextStepDate] = useState("");

  // Email compose
  const [showComposeEmail, setShowComposeEmail] = useState(false);
  const [emailAttachments, setEmailAttachments] = useState<string[]>([]);
  const [composeTo, setComposeTo] = useState("");
  const [composeSubject, setComposeSubject] = useState("");
  const [composeBody, setComposeBody] = useState("");

  // Add-deadline form
  const [showAddDeadline, setShowAddDeadline] = useState(false);
  const [newDeadlineTitle, setNewDeadlineTitle] = useState("");
  const [newDeadlineDate, setNewDeadlineDate] = useState("");

  // Reminder draft modal
  const [reminderDraft, setReminderDraft] = useState<{ title: string; date: string } | null>(null);
  const [reminderSubject, setReminderSubject] = useState("");
  const [reminderBody, setReminderBody] = useState("");
  const [reminderTo, setReminderTo] = useState("");

  const sigCounts = useMemo(() => {
    const list = project?.documents ?? [];
    const out = list.filter((d) => d.status === "Out for Signature").length;
    const signed = list.filter((d) => d.status === "Signed — Needs Upload" || d.status === "Signed").length;
    const awaiting = list.filter(
      (d) =>
        d.status === "Needs Buyer Signature" ||
        d.status === "Needs Seller Signature" ||
        d.status === "Needs Signature"
    ).length;
    return { out, signed, awaiting };
  }, [project?.documents]);

  const docProgress = useMemo(() => {
    const list = project?.documents ?? [];
    const done = list.filter((d) => d.status === "Completed" || d.status === "Complete").length;
    return { done, total: list.length };
  }, [project?.documents]);

  if (!project) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">Project not found.</p>
        <Button variant="outline" onClick={() => navigate("/projects")} className="mt-4">Back to Projects</Button>
      </div>
    );
  }

  const client = clients.find(c => c.id === project.clientId);

  const openNextStepEdit = () => {
    setNextStepText(project.nextStep);
    setNextStepDate(project.nextStepDate);
    setEditingNextStep(true);
  };

  const saveNextStep = () => {
    if (!project) return;
    setNextStepStore(project.id, nextStepText, nextStepDate);
    toast.success("Next step updated", { description: `"${nextStepText}" — due ${nextStepDate}` });
    setEditingNextStep(false);
  };

  const openReminderDraft = (title: string, date: string) => {
    setReminderDraft({ title, date });
    setReminderTo(client?.email || "");
    setReminderSubject(`Upcoming Deadline — ${title} — ${project.propertyAddress.split(",")[0]}`);
    setReminderBody(
      `Hi ${client?.name || ""},\n\nThis is a reminder that the ${title} for ${project.propertyAddress} is due on ${date}.\n\nPlease ensure all required items are submitted before this date.\n\nBest regards,\nKathryn Santos`
    );
  };

  const sendReminder = () => {
    toast.success("Reminder sent", { description: `For "${reminderDraft?.title}" → ${reminderTo}` });
    setReminderDraft(null);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <button onClick={() => navigate("/projects")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Projects
      </button>

      <div className="flex items-start justify-between mb-2">
        <div>
          <div className="flex items-center gap-3 mb-1 flex-wrap">
            <h1 className="text-2xl font-display font-bold text-foreground">{project.propertyAddress.split(",")[0]}</h1>
            <StatusBadge status={project.stage} type="stage" />
            {(() => {
              const isBuyer = project.type === "Buyer Representation" || project.type === "Buyer File";
              return (
                <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider ${
                  isBuyer ? "bg-info/15 text-info" : "bg-accent/15 text-accent-foreground"
                }`}>
                  {isBuyer ? "Buyer File" : "Listing"}
                </span>
              );
            })()}
          </div>
          <p className="text-sm text-muted-foreground">
            {project.clientName} • {project.listPrice}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate(`/email?to=${project.clientName}`)} className="gap-2">
            <Mail className="w-4 h-4" /> Email
          </Button>
          <Button variant="outline" className="gap-2">Edit</Button>
        </div>
      </div>

      {/* DocuSign status indicator */}
      <div className="flex items-center gap-2 mt-3 mb-4 flex-wrap">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mr-1">DocuSign:</span>
        <span className="text-xs px-2.5 py-1 rounded-full bg-status-out-sig/15 text-status-out-sig font-medium">
          {sigCounts.out} out for signature
        </span>
        <span className="text-xs px-2.5 py-1 rounded-full bg-status-signed/15 text-status-signed font-medium">
          {sigCounts.signed} signed
        </span>
        <span className="text-xs px-2.5 py-1 rounded-full bg-status-needs-sig/15 text-status-needs-sig font-medium">
          {sigCounts.awaiting} awaiting
        </span>
      </div>

      {/* Next Step Banner */}
      <div className="bg-accent/10 border border-accent/20 rounded-lg p-4 mb-6">
        {editingNextStep ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <PenLine className="w-4 h-4 text-accent shrink-0" />
              <span className="text-sm font-medium text-foreground">Edit Next Step</span>
            </div>
            <Input value={nextStepText} onChange={e => setNextStepText(e.target.value)} placeholder="What's the next action?" />
            <div className="flex items-center gap-3">
              <Input type="date" value={nextStepDate} onChange={e => setNextStepDate(e.target.value)} className="w-48" />
              <div className="flex gap-2 ml-auto">
                <Button size="sm" variant="outline" onClick={() => setEditingNextStep(false)}><X className="w-3 h-3 mr-1" /> Cancel</Button>
                <Button size="sm" onClick={saveNextStep}><Save className="w-3 h-3 mr-1" /> Save</Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-accent shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">{project.nextStep}</p>
              <p className="text-xs text-muted-foreground">Next step due: {project.nextStepDate}</p>
            </div>
            <Button size="sm" variant="outline" onClick={openNextStepEdit} className="gap-1">
              <PenLine className="w-3 h-3" /> Update
            </Button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border mb-6 overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? "border-accent text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <tab.icon className="w-4 h-4" /> {tab.label}
          </button>
        ))}
      </div>

      {/* Overview */}
      {activeTab === "overview" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-card border border-border rounded-lg p-6 space-y-4">
            <h3 className="font-display font-semibold text-foreground">Property Details</h3>
            {[
              ["Address", project.propertyAddress],
              ["Type", project.propertyType],
              ["Year Built", project.yearBuilt],
              ["Representation", project.representationSide],
              ["List Price", project.listPrice],
              ["Project Type", project.type],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between text-sm">
                <span className="text-muted-foreground">{label}</span>
                <span className="text-foreground font-medium">{value}</span>
              </div>
            ))}
          </div>
          <div className="bg-card border border-border rounded-lg p-6 space-y-4">
            <h3 className="font-display font-semibold text-foreground">Escrow Information</h3>
            {[
              ["Escrow Officer", project.escrowOfficer],
              ["Escrow Company", project.escrowCompany],
              ["Stage", project.stage],
              ["Created", project.createdAt],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between text-sm">
                <span className="text-muted-foreground">{label}</span>
                <span className="text-foreground font-medium">{value}</span>
              </div>
            ))}
            <div className="pt-3 border-t border-border">
              <Link to={`/clients/${project.clientId}`} className="text-sm text-accent hover:underline">
                View Client Profile →
              </Link>
            </div>
          </div>
          <div className="md:col-span-2 bg-card border border-border rounded-lg p-6">
            <h3 className="font-display font-semibold text-foreground mb-3">Progress Overview</h3>
            <div className="grid grid-cols-4 gap-4">
              <div>
                <p className="text-2xl font-display font-bold text-foreground">
                  {docProgress.done}/{docProgress.total}
                </p>
                <p className="text-xs text-muted-foreground">Documents Complete</p>
              </div>
              <div>
                <p className="text-2xl font-display font-bold text-foreground">
                  {project.tasks.filter(t => t.status === "Complete").length}/{project.tasks.length}
                </p>
                <p className="text-xs text-muted-foreground">Tasks Complete</p>
              </div>
              <div>
                <p className="text-2xl font-display font-bold text-foreground">{project.deadlines.length}</p>
                <p className="text-xs text-muted-foreground">Upcoming Deadlines</p>
              </div>
              <div>
                <p className="text-2xl font-display font-bold text-foreground">{project.attachments.length}</p>
                <p className="text-xs text-muted-foreground">Files Stored</p>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {activeTab === "documents" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="pb-8">
          <p className="text-xs text-muted-foreground mb-3">
            Upload, pool, checklist, and DocuSign together: open{" "}
            <Link to="/documents" className="text-accent font-medium hover:underline">
              Documents
            </Link>{" "}
            in the sidebar and pick this transaction.
          </p>
          <TransactionDocumentsWorkspace projectId={project.id} view="checklist-only" />
        </motion.div>
      )}

      {activeTab === "attachments" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <p className="text-xs text-muted-foreground mb-3">
            Combined upload + checklist + DocuSign:{" "}
            <Link to="/documents" className="text-accent font-medium hover:underline">
              Documents
            </Link>{" "}
            hub. You can still manage the file pool below.
          </p>
          <TransactionDocumentsWorkspace projectId={project.id} view="pool-only" />
        </motion.div>
      )}

      {/* Tasks */}
      {activeTab === "tasks" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="bg-card border border-border rounded-lg">
            <div className="px-6 py-4 border-b border-border">
              <h3 className="font-display font-semibold text-foreground">Task Roadmap</h3>
            </div>
            <div className="divide-y divide-border">
              {project.tasks.map(task => {
                const isComplete = task.status === "Complete";
                return (
                  <div key={task.id} className="flex items-center gap-4 px-6 py-3">
                    <button
                      onClick={() => {
                        setTaskStatusStore(project.id, task.id, isComplete ? "Pending" : "Complete");
                        toast.success(isComplete ? "Task unchecked" : "Task completed!");
                      }}
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                        isComplete ? "bg-success border-success text-success-foreground" : "border-border hover:border-accent"
                      }`}
                    >
                      {isComplete && <CheckSquare className="w-3 h-3" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${isComplete ? "line-through text-muted-foreground" : "text-foreground"}`}>
                        {task.title}
                      </p>
                      <p className="text-xs text-muted-foreground">{task.stage} • Due: {task.dueDate}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </motion.div>
      )}

      {/* Emails */}
      {activeTab === "emails" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="flex justify-end mb-4">
            <Button onClick={() => setShowComposeEmail(!showComposeEmail)} className="gap-2">
              <Mail className="w-4 h-4" /> Compose Email
            </Button>
          </div>
          {showComposeEmail && (
            <div className="bg-card border border-border rounded-lg p-6 mb-6">
              <h3 className="font-display font-semibold text-foreground mb-4">Compose Email</h3>
              <div className="space-y-3">
                <Input placeholder="To:" value={composeTo || client?.email || ""} onChange={(e) => setComposeTo(e.target.value)} />
                <Input placeholder="Subject:" value={composeSubject || `Re: ${project.propertyAddress}`} onChange={(e) => setComposeSubject(e.target.value)} />
                <Textarea placeholder="Write your email..." rows={5} value={composeBody} onChange={(e) => setComposeBody(e.target.value)} />
                {emailAttachments.length > 0 && (
                  <div className="bg-secondary/40 rounded-lg p-3">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                      Attachments ({emailAttachments.length})
                    </p>
                    <div className="space-y-1">
                      {emailAttachments.map(name => (
                        <div key={name} className="flex items-center gap-2 text-xs">
                          <Paperclip className="w-3 h-3 text-muted-foreground" />
                          <span className="text-foreground">{name}</span>
                          <button
                            onClick={() => setEmailAttachments(prev => prev.filter(n => n !== name))}
                            className="ml-auto text-muted-foreground hover:text-destructive"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => { setShowComposeEmail(false); setEmailAttachments([]); }}>Cancel</Button>
                  <Button className="gap-2" onClick={() => {
                    sendEmailStore({
                      to: composeTo || client?.email || "",
                      subject: composeSubject || `Re: ${project.propertyAddress}`,
                      body: composeBody,
                      projectId: project.id,
                    });
                    toast.success("Email sent & logged to transaction!");
                    setShowComposeEmail(false);
                    setEmailAttachments([]);
                    setComposeTo(""); setComposeSubject(""); setComposeBody("");
                  }}>
                    <Send className="w-4 h-4" /> Send
                  </Button>
                </div>
              </div>
            </div>
          )}
          <div className="bg-card border border-border rounded-lg">
            <div className="px-6 py-4 border-b border-border">
              <h3 className="font-display font-semibold text-foreground">Communication Thread</h3>
            </div>
            {project.emails.length > 0 ? (
              <div className="divide-y divide-border">
                {project.emails.map(email => (
                  <div key={email.id} className="px-6 py-4">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        email.direction === "outbound" ? "bg-info/15 text-info" : "bg-success/15 text-success"
                      }`}>
                        {email.direction === "outbound" ? "Sent" : "Received"}
                      </span>
                      <span className="text-xs text-muted-foreground">{email.date}</span>
                    </div>
                    <p className="text-sm font-medium text-foreground">{email.subject}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {email.direction === "outbound" ? `To: ${email.to}` : `From: ${email.from}`}
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">{email.body}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="px-6 py-8 text-center text-muted-foreground text-sm">No emails yet.</div>
            )}
          </div>
        </motion.div>
      )}

      {/* Notes */}
      {activeTab === "notes" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-card border border-border rounded-lg p-6">
          <h3 className="font-display font-semibold text-foreground mb-4">Transaction Notes</h3>
          <Textarea placeholder="Add a timestamped note..." rows={3} className="mb-2" />
          <Button size="sm" onClick={() => toast.success("Note added")}>Add Note</Button>
          <div className="mt-6 space-y-3">
            <div className="border-l-2 border-accent pl-3">
              <p className="text-xs text-muted-foreground">2026-02-22 · Kathryn</p>
              <p className="text-sm text-foreground">Spoke with Sarah; she'll send the SPQ by EOD Friday.</p>
            </div>
            <div className="border-l-2 border-border pl-3">
              <p className="text-xs text-muted-foreground">2026-02-15 · Kathryn</p>
              <p className="text-sm text-foreground">NHD report ordered from disclosure source.</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Timeline */}
      {activeTab === "calendar" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="bg-card border border-border rounded-lg">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <h3 className="font-display font-semibold text-foreground">Deadlines & Reminders</h3>
              <Button size="sm" variant="outline" onClick={() => setShowAddDeadline((v) => !v)} className="gap-1">
                <Plus className="w-3 h-3" /> Add Deadline
              </Button>
            </div>
            {showAddDeadline && (
              <div className="px-6 py-3 border-b border-border bg-secondary/20 flex items-center gap-2">
                <Input placeholder="Title (e.g. Final Walkthrough)" value={newDeadlineTitle} onChange={(e) => setNewDeadlineTitle(e.target.value)} className="flex-1" />
                <Input type="date" value={newDeadlineDate} onChange={(e) => setNewDeadlineDate(e.target.value)} className="w-44" />
                <Button size="sm" onClick={() => {
                  if (!newDeadlineTitle.trim() || !newDeadlineDate) { toast.error("Title and date required"); return; }
                  addProjectDeadlineStore(project.id, newDeadlineTitle.trim(), newDeadlineDate, "deadline");
                  setNewDeadlineTitle(""); setNewDeadlineDate(""); setShowAddDeadline(false);
                  toast.success("Deadline added");
                }}>Save</Button>
              </div>
            )}
            <div className="divide-y divide-border">
              {project.deadlines.map(dl => (
                <div key={dl.id} className="flex items-center justify-between px-6 py-4">
                  <div>
                    <p className="text-sm font-medium text-foreground">{dl.title}</p>
                    <p className="text-xs text-muted-foreground">{dl.type === "deadline" ? "📅 Deadline" : "🔔 Reminder"}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-accent font-medium">{dl.date}</span>
                    <Button size="sm" variant="outline" onClick={() => openReminderDraft(dl.title, dl.date)}>
                      Draft Reminder
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* Reminder Draft Modal */}
      <Dialog open={!!reminderDraft} onOpenChange={() => setReminderDraft(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5 text-accent" />
              Auto-Drafted Reminder
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">To</label>
              <Input value={reminderTo} onChange={e => setReminderTo(e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Subject</label>
              <Input value={reminderSubject} onChange={e => setReminderSubject(e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Message</label>
              <Textarea value={reminderBody} onChange={e => setReminderBody(e.target.value)} rows={8} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReminderDraft(null)}>Cancel</Button>
            <Button onClick={sendReminder} className="gap-2">
              <Send className="w-4 h-4" /> Send Reminder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
