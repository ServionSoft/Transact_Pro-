import { useParams, useNavigate, useLocation } from "react-router-dom";
import {
  Mail, Calendar, Send,
  PenLine, Plus, Save, MessageSquare, Trash2, Printer, Download,
} from "lucide-react";
import { useState, useMemo, useLayoutEffect, useEffect, useRef } from "react";
import { useAppStore } from "@/store/appStore";
import {
  createProjectDeadlineApi,
  createProjectReminderDraftApi,
  createProjectEmailApi,
  deleteProjectEmailApi,
  createProjectNoteApi,
  updateProjectNoteApi,
  deleteProjectNoteApi,
  updateProjectDeadlineDateApi,
  deleteProjectDeadlineApi,
  createProjectTaskApi,
  updateProjectTaskApi,
  deleteProjectTaskApi,
  createProjectTaskNoteApi,
  updateProjectTaskNoteApi,
  deleteProjectTaskNoteApi,
  deleteProjectApi,
  getProjectFromApi,
  listProjectAssignmentOptionsApi,
  patchProjectNextStepApi,
  patchProjectTaskStatusApi,
  patchProjectTasksBulkStatusApi,
  setProjectAssignmentsApi,
} from "@/api/projects";
import { getApiBaseUrl } from "@/lib/apiConfig";
import { ApiRequestError } from "@/api/storedFiles";
import TransactionDocumentsWorkspace from "@/components/documents/TransactionDocumentsWorkspace";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { CRM_DOCUMENT_VAULT_PROJECT_ID, type EmailThread } from "@/data/mockData";
import { useAuthStore } from "@/store/authStore";
import { hasPermission } from "@/lib/permissions";
import { getTransactionPartyGroups } from "@/lib/transactionMetadataParties";
import { getTransactionRecipientSuggestions } from "@/lib/transactionRecipientSuggestions";
import TransactionDetailHeader from "@/components/transactions/detail/TransactionDetailHeader";
import TransactionEmailsTab from "@/components/transactions/detail/TransactionEmailsTab";
import TransactionNotesTab from "@/components/transactions/detail/TransactionNotesTab";
import TransactionDetailTabBar from "@/components/transactions/detail/TransactionDetailTabBar";
import TransactionNextStepBanner from "@/components/transactions/detail/TransactionNextStepBanner";
import TransactionOverviewTab from "@/components/transactions/detail/TransactionOverviewTab";
import DocuSignStatusStrip from "@/components/transactions/detail/DocuSignStatusStrip";
import TransactionTabPanel from "@/components/transactions/detail/TransactionTabPanel";
import TransactionTasksTab from "@/components/transactions/detail/TransactionTasksTab";
import type { TransactionDetailTabId } from "@/components/transactions/detail/transactionDetailTabs";
import type { ProjectDetailLocationState } from "@/lib/projectDetailNavigation";
import { useConfirmDialog } from "@/hooks/useConfirmDialog";
import {
  embeddedTabBodyClass,
  transactionDetailRootClass,
  transactionDetailTabShellClass,
  transactionTabCardClass,
} from "@/lib/listPageLayout";
import { cn } from "@/lib/utils";

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export default function ProjectDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
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
  const updateProjectTaskStore = useAppStore((s) => s.updateProjectTask);
  const deleteProjectTaskStore = useAppStore((s) => s.deleteProjectTask);
  const addProjectTaskNoteStore = useAppStore((s) => s.addProjectTaskNote);
  const updateProjectTaskNoteStore = useAppStore((s) => s.updateProjectTaskNote);
  const deleteProjectTaskNoteStore = useAppStore((s) => s.deleteProjectTaskNote);
  const addProjectDeadlineStore = useAppStore((s) => s.addProjectDeadline);
  const updateProjectNoteStore = useAppStore((s) => s.updateProjectNote);
  const deleteProjectNoteStore = useAppStore((s) => s.deleteProjectNote);
  const updateProjectDeadlineDateStore = useAppStore((s) => s.updateProjectDeadlineDate);
  const deleteProjectDeadlineStore = useAppStore((s) => s.deleteProjectDeadline);
  const sendEmailStore = useAppStore((s) => s.sendEmail);
  const removeProjectEmailStore = useAppStore((s) => s.removeProjectEmail);
  const apiOn = Boolean(getApiBaseUrl());
  const [activeTab, setActiveTab] = useState<TransactionDetailTabId>("overview");

  const [savingNextStep, setSavingNextStep] = useState(false);
  const [taskNoteBusy, setTaskNoteBusy] = useState<string | null>(null);

  // Email compose
  const [showComposeEmail, setShowComposeEmail] = useState(false);
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
  const [reminderDraft, setReminderDraft] = useState<{ deadlineId?: string; title: string; date: string } | null>(null);
  const [reminderSubject, setReminderSubject] = useState("");
  const [reminderBody, setReminderBody] = useState("");
  const [reminderTo, setReminderTo] = useState("");
  const [sendingReminder, setSendingReminder] = useState(false);
  const [savingReminderDraft, setSavingReminderDraft] = useState(false);
  const [loadingProject, setLoadingProject] = useState(() => Boolean(getApiBaseUrl() && id));
  const [loadFailure, setLoadFailure] = useState<{ code?: string; message: string } | null>(null);
  const [deletingProject, setDeletingProject] = useState(false);
  const canDeleteProject = hasPermission(user, "projects.delete");
  const canAssignMembers = hasPermission(user, "projects.assign_members");
  const canEditProject = hasPermission(user, "projects.edit");
  const { confirm, ConfirmDialogHost } = useConfirmDialog();

  const sortedDeadlines = useMemo(
    () => [...(project?.deadlines ?? [])].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    [project?.deadlines]
  );

  useEffect(() => {
    if (id === CRM_DOCUMENT_VAULT_PROJECT_ID) return;
    if (!id || !getApiBaseUrl()) return;
    let cancelled = false;
    setLoadingProject(true);
    setLoadFailure(null);
    void getProjectFromApi(id)
      .then((loaded) => {
        if (!cancelled) {
          setLoadFailure(null);
          upsertProject(loaded);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          const code = e instanceof ApiRequestError ? e.code : undefined;
          const message = e instanceof Error ? e.message : "Could not load transaction.";
          setLoadFailure({ code, message });
          toast.error(message);
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
    const signed = list.filter(
      (d) =>
        d.status === "Signed — Needs Upload" ||
        d.status === "Signed" ||
        d.status === "Complete" ||
        d.status === "Completed"
    ).length;
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

  const clientForEmail = useMemo(() => {
    if (!project) return undefined;
    return clients.find((c) => c.id === project.clientId);
  }, [clients, project]);

  const emailRecipientSuggestions = useMemo(
    () => getTransactionRecipientSuggestions(project ?? null, clientForEmail),
    [project, clientForEmail],
  );

  const consumedNavRef = useRef<string | null>(null);

  useEffect(() => {
    if (!project) return;
    const state = location.state as ProjectDetailLocationState | null | undefined;
    if (!state?.tab) return;
    const token = `${location.key}:${state.tab}:${state.composeEmail ?? ""}`;
    if (consumedNavRef.current === token) return;
    consumedNavRef.current = token;
    setActiveTab(state.tab);
    if (state.tab === "emails") {
      setShowComposeEmail(true);
      const email = state.composeEmail?.trim() || clients.find((c) => c.id === project.clientId)?.email?.trim();
      if (email) setComposeTo(email);
      setComposeSubject((prev) => prev.trim() || `Re: ${project.propertyAddress}`);
    }
    navigate(location.pathname, { replace: true, state: {} });
  }, [project, location.key, location.state, location.pathname, navigate, clients]);

  /** Stale list cache can leave a row in the store after detail API returns 404. */
  const showUnavailableState = !project || (!loadingProject && loadFailure != null);

  if (showUnavailableState) {
    const deleted = loadFailure?.code === "PROJECT_DELETED";
    const notFound = loadFailure?.code === "PROJECT_NOT_FOUND" || !project;
    return (
      <div className="mx-auto flex min-h-[50vh] w-full max-w-7xl flex-col items-center justify-center p-8 text-center">
        <p className="text-muted-foreground">
          {loadingProject
            ? "Loading transaction…"
            : deleted
              ? loadFailure?.message ?? "This transaction was deleted."
              : notFound
                ? loadFailure?.message ?? "Transaction not found."
                : loadFailure?.message ?? "Could not load this transaction."}
        </p>
        {!loadingProject && deleted ? (
          <p className="mt-2 max-w-md text-xs text-muted-foreground">
            Deleted transactions are hidden from the list. To restore one in the database, clear{" "}
            <code className="rounded bg-muted px-1">deleted_at</code> on that row in{" "}
            <code className="rounded bg-muted px-1">projects</code> (or create a new transaction).
          </p>
        ) : null}
        {!loadingProject && notFound ? (
          <p className="mt-2 max-w-md text-xs text-muted-foreground">
            This ID may not exist on the server you are connected to (for example, a link from local data opened on
            production).
          </p>
        ) : null}
        {!loadingProject ? (
          <Button variant="outline" onClick={() => navigate("/projects")} className="mt-4">
            Back to Transactions
          </Button>
        ) : null}
      </div>
    );
  }

  const client = clientForEmail;
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

  const metadataRecord =
    project.metadata && typeof project.metadata === "object" && !Array.isArray(project.metadata)
      ? (project.metadata as Record<string, unknown>)
      : undefined;
  const partyGroups = getTransactionPartyGroups(metadataRecord);
  const nextDeadline = sortedDeadlines[0] ?? null;
  const tasksComplete = (project.tasks ?? []).filter((t) => t.status === "Complete").length;

  const openTransactionEmail = (email?: string) => {
    setActiveTab("emails");
    setShowComposeEmail(true);
    if (email?.trim()) {
      setComposeTo(email.trim());
    } else {
      setComposeTo(client?.email ?? "");
    }
    setComposeSubject((prev) => prev.trim() || `Re: ${project.propertyAddress}`);
  };

  const handleAssignmentsChange = (userIds: string[]) => {
    setSavingAssignments(true);
    void setProjectAssignmentsApi(project.id, userIds)
      .then((updated) => {
        upsertProject(updated);
      })
      .catch((err) => {
        toast.error(err instanceof Error ? err.message : "Could not update assignments.");
      })
      .finally(() => {
        setSavingAssignments(false);
      });
  };

  const saveNextStep = (text: string, date: string) => {
    if (!project) return;
    if (getApiBaseUrl()) {
      setSavingNextStep(true);
      void patchProjectNextStepApi(project.id, text, date)
        .then((updated) => {
          upsertProject(updated);
        })
        .catch((e) => {
          toast.error(e instanceof Error ? e.message : "Could not update next step.");
        })
        .finally(() => {
          setSavingNextStep(false);
        });
      return;
    }
    setNextStepStore(project.id, text, date);
  };

  const openReminderDraft = (deadlineId: string, title: string, date: string) => {
    setReminderDraft({ deadlineId, title, date });
    setReminderTo(client?.email || "");
    setReminderSubject(`Upcoming Deadline - ${title} - ${project.propertyAddress.split(",")[0]}`);
    setReminderBody(
      `Hi ${client?.name || ""},\n\nThis is a reminder that the ${title} for ${project.propertyAddress} is due on ${date}.\n\nPlease ensure all required items are submitted before this date.\n\nBest regards,\nKathryn Santos`
    );
  };

  const sendReminder = () => {
    if (!project) return;
    const payload = {
      to: reminderTo.trim(),
      subject: reminderSubject.trim(),
      body: reminderBody.trim(),
    };
    if (!payload.to || !payload.subject || !payload.body) {
      toast.error("To, subject, and email are required.");
      return;
    }
    if (!isValidEmail(payload.to)) {
      toast.error("Recipient email is invalid.");
      return;
    }
    if (apiOn) {
      setSendingReminder(true);
      void createProjectEmailApi(project.id, payload)
        .then(({ project: updated, emailSendFailed, emailSendError }) => {
          upsertProject(updated);
          if (emailSendFailed) {
            toast.warning("Reminder saved; sending failed", {
              description: emailSendError ?? "Check SMTP settings and the Communications thread.",
            });
          } else {
            toast.success("Reminder sent", { description: `For "${reminderDraft?.title}" â†’ ${payload.to}` });
          }
          setReminderDraft(null);
        })
        .catch((e) => {
          toast.error(e instanceof Error ? e.message : "Could not send reminder.");
        })
        .finally(() => {
          setSendingReminder(false);
        });
      return;
    }
    sendEmailStore({ ...payload, projectId: project.id });
    toast.success("Reminder sent", { description: `For "${reminderDraft?.title}" â†’ ${payload.to}` });
    setReminderDraft(null);
  };

  const saveReminderDraft = () => {
    if (!project || !apiOn || !reminderDraft) return;
    const payload = {
      projectDeadlineId: reminderDraft.deadlineId,
      reminderType: reminderDraft.title,
      to: reminderTo.trim(),
      subject: reminderSubject.trim(),
      body: reminderBody.trim(),
    };
    if (!payload.to || !payload.subject || !payload.body) {
      toast.error("To, subject, and email are required.");
      return;
    }
    if (!isValidEmail(payload.to)) {
      toast.error("Recipient email is invalid.");
      return;
    }
    setSavingReminderDraft(true);
    void createProjectReminderDraftApi(project.id, payload)
      .then(() => {
        toast.success("Reminder draft saved.");
      })
      .catch((e) => {
        toast.error(e instanceof Error ? e.message : "Could not save reminder draft.");
      })
      .finally(() => {
        setSavingReminderDraft(false);
      });
  };

  const handleDeleteProject = async () => {
    if (!project || deletingProject) return;
    if (!canDeleteProject) {
      toast.error("You do not have permission to delete this transaction.");
      return;
    }
    if (
      !(await confirm({
        title: "Archive transaction",
        description: `Delete transaction "${project.propertyAddress}"? This action archives it from active lists.`,
        confirmLabel: "Archive",
      }))
    ) {
      return;
    }
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

  const handleSaveNewTask = () => {
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
  };

  const handleToggleTaskComplete = (taskId: string, isComplete: boolean) => {
                        const nextStatus = isComplete ? "Pending" : "Complete";
                        if (apiOn) {
      void patchProjectTaskStatusApi(project.id, taskId, nextStatus)
                            .then((updated) => {
                              upsertProject(updated);
                              toast.success(isComplete ? "Task unchecked" : "Task completed!");
                            })
                            .catch((e) => {
                              toast.error(e instanceof Error ? e.message : "Could not update task.");
                            });
                          return;
                        }
    setTaskStatusStore(project.id, taskId, nextStatus);
                        toast.success(isComplete ? "Task unchecked" : "Task completed!");
  };

  const handleMarkAllTasksComplete = () => {
    const taskIds = (project.tasks ?? []).map((t) => t.id);
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
    for (const task of project.tasks ?? []) {
      setTaskStatusStore(project.id, task.id, "Complete");
    }
    toast.success("All tasks marked complete.");
  };

  const handleResetAllTasks = () => {
    const taskIds = (project.tasks ?? []).map((t) => t.id);
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
    for (const task of project.tasks ?? []) {
      setTaskStatusStore(project.id, task.id, "Pending");
    }
    toast.success("All tasks reset to pending.");
  };

  const handleUpdateTask = (
    taskId: string,
    payload: { title: string; stage: string; status: "Pending" | "In Progress" | "Complete"; dueDate: string }
  ) => {
    if (apiOn) {
      void updateProjectTaskApi(project.id, taskId, payload)
        .then((updated) => {
          upsertProject(updated);
          toast.success("Task updated.");
        })
        .catch((e) => {
          toast.error(e instanceof Error ? e.message : "Could not update task.");
        });
      return;
    }
    updateProjectTaskStore(project.id, taskId, payload);
    toast.success("Task updated.");
  };

  const handleAddTaskNote = (taskId: string, body: string) => {
    if (!project) return;
    const trimmed = body.trim();
    if (!trimmed) {
      toast.error("Note text is required.");
      return;
    }
    if (apiOn) {
      setTaskNoteBusy(`add:${taskId}`);
      void createProjectTaskNoteApi(project.id, taskId, trimmed)
        .then((updated) => {
          upsertProject(updated);
          toast.success("Note added.");
        })
        .catch((e) => {
          toast.error(e instanceof Error ? e.message : "Could not add note.");
        })
        .finally(() => {
          setTaskNoteBusy(null);
        });
      return;
    }
    addProjectTaskNoteStore(project.id, taskId, {
      id: `tn-${Date.now()}`,
      date: new Date().toISOString().split("T")[0],
      text: trimmed,
      author: user?.name ?? "Kathryn",
    });
    toast.success("Note added.");
  };

  const handleUpdateTaskNote = (taskId: string, noteId: string, body: string) => {
    if (!project) return;
    const trimmed = body.trim();
    if (!trimmed) {
      toast.error("Note text is required.");
      return;
    }
    if (apiOn) {
      setTaskNoteBusy(`edit:${taskId}:${noteId}`);
      void updateProjectTaskNoteApi(project.id, taskId, noteId, trimmed)
        .then((updated) => {
          upsertProject(updated);
          toast.success("Note updated.");
        })
        .catch((e) => {
          toast.error(e instanceof Error ? e.message : "Could not update note.");
        })
        .finally(() => {
          setTaskNoteBusy(null);
        });
      return;
    }
    updateProjectTaskNoteStore(project.id, taskId, noteId, trimmed);
    toast.success("Note updated.");
  };

  const handleDeleteTaskNote = async (taskId: string, noteId: string) => {
    if (!project) return;
    if (
      !(await confirm({
        title: "Delete note",
        description: "Delete this task note? This cannot be undone.",
        confirmLabel: "Delete",
        destructive: true,
      }))
    ) {
      return;
    }
    if (apiOn) {
      setTaskNoteBusy(`delete:${taskId}:${noteId}`);
      void deleteProjectTaskNoteApi(project.id, taskId, noteId)
        .then((updated) => {
          upsertProject(updated);
          toast.success("Note deleted.");
        })
        .catch((e) => {
          toast.error(e instanceof Error ? e.message : "Could not delete note.");
        })
        .finally(() => {
          setTaskNoteBusy(null);
        });
      return;
    }
    deleteProjectTaskNoteStore(project.id, taskId, noteId);
    toast.success("Note deleted.");
  };

  const handleDeleteTask = async (taskId: string) => {
    const task = (project.tasks ?? []).find((t) => t.id === taskId);
    if (
      !(await confirm({
        title: "Delete task",
        description: task
          ? `Delete "${task.title}"? This cannot be undone.`
          : "Delete this task? This cannot be undone.",
        confirmLabel: "Delete",
        destructive: true,
      }))
    ) {
      return;
    }
    if (apiOn) {
      void deleteProjectTaskApi(project.id, taskId)
        .then((updated) => {
          upsertProject(updated);
          toast.success("Task deleted.");
        })
        .catch((e) => {
          toast.error(e instanceof Error ? e.message : "Could not delete task.");
        });
      return;
    }
    deleteProjectTaskStore(project.id, taskId);
    toast.success("Task deleted.");
  };

  const handleCancelCompose = () => {
    setShowComposeEmail(false);
    setComposeTo("");
    setComposeSubject("");
    setComposeBody("");
  };

  const handleSendEmail = (options?: { templateId?: string }) => {
                    const payload = {
                      to: composeTo || client?.email || "",
                      subject: composeSubject || `Re: ${project.propertyAddress}`,
                      body: composeBody,
                      ...(options?.templateId ? { templateId: options.templateId } : {}),
                    };
                    if (!isValidEmail(payload.to)) {
                      toast.error("Recipient email is invalid.");
                      return;
                    }
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
          handleCancelCompose();
                        })
                        .catch((e) => {
                          toast.error(e instanceof Error ? e.message : "Could not send email.");
                        });
                      return;
                    }
                    sendEmailStore({ ...payload, projectId: project.id });
                    toast.success("Email sent & logged to transaction!");
    handleCancelCompose();
  };

  const handleReplyEmail = (email: EmailThread) => {
    setShowComposeEmail(true);
    const replyTo = email.direction === "outbound" ? email.to : email.from;
    setComposeTo(replyTo);
    const subj = email.subject.trim();
    setComposeSubject(subj.toLowerCase().startsWith("re:") ? subj : `Re: ${subj}`);
    setComposeBody("");
  };

  const handleDeleteEmail = async (emailId: string) => {
    if (
      !(await confirm({
        title: "Remove email",
        description: "Remove this email from the communication thread? This cannot be undone.",
        confirmLabel: "Remove",
      }))
    ) {
      return;
    }
    if (apiOn) {
      void deleteProjectEmailApi(project.id, emailId)
                                .then((updated) => {
                                  upsertProject(updated);
                                  toast.success("Email removed from thread.");
                                })
                                .catch((e) => {
                                  toast.error(e instanceof Error ? e.message : "Could not delete email.");
                                });
      return;
    }
    removeProjectEmailStore(project.id, emailId);
    toast.success("Email removed from thread.");
  };

  const handleAddNote = () => {
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
  };

  const handleUpdateNote = (noteId: string, body: string) => {
    if (apiOn) {
      void updateProjectNoteApi(project.id, noteId, body)
        .then((updated) => {
          upsertProject(updated);
          toast.success("Note updated.");
        })
        .catch((e) => {
          toast.error(e instanceof Error ? e.message : "Could not update note.");
        });
      return;
    }
    updateProjectNoteStore(project.id, noteId, body);
    toast.success("Note updated.");
  };

  const handleDeleteNote = async (noteId: string) => {
    if (
      !(await confirm({
        title: "Delete note",
        description: "Delete this note? This cannot be undone.",
        confirmLabel: "Delete",
        destructive: true,
      }))
    ) {
      return;
    }
    if (apiOn) {
      void deleteProjectNoteApi(project.id, noteId)
        .then((updated) => {
          upsertProject(updated);
          toast.success("Note deleted.");
        })
        .catch((e) => {
          toast.error(e instanceof Error ? e.message : "Could not delete note.");
        });
      return;
    }
    deleteProjectNoteStore(project.id, noteId);
    toast.success("Note deleted.");
  };

  const handleDeadlineDateChange = (deadlineId: string, date: string) => {
    if (!date) {
      toast.error("Deadline date is required.");
      return;
    }
    if (apiOn) {
      void updateProjectDeadlineDateApi(project.id, deadlineId, date)
        .then((updated) => {
          upsertProject(updated);
          toast.success("Deadline updated.");
        })
        .catch((e) => {
          toast.error(e instanceof Error ? e.message : "Could not update deadline.");
        });
      return;
    }
    updateProjectDeadlineDateStore(project.id, deadlineId, date);
    toast.success("Deadline updated.");
  };

  const handleDeleteDeadline = async (deadlineId: string, title: string, formManaged?: boolean) => {
    if (
      !(await confirm({
        title: formManaged ? "Clear deadline date" : "Delete deadline",
        description: formManaged
          ? `Clear the date for "${title}"? The deadline will be removed from the timeline until set again on the transaction form.`
          : `Delete "${title}"? This cannot be undone.`,
        confirmLabel: formManaged ? "Clear date" : "Delete",
        destructive: true,
      }))
    ) {
      return;
    }
    if (apiOn) {
      void deleteProjectDeadlineApi(project.id, deadlineId)
        .then((updated) => {
          upsertProject(updated);
          toast.success(formManaged ? "Deadline date cleared." : "Deadline deleted.");
        })
        .catch((e) => {
          toast.error(e instanceof Error ? e.message : "Could not remove deadline.");
        });
      return;
    }
    deleteProjectDeadlineStore(project.id, deadlineId);
    toast.success(formManaged ? "Deadline date cleared." : "Deadline deleted.");
  };

  const tabUsesOwnScroll =
    activeTab === "documents" ||
    activeTab === "attachments" ||
    activeTab === "tasks" ||
    activeTab === "emails" ||
    activeTab === "notes" ||
    activeTab === "calendar";

  return (
    <div className={transactionDetailRootClass}>
      <div className="shrink-0 space-y-3 border-b border-border/60 pb-3">
        <TransactionDetailHeader
          project={project}
          canDelete={canDeleteProject}
          deleting={deletingProject}
          onDelete={handleDeleteProject}
          onOpenEmail={() => openTransactionEmail()}
        />
        <DocuSignStatusStrip counts={sigCounts} />
        <TransactionNextStepBanner
          nextStep={project.nextStep}
          nextStepDate={project.nextStepDate}
          canEdit={canEditProject}
          saving={savingNextStep}
          onSave={saveNextStep}
        />
        <TransactionDetailTabBar activeTab={activeTab} onTabChange={setActiveTab} />
                </div>

      <TransactionTabPanel scroll={!tabUsesOwnScroll}>
      {activeTab === "overview" && (
        <TransactionOverviewTab
          project={project}
          metadata={metadataRecord}
          docProgress={docProgress}
          sigCounts={sigCounts}
          tasksComplete={tasksComplete}
          tasksTotal={(project.tasks ?? []).length}
          deadlinesCount={(project.deadlines ?? []).length}
          filesCount={(project.attachments ?? []).length}
          nextDeadline={nextDeadline ? { title: nextDeadline.title, date: nextDeadline.date } : null}
          partyGroups={partyGroups}
          effectiveSellerMatch={effectiveSellerMatch}
          assignmentOptions={assignmentOptions}
          canAssignMembers={canAssignMembers}
          apiOn={apiOn}
          savingAssignments={savingAssignments}
          onNavigateTab={setActiveTab}
          onAssignmentsChange={handleAssignmentsChange}
          onEmailParty={(email) => openTransactionEmail(email)}
        />
      )}

      {activeTab === "documents" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className={transactionDetailTabShellClass}
        >
          <TransactionDocumentsWorkspace
            projectId={project.id}
            view="checklist-only"
            embeddedInTransactionTab
          />
        </motion.div>
      )}

      {activeTab === "attachments" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className={cn(transactionDetailTabShellClass, "gap-2")}
        >
          <p className="shrink-0 text-xs text-muted-foreground">
            Browse and organize stored files. Upload and checklist actions live on the Documents tab or the Documents hub.
          </p>
          <TransactionDocumentsWorkspace
            projectId={project.id}
            view="pool-only"
            allowPoolUpload={false}
            embeddedInTransactionTab
          />
        </motion.div>
      )}

      {activeTab === "tasks" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className={transactionDetailTabShellClass}
        >
          <TransactionTasksTab
            project={project}
            tasks={visibleTasks}
            taskFilter={taskFilter}
            onTaskFilterChange={setTaskFilter}
            showAddTask={showAddTask}
            onToggleAddTask={() => setShowAddTask((v) => !v)}
            newTaskTitle={newTaskTitle}
            onNewTaskTitleChange={setNewTaskTitle}
            newTaskDueDate={newTaskDueDate}
            onNewTaskDueDateChange={setNewTaskDueDate}
            onSaveNewTask={handleSaveNewTask}
            onToggleTaskComplete={handleToggleTaskComplete}
            onMarkAllComplete={handleMarkAllTasksComplete}
            onResetAll={handleResetAllTasks}
            canEdit={canEditProject}
            onUpdateTask={canEditProject ? handleUpdateTask : undefined}
            onDeleteTask={canEditProject ? handleDeleteTask : undefined}
            onAddTaskNote={canEditProject ? handleAddTaskNote : undefined}
            onUpdateTaskNote={canEditProject ? handleUpdateTaskNote : undefined}
            onDeleteTaskNote={canEditProject ? handleDeleteTaskNote : undefined}
            taskNoteBusy={taskNoteBusy}
          />
        </motion.div>
      )}


      {activeTab === "emails" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className={transactionDetailTabShellClass}
        >
          <TransactionEmailsTab
            project={project}
            emails={project.emails ?? []}
            suggestions={emailRecipientSuggestions}
            defaultRecipient={client?.email ?? ""}
            showCompose={showComposeEmail}
            onToggleCompose={() => setShowComposeEmail((v) => !v)}
            composeTo={composeTo}
            onComposeToChange={setComposeTo}
            composeSubject={composeSubject}
            onComposeSubjectChange={setComposeSubject}
            composeBody={composeBody}
            onComposeBodyChange={setComposeBody}
            onSend={handleSendEmail}
            onCancelCompose={handleCancelCompose}
            onReply={handleReplyEmail}
            onDeleteEmail={handleDeleteEmail}
            canDelete={canEditProject}
          />
        </motion.div>
      )}

      {activeTab === "notes" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className={transactionDetailTabShellClass}
        >
          <TransactionNotesTab
            project={project}
            notes={project.notes ?? []}
            newNoteBody={newNoteBody}
            onNewNoteBodyChange={setNewNoteBody}
            onAddNote={handleAddNote}
            canEdit={canEditProject}
            onUpdateNote={canEditProject ? handleUpdateNote : undefined}
            onDeleteNote={canEditProject ? handleDeleteNote : undefined}
          />
        </motion.div>
      )}

      {/* Timeline */}
      {activeTab === "calendar" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className={transactionDetailTabShellClass}
        >
          <div className={cn(transactionTabCardClass, "overflow-x-hidden rounded-lg")}>
            <div className="flex flex-col gap-2 border-b border-border px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="font-display font-semibold text-foreground">Deadlines & Reminders</h3>
              <div className="flex flex-wrap items-center gap-2">
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
            <div className={cn(embeddedTabBodyClass, "touch-pan-y divide-y divide-border")}>
              {sortedDeadlines.map((dl) => (
                <div
                  key={dl.id}
                  className="touch-pan-y flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:py-2.5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="break-words text-sm font-medium text-foreground">{dl.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {dl.type === "deadline" ? "Deadline" : "Reminder"}
                      {dl.formManaged ? " · From transaction form" : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
                    {canEditProject ? (
                      <Input
                        type="date"
                        value={dl.date}
                        className="h-8 min-w-0 flex-1 text-xs sm:w-36 sm:flex-none"
                        onChange={(e) => {
                          if (e.target.value && e.target.value !== dl.date) {
                            handleDeadlineDateChange(dl.id, e.target.value);
                          }
                        }}
                      />
                    ) : (
                      <span className="text-xs font-medium text-accent md:text-sm">{dl.date}</span>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 flex-1 px-2.5 text-xs sm:h-7 sm:flex-none"
                      onClick={() => openReminderDraft(dl.id, dl.title, dl.date)}
                    >
                      Draft Reminder
                    </Button>
                    {canEditProject && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 shrink-0 p-0 text-destructive hover:text-destructive sm:h-7 sm:w-7"
                        aria-label={dl.formManaged ? "Clear deadline date" : "Delete deadline"}
                        onClick={() => void handleDeleteDeadline(dl.id, dl.title, dl.formManaged)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      </TransactionTabPanel>

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
              <label className="text-sm font-medium text-foreground">Email</label>
              <Textarea value={reminderBody} onChange={e => setReminderBody(e.target.value)} rows={8} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReminderDraft(null)}>Cancel</Button>
            {apiOn && (
              <Button variant="outline" onClick={saveReminderDraft} disabled={savingReminderDraft || sendingReminder} className="gap-2">
                <Save className="w-4 h-4" /> Save Draft
              </Button>
            )}
            <Button onClick={sendReminder} className="gap-2" disabled={sendingReminder}>
              <Send className="w-4 h-4" /> Send Reminder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <ConfirmDialogHost />
    </div>
  );
}
