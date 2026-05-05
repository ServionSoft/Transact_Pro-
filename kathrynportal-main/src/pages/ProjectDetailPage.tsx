import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft, FileText, CheckSquare, Mail, Calendar, Clock, Send,
  Paperclip, PenLine, Plus, X, Save, MessageSquare, Trash2, Printer, Download,
} from "lucide-react";
import { useState, useMemo, useLayoutEffect, useEffect } from "react";
import { useAppStore } from "@/store/appStore";
import {
  createProjectDeadlineApi,
  createProjectEmailApi,
  deleteProjectEmailApi,
  createProjectNoteApi,
  createProjectTaskApi,
  deleteProjectApi,
  getProjectFromApi,
  listProjectAssignmentOptionsApi,
  patchProjectNextStepApi,
  patchProjectTaskStatusApi,
  patchProjectTasksBulkStatusApi,
  setProjectAssignmentsApi,
} from "@/api/projects";
import { getApiBaseUrl } from "@/lib/apiConfig";
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
import { useAuthStore } from "@/store/authStore";
import { hasPermission } from "@/lib/permissions";

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
  const upsertProject = useAppStore((s) => s.upsertProject);
  const deleteProjectStore = useAppStore((s) => s.deleteProject);
  const clients = useAppStore((s) => s.clients);
  const user = useAuthStore((s) => s.user);
  const setNextStepStore = useAppStore((s) => s.setNextStep);
  const addProjectTaskStore = useAppStore((s) => s.addProjectTask);
  const setTaskStatusStore = useAppStore((s) => s.setTaskStatus);
  const addProjectDeadlineStore = useAppStore((s) => s.addProjectDeadline);
  const sendEmailStore = useAppStore((s) => s.sendEmail);
  const removeProjectEmailStore = useAppStore((s) => s.removeProjectEmail);
  const apiOn = Boolean(getApiBaseUrl());
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
  const [showAddTask, setShowAddTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDueDate, setNewTaskDueDate] = useState("");
  const [taskFilter, setTaskFilter] = useState<"All" | "Pending" | "In Progress" | "Complete">("All");
  const [newNoteBody, setNewNoteBody] = useState("");
  const [assignmentOptions, setAssignmentOptions] = useState<Array<{ id: string; name: string; email: string; designation?: string | null }>>([]);
  const [savingAssignments, setSavingAssignments] = useState(false);

  // Reminder draft modal
  const [reminderDraft, setReminderDraft] = useState<{ title: string; date: string } | null>(null);
  const [reminderSubject, setReminderSubject] = useState("");
  const [reminderBody, setReminderBody] = useState("");
  const [reminderTo, setReminderTo] = useState("");
  const [loadingProject, setLoadingProject] = useState(false);
  const [deletingProject, setDeletingProject] = useState(false);
  const canDeleteProject = hasPermission(user, "projects.delete");
  const canAssignMembers = hasPermission(user, "projects.assign_members");
  const canEditProject = hasPermission(user, "projects.edit");

  const sortedDeadlines = useMemo(
    () => [...(project?.deadlines ?? [])].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    [project?.deadlines]
  );

  useEffect(() => {
    if (id === CRM_DOCUMENT_VAULT_PROJECT_ID) return;
    if (!id || !getApiBaseUrl()) return;
    let cancelled = false;
    setLoadingProject(true);
    void getProjectFromApi(id)
      .then((loaded) => {
        if (!cancelled) upsertProject(loaded);
      })
      .catch((e) => {
        if (!cancelled) {
          toast.error(e instanceof Error ? e.message : "Could not load transaction.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingProject(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, upsertProject]);

  useEffect(() => {
    if (!apiOn || !canAssignMembers) return;
    let cancelled = false;
    void listProjectAssignmentOptionsApi()
      .then((rows) => {
        if (!cancelled) setAssignmentOptions(rows);
      })
      .catch(() => {
        if (!cancelled) setAssignmentOptions([]);
      });
    return () => {
      cancelled = true;
    };
  }, [apiOn, canAssignMembers]);

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
  const visibleTasks = useMemo(() => {
    const list = project?.tasks ?? [];
    if (taskFilter === "All") return list;
    return list.filter((t) => t.status === taskFilter);
  }, [project?.tasks, taskFilter]);

  if (!project) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">{loadingProject ? "Loading transaction..." : "Transaction not found."}</p>
        <Button variant="outline" onClick={() => navigate("/projects")} className="mt-4">Back to Transactions</Button>
      </div>
    );
  }

  const client = clients.find(c => c.id === project.clientId);
  const transactionMeta = (
    project.metadata &&
    typeof project.metadata === "object" &&
    "transaction" in project.metadata &&
    project.metadata.transaction &&
    typeof project.metadata.transaction === "object"
  ) ? (project.metadata.transaction as Record<string, unknown>) : null;
  const rpaSeller = typeof transactionMeta?.rpaSeller === "string" ? transactionMeta.rpaSeller : "";
  const prelimSeller = typeof transactionMeta?.prelimSeller === "string" ? transactionMeta.prelimSeller : "";
  const sellerMatchOverride = typeof transactionMeta?.sellerMatchOverride === "string" ? transactionMeta.sellerMatchOverride : "";
  const sellerMismatchNotes = typeof transactionMeta?.sellerMismatchNotes === "string" ? transactionMeta.sellerMismatchNotes : "";
  const autoSellerMatch = rpaSeller.trim() && prelimSeller.trim()
    ? rpaSeller.toLowerCase().replace(/[^a-z0-9]/g, "") === prelimSeller.toLowerCase().replace(/[^a-z0-9]/g, "")
      ? "Yes"
      : "No"
    : "Pending";
  const effectiveSellerMatch = sellerMatchOverride === "yes"
    ? "Yes"
    : sellerMatchOverride === "no"
      ? "No"
      : autoSellerMatch;

  const openNextStepEdit = () => {
    setNextStepText(project.nextStep);
    setNextStepDate(project.nextStepDate);
    setActiveTab("overview");
    setEditingNextStep(true);
  };

  const saveNextStep = () => {
    if (!project) return;
    if (getApiBaseUrl()) {
      void patchProjectNextStepApi(project.id, nextStepText, nextStepDate)
        .then((updated) => {
          upsertProject(updated);
          toast.success("Next step updated", { description: `"${nextStepText}" — due ${nextStepDate}` });
          setEditingNextStep(false);
        })
        .catch((e) => {
          toast.error(e instanceof Error ? e.message : "Could not update next step.");
        });
      return;
    }
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

  const handleDeleteProject = () => {
    if (!project || deletingProject) return;
    if (!canDeleteProject) {
      toast.error("You do not have permission to delete this transaction.");
      return;
    }
    const confirmed = window.confirm(`Delete transaction "${project.propertyAddress}"? This action archives it from active lists.`);
    if (!confirmed) return;
    if (!getApiBaseUrl()) {
      deleteProjectStore(project.id);
      toast.success("Transaction deleted.");
      navigate("/projects");
      return;
    }
    setDeletingProject(true);
    void deleteProjectApi(project.id)
      .then(() => {
        deleteProjectStore(project.id);
        toast.success("Transaction deleted.");
        navigate("/projects");
      })
      .catch((e) => {
        toast.error(e instanceof Error ? e.message : "Could not delete transaction.");
      })
      .finally(() => {
        setDeletingProject(false);
      });
  };

  const downloadDeadlinesCsv = () => {
    const escapeCsv = (value: string) => {
      const v = value ?? "";
      if (/[",\n]/.test(v)) return `"${v.replace(/"/g, "\"\"")}"`;
      return v;
    };
    const rows = [
      ["Title", "Type", "Date", "Transaction", "Property Address", "Client"],
      ...sortedDeadlines.map((dl) => [
        dl.title,
        dl.type,
        dl.date,
        project.name,
        project.propertyAddress,
        project.clientName,
      ]),
    ];
    const csv = `${rows.map((r) => r.map((c) => escapeCsv(String(c ?? ""))).join(",")).join("\n")}\n`;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const fileBase = project.propertyAddress.split(",")[0]?.trim().replace(/\s+/g, "-").toLowerCase() || "transaction";
    a.href = url;
    a.download = `${fileBase}-deadlines.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Deadlines CSV downloaded.");
  };

  return (
    <div className="p-5 md:p-6 max-w-7xl mx-auto space-y-3">
      <button onClick={() => navigate("/projects")} className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Transactions
      </button>

      <div className="bg-card border border-border rounded-lg px-4 py-3 md:px-5 md:py-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h1 className="text-xl md:text-2xl font-display font-bold text-foreground truncate">{project.propertyAddress.split(",")[0]}</h1>
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
          <p className="text-xs md:text-sm text-muted-foreground">
            {project.clientName} <span className="mx-1">•</span> {project.listPrice}
          </p>
          </div>
          <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => navigate(`/email?to=${project.clientName}`)} className="gap-1.5 h-8">
            <Mail className="w-3.5 h-3.5" /> Email
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5 h-8" onClick={() => navigate(`/projects/${project.id}/edit`)}>
            <PenLine className="w-3.5 h-3.5" /> Update
          </Button>
          {canDeleteProject && (
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 h-8 text-destructive border-destructive/40 hover:bg-destructive/10"
              onClick={handleDeleteProject}
              disabled={deletingProject}
            >
              <Trash2 className="w-3.5 h-3.5" /> {deletingProject ? "Deleting..." : "Delete"}
            </Button>
          )}
          </div>
        </div>
      </div>

      {/* DocuSign status indicator */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mr-1">DocuSign:</span>
        <span className="text-[11px] px-2 py-0.5 rounded-full bg-status-out-sig/15 text-status-out-sig font-medium">
          {sigCounts.out} out for signature
        </span>
        <span className="text-[11px] px-2 py-0.5 rounded-full bg-status-signed/15 text-status-signed font-medium">
          {sigCounts.signed} signed
        </span>
        <span className="text-[11px] px-2 py-0.5 rounded-full bg-status-needs-sig/15 text-status-needs-sig font-medium">
          {sigCounts.awaiting} awaiting
        </span>
      </div>

      {/* Next Step Banner */}
      <div className="bg-accent/10 border border-accent/20 rounded-lg px-3 py-2.5 mb-2">
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
          <div className="flex items-center gap-2.5">
            <Clock className="w-4 h-4 text-accent shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground leading-tight">{project.nextStep}</p>
              <p className="text-xs text-muted-foreground">Next step due: {project.nextStepDate}</p>
            </div>
            <Button size="sm" variant="outline" onClick={openNextStepEdit} className="gap-1 h-8">
              <PenLine className="w-3 h-3" /> Update
            </Button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border mb-3 overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs md:text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? "border-accent text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <tab.icon className="w-3.5 h-3.5" /> {tab.label}
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
              ["Transaction type", project.type],
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
                View contact profile →
              </Link>
            </div>
          </div>
          <div className="md:col-span-2 bg-card border border-border rounded-lg p-6 space-y-4">
            <h3 className="font-display font-semibold text-foreground">Seller Identity Check</h3>
            {[
              ["RPA Seller", rpaSeller || "Not provided"],
              ["Prelim Seller", prelimSeller || "Not provided"],
              ["Seller Name Match?", effectiveSellerMatch],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between text-sm gap-4">
                <span className="text-muted-foreground">{label}</span>
                <span className="text-foreground font-medium text-right">{value}</span>
              </div>
            ))}
            {effectiveSellerMatch === "No" && (
              <div className="pt-2 border-t border-border">
                <p className="text-xs text-muted-foreground mb-1">Mismatch Notes</p>
                <p className="text-sm text-foreground">{sellerMismatchNotes || "No notes added."}</p>
              </div>
            )}
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
          <div className="md:col-span-2 bg-card border border-border rounded-lg p-6">
            <h3 className="font-display font-semibold text-foreground mb-3">Team Assignments</h3>
            {(project.assignees ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No team members assigned.</p>
            ) : (
              <div className="flex flex-wrap gap-2 mb-4">
                {(project.assignees ?? []).map((a) => (
                  <span key={a.userId} className="text-xs px-2 py-1 rounded-full bg-secondary text-foreground">
                    {a.name}{a.designation ? ` · ${a.designation}` : ""}
                  </span>
                ))}
              </div>
            )}
            {canAssignMembers && apiOn && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Select assignees for this transaction:</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {assignmentOptions.map((member) => {
                    const checked = (project.assignees ?? []).some((a) => a.userId === member.id);
                    return (
                      <label key={member.id} className="flex items-center gap-2 text-sm border border-border rounded-md px-2 py-1.5">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            const current = project.assignees ?? [];
                            const nextIds = e.target.checked
                              ? [...current.map((a) => a.userId), member.id]
                              : current.map((a) => a.userId).filter((id) => id !== member.id);
                            setSavingAssignments(true);
                            void setProjectAssignmentsApi(project.id, [...new Set(nextIds)])
                              .then((updated) => {
                                upsertProject(updated);
                              })
                              .catch((err) => {
                                toast.error(err instanceof Error ? err.message : "Could not update assignments.");
                              })
                              .finally(() => setSavingAssignments(false));
                          }}
                          disabled={savingAssignments}
                        />
                        <span>{member.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
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
          <div className="mb-3 rounded-md border border-border bg-secondary/20 px-3 py-2.5">
            <p className="text-xs text-muted-foreground">
              Upload is disabled on this tab by design. Use the{" "}
              <Link to="/documents" className="text-accent font-medium hover:underline">
                Documents
              </Link>{" "}
              hub for uploads/checklist/DocuSign. This tab is for browsing and organizing stored files.
            </p>
            <div className="mt-2">
              <Button size="sm" variant="outline" onClick={() => navigate("/documents")}>
                Open Documents Hub
              </Button>
            </div>
          </div>
          <TransactionDocumentsWorkspace projectId={project.id} view="pool-only" allowPoolUpload={false} />
        </motion.div>
      )}

      {/* Tasks */}
      {activeTab === "tasks" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="bg-card border border-border rounded-lg">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <h3 className="font-display font-semibold text-foreground">Task Roadmap</h3>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => setShowAddTask((v) => !v)}>
                  <Plus className="w-3 h-3 mr-1" /> Add Task
                </Button>
                <div className="flex items-center gap-1 bg-secondary rounded-md p-1">
                  {(["All", "Pending", "In Progress", "Complete"] as const).map((status) => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => setTaskFilter(status)}
                      className={`px-2.5 py-1 text-xs rounded transition-colors ${
                        taskFilter === status
                          ? "bg-background text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const taskIds = project.tasks.map((t) => t.id);
                    if (taskIds.length === 0) return;
                    if (apiOn) {
                      void patchProjectTasksBulkStatusApi(project.id, taskIds, "Complete")
                        .then((updated) => {
                          upsertProject(updated);
                          toast.success("All tasks marked complete.");
                        })
                        .catch((e) => {
                          toast.error(e instanceof Error ? e.message : "Could not update tasks.");
                        });
                      return;
                    }
                    for (const task of project.tasks) {
                      setTaskStatusStore(project.id, task.id, "Complete");
                    }
                    toast.success("All tasks marked complete.");
                  }}
                >
                  Mark All Complete
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const taskIds = project.tasks.map((t) => t.id);
                    if (taskIds.length === 0) return;
                    if (apiOn) {
                      void patchProjectTasksBulkStatusApi(project.id, taskIds, "Pending")
                        .then((updated) => {
                          upsertProject(updated);
                          toast.success("All tasks reset to pending.");
                        })
                        .catch((e) => {
                          toast.error(e instanceof Error ? e.message : "Could not update tasks.");
                        });
                      return;
                    }
                    for (const task of project.tasks) {
                      setTaskStatusStore(project.id, task.id, "Pending");
                    }
                    toast.success("All tasks reset to pending.");
                  }}
                >
                  Reset All
                </Button>
              </div>
            </div>
            {showAddTask && (
              <div className="px-6 py-3 border-b border-border bg-secondary/20 flex items-center gap-2">
                <Input
                  placeholder="Task title (e.g. Upload signed disclosures)"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  className="flex-1"
                />
                <Input
                  type="date"
                  value={newTaskDueDate}
                  onChange={(e) => setNewTaskDueDate(e.target.value)}
                  className="w-44"
                />
                <Button
                  size="sm"
                  onClick={() => {
                    const title = newTaskTitle.trim();
                    if (!title) {
                      toast.error("Task title is required.");
                      return;
                    }
                    if (apiOn) {
                      void createProjectTaskApi(project.id, {
                        title,
                        stage: project.stage,
                        dueDate: newTaskDueDate || undefined,
                      })
                        .then((updated) => {
                          upsertProject(updated);
                          setNewTaskTitle("");
                          setNewTaskDueDate("");
                          setShowAddTask(false);
                          toast.success("Task added.");
                        })
                        .catch((e) => {
                          toast.error(e instanceof Error ? e.message : "Could not add task.");
                        });
                      return;
                    }
                    addProjectTaskStore(project.id, {
                      title,
                      stage: project.stage,
                      status: "Pending",
                      dueDate: newTaskDueDate || new Date().toISOString().split("T")[0],
                    });
                    setNewTaskTitle("");
                    setNewTaskDueDate("");
                    setShowAddTask(false);
                    toast.success("Task added.");
                  }}
                >
                  Save
                </Button>
              </div>
            )}
            <div className="divide-y divide-border">
              {visibleTasks.map(task => {
                const isComplete = task.status === "Complete";
                return (
                  <div key={task.id} className="flex items-center gap-4 px-6 py-3">
                    <button
                      onClick={() => {
                        const nextStatus = isComplete ? "Pending" : "Complete";
                        if (apiOn) {
                          void patchProjectTaskStatusApi(project.id, task.id, nextStatus)
                            .then((updated) => {
                              upsertProject(updated);
                              toast.success(isComplete ? "Task unchecked" : "Task completed!");
                            })
                            .catch((e) => {
                              toast.error(e instanceof Error ? e.message : "Could not update task.");
                            });
                          return;
                        }
                        setTaskStatusStore(project.id, task.id, nextStatus);
                        toast.success(isComplete ? "Task unchecked" : "Task completed!");
                      }}
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                        isComplete ? "bg-success border-success text-success-foreground" : "border-border hover:border-accent"
                      }`}
                    >
                      {isComplete && <CheckSquare className="w-3 h-3" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={`text-sm font-medium ${isComplete ? "line-through text-muted-foreground" : "text-foreground"}`}>
                          {task.title}
                        </p>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                            task.status === "Complete"
                              ? "bg-success/15 text-success"
                              : task.status === "In Progress"
                                ? "bg-info/15 text-info"
                                : "bg-secondary text-muted-foreground"
                          }`}
                        >
                          {task.status}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">{task.stage} • Due: {task.dueDate}</p>
                    </div>
                  </div>
                );
              })}
              {visibleTasks.length === 0 && (
                <div className="px-6 py-8 text-center text-sm text-muted-foreground">
                  No tasks match this filter.
                </div>
              )}
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
                    const payload = {
                      to: composeTo || client?.email || "",
                      subject: composeSubject || `Re: ${project.propertyAddress}`,
                      body: composeBody,
                    };
                    if (apiOn) {
                      void createProjectEmailApi(project.id, payload)
                        .then(({ project: updated, emailSendFailed, emailSendError }) => {
                          upsertProject(updated);
                          if (emailSendFailed) {
                            toast.warning("Email saved; sending failed", {
                              description: emailSendError ?? "Check SMTP settings and the Communications thread.",
                            });
                          } else {
                            toast.success("Email sent.");
                          }
                          setShowComposeEmail(false);
                          setEmailAttachments([]);
                          setComposeTo(""); setComposeSubject(""); setComposeBody("");
                        })
                        .catch((e) => {
                          toast.error(e instanceof Error ? e.message : "Could not send email.");
                        });
                      return;
                    }
                    sendEmailStore({ ...payload, projectId: project.id });
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
                    <div className="flex items-start justify-between gap-3 mb-1">
                      <div className="flex items-center gap-2 flex-wrap min-w-0">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          email.direction === "outbound" ? "bg-info/15 text-info" : "bg-success/15 text-success"
                        }`}>
                          {email.direction === "outbound" ? "Outbound" : "Received"}
                        </span>
                        {email.direction === "outbound" && (
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full ${
                              (email.deliveryStatus ?? "sent") === "sent"
                                ? "bg-success/15 text-success"
                                : (email.deliveryStatus ?? "sent") === "pending"
                                  ? "bg-secondary text-muted-foreground"
                                  : "bg-destructive/15 text-destructive"
                            }`}
                          >
                            {(email.deliveryStatus ?? "sent") === "sent"
                              ? "Delivered"
                              : (email.deliveryStatus ?? "sent") === "pending"
                                ? "Sending…"
                                : "Failed"}
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground">{email.date}</span>
                      </div>
                      {canEditProject && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 shrink-0 text-muted-foreground hover:text-destructive"
                          title="Delete from thread"
                          onClick={() => {
                            if (!window.confirm("Remove this message from the communication thread? This cannot be undone.")) return;
                            if (apiOn) {
                              void deleteProjectEmailApi(project.id, email.id)
                                .then((updated) => {
                                  upsertProject(updated);
                                  toast.success("Email removed from thread.");
                                })
                                .catch((e) => {
                                  toast.error(e instanceof Error ? e.message : "Could not delete email.");
                                });
                            } else {
                              removeProjectEmailStore(project.id, email.id);
                              toast.success("Email removed from thread.");
                            }
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                    <p className="text-sm font-medium text-foreground">{email.subject}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {email.direction === "outbound" ? `To: ${email.to}` : `From: ${email.from}`}
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">{email.body}</p>
                    {email.direction === "outbound" && email.deliveryStatus === "failed" && email.deliveryError ? (
                      <p className="text-xs text-destructive mt-2">{email.deliveryError}</p>
                    ) : null}
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
          <Textarea
            placeholder="Add a timestamped note..."
            rows={3}
            className="mb-2"
            value={newNoteBody}
            onChange={(e) => setNewNoteBody(e.target.value)}
          />
          <Button
            size="sm"
            onClick={() => {
              const body = newNoteBody.trim();
              if (!body) {
                toast.error("Note text is required.");
                return;
              }
              if (apiOn) {
                void createProjectNoteApi(project.id, body)
                  .then((updated) => {
                    upsertProject(updated);
                    setNewNoteBody("");
                    toast.success("Note added.");
                  })
                  .catch((e) => {
                    toast.error(e instanceof Error ? e.message : "Could not add note.");
                  });
                return;
              }
              const localNote = {
                id: `n-${Date.now()}`,
                body,
                author: user?.name ?? "Kathryn",
                createdAt: new Date().toISOString().split("T")[0],
              };
              upsertProject({ ...project, notes: [localNote, ...(project.notes ?? [])] });
              setNewNoteBody("");
              toast.success("Note added.");
            }}
          >
            Add Note
          </Button>
          <div className="mt-6 space-y-3">
            {(project.notes ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No notes yet.</p>
            ) : (
              (project.notes ?? []).map((note, index) => (
                <div key={note.id} className={`border-l-2 pl-3 ${index === 0 ? "border-accent" : "border-border"}`}>
                  <p className="text-xs text-muted-foreground">{note.createdAt} · {note.author}</p>
                  <p className="text-sm text-foreground">{note.body}</p>
                </div>
              ))
            )}
          </div>
        </motion.div>
      )}

      {/* Timeline */}
      {activeTab === "calendar" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="px-4 py-2.5 border-b border-border flex items-center justify-between">
              <h3 className="font-display font-semibold text-foreground">Deadlines & Reminders</h3>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1 h-8"
                  onClick={() => navigate(`/projects/${project.id}/deadlines/print`)}
                >
                  <Printer className="w-3.5 h-3.5" /> Print PDF
                </Button>
                <Button size="sm" variant="outline" className="gap-1 h-8" onClick={downloadDeadlinesCsv}>
                  <Download className="w-3.5 h-3.5" /> CSV
                </Button>
                <Button size="sm" variant="outline" onClick={() => setShowAddDeadline((v) => !v)} className="gap-1 h-8">
                  <Plus className="w-3 h-3" /> Add Deadline
                </Button>
              </div>
            </div>
            {showAddDeadline && (
              <div className="px-4 py-2.5 border-b border-border bg-secondary/20 flex items-center gap-2">
                <Input placeholder="Title (e.g. Final Walkthrough)" value={newDeadlineTitle} onChange={(e) => setNewDeadlineTitle(e.target.value)} className="flex-1" />
                <Input type="date" value={newDeadlineDate} onChange={(e) => setNewDeadlineDate(e.target.value)} className="w-44" />
                <Button size="sm" onClick={() => {
                  if (!newDeadlineTitle.trim() || !newDeadlineDate) { toast.error("Title and date required"); return; }
                  if (apiOn) {
                    void createProjectDeadlineApi(project.id, {
                      title: newDeadlineTitle.trim(),
                      date: newDeadlineDate,
                      type: "deadline",
                    })
                      .then((updated) => {
                        upsertProject(updated);
                        setNewDeadlineTitle(""); setNewDeadlineDate(""); setShowAddDeadline(false);
                        toast.success("Deadline added");
                      })
                      .catch((e) => {
                        toast.error(e instanceof Error ? e.message : "Could not add deadline.");
                      });
                    return;
                  }
                  addProjectDeadlineStore(project.id, newDeadlineTitle.trim(), newDeadlineDate, "deadline");
                  setNewDeadlineTitle(""); setNewDeadlineDate(""); setShowAddDeadline(false);
                  toast.success("Deadline added");
                }}>Save</Button>
              </div>
            )}
            <div className="divide-y divide-border max-h-[62vh] overflow-y-auto">
              {sortedDeadlines.map(dl => (
                <div key={dl.id} className="flex items-center justify-between px-4 py-2.5 gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{dl.title}</p>
                    <p className="text-xs text-muted-foreground">{dl.type === "deadline" ? "📅 Deadline" : "🔔 Reminder"}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs md:text-sm text-accent font-medium">{dl.date}</span>
                    <Button size="sm" variant="outline" className="h-7 px-2.5 text-xs" onClick={() => openReminderDraft(dl.title, dl.date)}>
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
