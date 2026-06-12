import { useEffect, useState } from "react";
import { CheckSquare, Mail, MessageSquare, Pencil, Plus, Trash2 } from "lucide-react";
import type { Project, ProjectTask } from "@/data/mockData";
import { listEmailTemplatesFromApi } from "@/api/emailTemplates";
import { ALL_STAGES } from "@/types/domain";
import { getApiBaseUrl } from "@/lib/apiConfig";
import type { TransactionRecipientSuggestion } from "@/lib/transactionRecipientSuggestions";
import { useAppStore } from "@/store/appStore";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { listPageBodyClass, transactionTabCardClass } from "@/lib/listPageLayout";
import { cn } from "@/lib/utils";
import { dueDateBucket, dueDateClass } from "@/lib/transactionListUtils";

type TaskFilter = "All" | "Pending" | "In Progress" | "Complete";

type TaskEditPayload = {
  title: string;
  stage: string;
  status: ProjectTask["status"];
  dueDate: string;
  taskType?: ProjectTask["taskType"];
  emailTemplateId?: string;
  recipientEmail?: string;
};

type Props = {
  project: Project;
  tasks: ProjectTask[];
  taskFilter: TaskFilter;
  onTaskFilterChange: (filter: TaskFilter) => void;
  showAddTask: boolean;
  onToggleAddTask: () => void;
  newTaskTitle: string;
  onNewTaskTitleChange: (v: string) => void;
  newTaskDueDate: string;
  onNewTaskDueDateChange: (v: string) => void;
  newTaskType?: ProjectTask["taskType"];
  onNewTaskTypeChange?: (v: ProjectTask["taskType"]) => void;
  newTaskEmailTemplateId?: string;
  onNewTaskEmailTemplateIdChange?: (v: string) => void;
  newTaskRecipientEmail?: string;
  onNewTaskRecipientEmailChange?: (v: string) => void;
  recipientSuggestions?: TransactionRecipientSuggestion[];
  onComposeEmailTask?: (task: ProjectTask) => void;
  onSaveNewTask: () => void;
  onToggleTaskComplete: (taskId: string, isComplete: boolean) => void;
  onMarkAllComplete: () => void;
  onResetAll: () => void;
  canEdit?: boolean;
  onUpdateTask?: (taskId: string, payload: TaskEditPayload) => void;
  onDeleteTask?: (taskId: string) => void;
  onAddTaskNote?: (taskId: string, body: string) => void;
  onUpdateTaskNote?: (taskId: string, noteId: string, body: string) => void;
  onDeleteTaskNote?: (taskId: string, noteId: string) => void;
  taskNoteBusy?: string | null;
};

type TaskNote = NonNullable<ProjectTask["notes"]>[number];

function taskStatusBadgeClass(status: ProjectTask["status"]): string {
  switch (status) {
    case "Complete":
      return "bg-success/15 text-success border-success/30";
    case "In Progress":
      return "bg-info/15 text-info border-info/30";
    default:
      return "bg-secondary text-muted-foreground border-border";
  }
}

export default function TransactionTasksTab({
  project,
  tasks,
  taskFilter,
  onTaskFilterChange,
  showAddTask,
  onToggleAddTask,
  newTaskTitle,
  onNewTaskTitleChange,
  newTaskDueDate,
  onNewTaskDueDateChange,
  newTaskType = "general",
  onNewTaskTypeChange,
  newTaskEmailTemplateId = "",
  onNewTaskEmailTemplateIdChange,
  newTaskRecipientEmail = "",
  onNewTaskRecipientEmailChange,
  recipientSuggestions = [],
  onComposeEmailTask,
  onSaveNewTask,
  onToggleTaskComplete,
  onMarkAllComplete,
  onResetAll,
  canEdit = true,
  onUpdateTask,
  onDeleteTask,
  onAddTaskNote,
  onUpdateTaskNote,
  onDeleteTaskNote,
  taskNoteBusy = null,
}: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editStage, setEditStage] = useState("");
  const [editStatus, setEditStatus] = useState<ProjectTask["status"]>("Pending");
  const [editDueDate, setEditDueDate] = useState("");
  const [editTaskType, setEditTaskType] = useState<ProjectTask["taskType"]>("general");
  const [editEmailTemplateId, setEditEmailTemplateId] = useState("");
  const [editRecipientEmail, setEditRecipientEmail] = useState("");
  const [taskNoteDrafts, setTaskNoteDrafts] = useState<Record<string, string>>({});
  const apiOn = Boolean(getApiBaseUrl());
  const emailTemplates = useAppStore((s) => s.emailTemplates);
  const setEmailTemplates = useAppStore((s) => s.setEmailTemplates);
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
  const [editingTaskNote, setEditingTaskNote] = useState<{ taskId: string; noteId: string } | null>(null);
  const [editTaskNoteBody, setEditTaskNoteBody] = useState("");

  const allTasks = project.tasks ?? [];
  const pendingCount = allTasks.filter((t) => t.status === "Pending").length;
  const inProgressCount = allTasks.filter((t) => t.status === "In Progress").length;
  const completeCount = allTasks.filter((t) => t.status === "Complete").length;

  const startEdit = (task: ProjectTask) => {
    setEditingId(task.id);
    setEditTitle(task.title);
    setEditStage(task.stage);
    setEditStatus(task.status);
    setEditDueDate(task.dueDate ?? "");
    setEditTaskType(task.taskType ?? "general");
    setEditEmailTemplateId(task.emailTemplateId ?? "");
    setEditRecipientEmail(task.recipientEmail ?? "");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditTitle("");
    setEditStage("");
    setEditStatus("Pending");
    setEditDueDate("");
    setEditTaskType("general");
    setEditEmailTemplateId("");
    setEditRecipientEmail("");
  };

  const isEmailTask = (task: ProjectTask) => (task.taskType ?? "general") === "email";

  const renderEmailTaskFields = (
    taskType: ProjectTask["taskType"],
    onTypeChange: (v: ProjectTask["taskType"]) => void,
    templateId: string,
    onTemplateChange: (v: string) => void,
    recipientEmail: string,
    onRecipientChange: (v: string) => void,
    idPrefix: string,
  ) => (
    <>
      <div className="space-y-2">
        <Label className="text-xs" htmlFor={`${idPrefix}-task-type`}>
          Task type
        </Label>
        <Select value={taskType ?? "general"} onValueChange={(v) => onTypeChange(v as ProjectTask["taskType"])}>
          <SelectTrigger id={`${idPrefix}-task-type`} className="h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="general">General</SelectItem>
            <SelectItem value="email">Email</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {taskType === "email" ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-xs" htmlFor={`${idPrefix}-template`}>
              Email template
            </Label>
            <Select
              value={templateId || undefined}
              onValueChange={onTemplateChange}
            >
              <SelectTrigger id={`${idPrefix}-template`} className="h-9">
                <SelectValue
                  placeholder={
                    loadingTemplates
                      ? "Loading templates…"
                      : emailTemplates.length === 0
                        ? "No templates"
                        : "Choose template (optional)"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {emailTemplates.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs" htmlFor={`${idPrefix}-recipient`}>
              Default recipient
            </Label>
            <Select
              value={recipientEmail || undefined}
              onValueChange={onRecipientChange}
            >
              <SelectTrigger id={`${idPrefix}-recipient`} className="h-9">
                <SelectValue placeholder="Choose party (optional)" />
              </SelectTrigger>
              <SelectContent>
                {recipientSuggestions.map((s) => (
                  <SelectItem key={`${s.email}-${s.label}`} value={s.email}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      ) : null}
    </>
  );

  const saveEdit = (taskId: string) => {
    const title = editTitle.trim();
    if (!title) return;
    onUpdateTask?.(taskId, {
      title,
      stage: editStage,
      status: editStatus,
      dueDate: editDueDate,
      taskType: editTaskType ?? "general",
      ...(editTaskType === "email"
        ? {
            emailTemplateId: editEmailTemplateId || undefined,
            recipientEmail: editRecipientEmail.trim() || undefined,
          }
        : { emailTemplateId: "", recipientEmail: "" }),
    });
    cancelEdit();
  };

  const cancelEditTaskNote = () => {
    setEditingTaskNote(null);
    setEditTaskNoteBody("");
  };

  const startEditTaskNote = (taskId: string, note: TaskNote) => {
    setEditingTaskNote({ taskId, noteId: note.id });
    setEditTaskNoteBody(note.text);
  };

  const saveTaskNote = (task: ProjectTask) => {
    const body = (taskNoteDrafts[task.id] ?? "").trim();
    if (!body) return;
    onAddTaskNote?.(task.id, body);
    setTaskNoteDrafts((prev) => ({ ...prev, [task.id]: "" }));
  };

  const saveEditTaskNote = (taskId: string, noteId: string) => {
    const body = editTaskNoteBody.trim();
    if (!body) return;
    onUpdateTaskNote?.(taskId, noteId, body);
    cancelEditTaskNote();
  };

  return (
    <div className={transactionTabCardClass}>
      <div className="shrink-0 space-y-3 border-b border-border p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="font-display text-sm font-semibold text-foreground">Task roadmap</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">{project.stage} · {allTasks.length} tasks</p>
          </div>
          {canEdit && (
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" variant="outline" onClick={onToggleAddTask} className="h-8 gap-1">
                <Plus className="h-3.5 w-3.5" /> Add task
              </Button>
              <Button size="sm" variant="outline" className="h-8 text-xs" onClick={onMarkAllComplete}>
                Mark all complete
              </Button>
              <Button size="sm" variant="outline" className="h-8 text-xs" onClick={onResetAll}>
                Reset all
              </Button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-lg border border-border/70 bg-muted/20 px-3 py-2 text-center">
            <p className="font-display text-lg font-bold tabular-nums text-foreground">{pendingCount}</p>
            <p className="text-[10px] text-muted-foreground">Pending</p>
          </div>
          <div className="rounded-lg border border-border/70 bg-muted/20 px-3 py-2 text-center">
            <p className="font-display text-lg font-bold tabular-nums text-foreground">{inProgressCount}</p>
            <p className="text-[10px] text-muted-foreground">In progress</p>
          </div>
          <div className="rounded-lg border border-border/70 bg-muted/20 px-3 py-2 text-center">
            <p className="font-display text-lg font-bold tabular-nums text-foreground">{completeCount}</p>
            <p className="text-[10px] text-muted-foreground">Complete</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-1 rounded-lg bg-muted/30 p-1">
          {(["All", "Pending", "In Progress", "Complete"] as const).map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => onTaskFilterChange(status)}
              className={cn(
                "rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
                taskFilter === status
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {showAddTask && canEdit ? (
        <div className="shrink-0 space-y-3 border-b border-border bg-muted/20 px-4 py-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Input
              placeholder="Task title (e.g. Send disclosure package)"
              value={newTaskTitle}
              onChange={(e) => onNewTaskTitleChange(e.target.value)}
              className="flex-1"
            />
            <Input
              type="date"
              value={newTaskDueDate}
              onChange={(e) => onNewTaskDueDateChange(e.target.value)}
              className="w-full sm:w-44"
            />
            <Button size="sm" onClick={onSaveNewTask} className="shrink-0">
              Save
            </Button>
          </div>
          {onNewTaskTypeChange
            ? renderEmailTaskFields(
                newTaskType,
                onNewTaskTypeChange,
                newTaskEmailTemplateId,
                onNewTaskEmailTemplateIdChange ?? (() => undefined),
                newTaskRecipientEmail,
                onNewTaskRecipientEmailChange ?? (() => undefined),
                "new-task",
              )
            : null}
        </div>
      ) : null}

      <div className={listPageBodyClass}>
        {tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
            <p className="text-sm font-medium text-foreground">No tasks match this filter</p>
            <p className="mt-1 text-xs text-muted-foreground">Add a task or change the filter above.</p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {tasks.map((task) => {
              const isComplete = task.status === "Complete";
              const dueBucket = dueDateBucket(task.dueDate);
              const isEditing = editingId === task.id;

              return (
                <li
                  key={task.id}
                  className={cn(
                    "px-4 py-3 transition-colors hover:bg-muted/20",
                    dueBucket === "overdue" && !isComplete && "border-l-2 border-l-destructive bg-destructive/5",
                  )}
                >
                  {isEditing ? (
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <Label className="text-xs">Title</Label>
                        <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
                      </div>
                      <div className="grid gap-3 sm:grid-cols-3">
                        <div className="space-y-2">
                          <Label className="text-xs">Stage</Label>
                          <Select value={editStage} onValueChange={setEditStage}>
                            <SelectTrigger className="h-9">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {ALL_STAGES.map((stage) => (
                                <SelectItem key={stage} value={stage}>
                                  {stage}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs">Status</Label>
                          <Select value={editStatus} onValueChange={(v) => setEditStatus(v as ProjectTask["status"])}>
                            <SelectTrigger className="h-9">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Pending">Pending</SelectItem>
                              <SelectItem value="In Progress">In Progress</SelectItem>
                              <SelectItem value="Complete">Complete</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs">Due date</Label>
                          <Input type="date" value={editDueDate} onChange={(e) => setEditDueDate(e.target.value)} />
                        </div>
                      </div>
                      {renderEmailTaskFields(
                        editTaskType,
                        setEditTaskType,
                        editEmailTemplateId,
                        setEditEmailTemplateId,
                        editRecipientEmail,
                        setEditRecipientEmail,
                        `edit-${task.id}`,
                      )}
                      <div className="flex justify-end gap-2">
                        <Button type="button" size="sm" variant="outline" onClick={cancelEdit}>
                          Cancel
                        </Button>
                        <Button type="button" size="sm" disabled={!editTitle.trim()} onClick={() => saveEdit(task.id)}>
                          Save
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-3">
                      {canEdit ? (
                        <button
                          type="button"
                          onClick={() => onToggleTaskComplete(task.id, isComplete)}
                          className={cn(
                            "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-colors",
                            isComplete ? "border-success bg-success text-success-foreground" : "border-border hover:border-primary",
                          )}
                          aria-label={isComplete ? "Mark incomplete" : "Mark complete"}
                        >
                          {isComplete ? <CheckSquare className="h-3 w-3" /> : null}
                        </button>
                      ) : (
                        <div
                          className={cn(
                            "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border-2",
                            isComplete ? "border-success bg-success text-success-foreground" : "border-border",
                          )}
                        >
                          {isComplete ? <CheckSquare className="h-3 w-3" /> : null}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className={cn("text-sm font-medium", isComplete && "text-muted-foreground line-through")}>
                            {task.title}
                          </p>
                          <Badge variant="outline" className={cn("text-[10px] font-semibold", taskStatusBadgeClass(task.status))}>
                            {task.status}
                          </Badge>
                          {isEmailTask(task) ? (
                            <Badge variant="outline" className="border-info/40 bg-info/10 text-[10px] font-semibold text-info">
                              Email
                            </Badge>
                          ) : null}
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {task.stage}
                          <span className="mx-1">·</span>
                          <span className={cn("tabular-nums", dueDateClass(dueBucket))}>
                            Due {task.dueDate?.trim() || "—"}
                          </span>
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        {isEmailTask(task) && onComposeEmailTask ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            aria-label="Compose email for task"
                            title="Compose email"
                            onClick={() => onComposeEmailTask(task)}
                          >
                            <Mail className="h-3.5 w-3.5 text-info" />
                          </Button>
                        ) : null}
                        <Popover>
                          <PopoverTrigger asChild>
                            <button
                              type="button"
                              className="relative inline-flex h-7 w-7 items-center justify-center rounded hover:bg-muted"
                              aria-label="Task notes"
                            >
                              <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
                              {(task.notes ?? []).length > 0 ? (
                                <span className="absolute -right-0.5 -top-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-accent text-[8px] font-bold text-accent-foreground">
                                  {(task.notes ?? []).length}
                                </span>
                              ) : null}
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="w-80" align="end">
                            <p className="mb-2 text-xs font-semibold">Notes — {task.title}</p>
                            <div className="max-h-48 space-y-2 overflow-y-auto pr-1">
                              {(task.notes ?? []).length === 0 ? (
                                <p className="text-xs text-muted-foreground">No notes yet.</p>
                              ) : (
                                (task.notes ?? []).map((n) => {
                                  const isEditing =
                                    editingTaskNote?.taskId === task.id && editingTaskNote.noteId === n.id;
                                  const editLoading = taskNoteBusy === `edit:${task.id}:${n.id}`;
                                  const deleteLoading = taskNoteBusy === `delete:${task.id}:${n.id}`;
                                  return (
                                    <div key={n.id} className="rounded border border-border bg-secondary/20 p-2">
                                      <div className="flex items-start justify-between gap-1">
                                        <p className="text-[10px] text-muted-foreground">
                                          {n.date}
                                          {n.updatedAt && n.updatedAt !== n.date ? (
                                            <span className="italic"> · edited {n.updatedAt}</span>
                                          ) : null}
                                          <span> · {n.author}</span>
                                        </p>
                                        {canEdit && !isEditing ? (
                                          <div className="flex shrink-0 gap-0.5">
                                            <button
                                              type="button"
                                              className="inline-flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
                                              aria-label="Edit note"
                                              disabled={Boolean(taskNoteBusy)}
                                              onClick={() => startEditTaskNote(task.id, n)}
                                            >
                                              <Pencil className="h-3 w-3" />
                                            </button>
                                            <button
                                              type="button"
                                              className="inline-flex h-6 w-6 items-center justify-center rounded text-destructive hover:bg-destructive/10"
                                              aria-label="Delete note"
                                              disabled={Boolean(taskNoteBusy)}
                                              onClick={() => onDeleteTaskNote?.(task.id, n.id)}
                                            >
                                              <Trash2 className="h-3 w-3" />
                                            </button>
                                          </div>
                                        ) : null}
                                      </div>
                                      {isEditing ? (
                                        <div className="mt-1.5 space-y-1.5">
                                          <Textarea
                                            rows={3}
                                            className="text-xs"
                                            value={editTaskNoteBody}
                                            onChange={(e) => setEditTaskNoteBody(e.target.value)}
                                          />
                                          <div className="flex justify-end gap-1">
                                            <Button
                                              type="button"
                                              size="sm"
                                              variant="outline"
                                              className="h-7 px-2 text-xs"
                                              onClick={cancelEditTaskNote}
                                              disabled={editLoading}
                                            >
                                              Cancel
                                            </Button>
                                            <Button
                                              type="button"
                                              size="sm"
                                              className="h-7 px-2 text-xs"
                                              onClick={() => saveEditTaskNote(task.id, n.id)}
                                              disabled={editLoading || !editTaskNoteBody.trim()}
                                            >
                                              Save
                                            </Button>
                                          </div>
                                        </div>
                                      ) : (
                                        <p className="mt-1 whitespace-pre-wrap text-xs text-foreground">{n.text}</p>
                                      )}
                                      {deleteLoading ? (
                                        <p className="mt-1 text-[10px] text-muted-foreground">Deleting…</p>
                                      ) : null}
                                    </div>
                                  );
                                })
                              )}
                            </div>
                            {canEdit && onAddTaskNote ? (
                              <div className="mt-3 space-y-2 border-t border-border pt-3">
                                <Textarea
                                  rows={2}
                                  className="text-xs"
                                  placeholder="Add a note…"
                                  value={taskNoteDrafts[task.id] ?? ""}
                                  onChange={(e) =>
                                    setTaskNoteDrafts((prev) => ({ ...prev, [task.id]: e.target.value }))
                                  }
                                />
                                <Button
                                  type="button"
                                  size="sm"
                                  className="h-7 w-full text-xs"
                                  disabled={
                                    taskNoteBusy === `add:${task.id}` ||
                                    !(taskNoteDrafts[task.id] ?? "").trim()
                                  }
                                  onClick={() => saveTaskNote(task)}
                                >
                                  {taskNoteBusy === `add:${task.id}` ? "Saving…" : "Add note"}
                                </Button>
                              </div>
                            ) : null}
                          </PopoverContent>
                        </Popover>
                        {canEdit && onUpdateTask && onDeleteTask ? (
                          <>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              aria-label="Edit task"
                              onClick={() => startEdit(task)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              aria-label="Delete task"
                              onClick={() => onDeleteTask(task.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        ) : null}
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
