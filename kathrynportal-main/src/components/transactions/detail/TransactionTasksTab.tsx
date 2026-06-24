import { useEffect, useMemo, useState } from "react";
import { CheckSquare, ExternalLink, Mail, Pencil, Plus, Trash2 } from "lucide-react";
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
import { groupTasksBySection, hasTaskSections } from "@/lib/taskSectionGroups";
import TaskNotesPopover from "@/components/transactions/detail/TaskNotesPopover";
import ThreadNotesPreview from "@/components/shared/ThreadNotesPreview";

type TaskFilter = "All" | "Pending" | "In Progress" | "Complete";

type TaskEditPayload = {
  title: string;
  stage: string;
  status: ProjectTask["status"];
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
  onCancelAddTask?: () => void;
  newTaskTitle: string;
  onNewTaskTitleChange: (v: string) => void;
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
  onCancelAddTask,
  newTaskTitle,
  onNewTaskTitleChange,
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
  const [openNotesTaskId, setOpenNotesTaskId] = useState<string | null>(null);

  const allTasks = project.tasks ?? [];
  const sectionGroups = useMemo(() => groupTasksBySection(tasks), [tasks]);
  const showSectionHeaders = hasTaskSections(tasks);
  const pendingCount = allTasks.filter((t) => t.status === "Pending").length;
  const inProgressCount = allTasks.filter((t) => t.status === "In Progress").length;
  const completeCount = allTasks.filter((t) => t.status === "Complete").length;

  const startEdit = (task: ProjectTask) => {
    setEditingId(task.id);
    setEditTitle(task.title);
    setEditStage(task.stage);
    setEditStatus(task.status);
    setEditTaskType(task.taskType ?? "general");
    setEditEmailTemplateId(task.emailTemplateId ?? "");
    setEditRecipientEmail(task.recipientEmail ?? "");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditTitle("");
    setEditStage("");
    setEditStatus("Pending");
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

  const renderTaskActions = (task: ProjectTask) => (
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
      {task.instructionUrl?.trim() ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          aria-label="Open task instructions"
          title="Open instructions"
          asChild
        >
          <a href={task.instructionUrl} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
          </a>
        </Button>
      ) : null}
      <TaskNotesPopover
        task={task}
        noteDraft={taskNoteDrafts[task.id] ?? ""}
        onNoteDraftChange={(value) => setTaskNoteDrafts((prev) => ({ ...prev, [task.id]: value }))}
        editingNote={editingTaskNote}
        editNoteBody={editTaskNoteBody}
        onEditNoteBodyChange={setEditTaskNoteBody}
        noteActionKey={taskNoteBusy}
        canEdit={canEdit && Boolean(onAddTaskNote)}
        onStartEdit={startEditTaskNote}
        onCancelEdit={cancelEditTaskNote}
        onUpdateNote={(taskId, noteId) => saveEditTaskNote(taskId, noteId)}
        onDeleteNote={(taskId, noteId) => onDeleteTaskNote?.(taskId, noteId)}
        onSaveNote={saveTaskNote}
        open={openNotesTaskId === task.id}
        onOpenChange={(isOpen) => setOpenNotesTaskId(isOpen ? task.id : null)}
      />
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
  );

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
            <div className="flex w-full shrink-0 gap-2 sm:w-auto">
              <Button size="sm" variant="outline" onClick={onCancelAddTask ?? onToggleAddTask} className="flex-1 sm:flex-none">
                Cancel
              </Button>
              <Button size="sm" onClick={onSaveNewTask} className="flex-1 sm:flex-none">
                Save
              </Button>
            </div>
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
          <div className="divide-y divide-border">
            {sectionGroups.map((group) => (
              <div key={group.section}>
                {showSectionHeaders ? (
                  <div className="border-b border-border bg-secondary/25 px-4 py-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {group.section}
                    </p>
                  </div>
                ) : null}
                <ul className="divide-y divide-border">
                  {group.tasks.map((task) => {
              const isComplete = task.status === "Complete";
              const isEditing = editingId === task.id;

              return (
                <li
                  key={task.id}
                  className="px-4 py-3 transition-colors hover:bg-muted/20"
                >
                  {isEditing ? (
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <Label className="text-xs">Title</Label>
                        <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
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
                    <div className="grid grid-cols-[auto_1fr_auto] gap-x-3 gap-y-2 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)_auto] lg:items-start lg:gap-4">
                      <div className="row-start-1 col-start-1 flex min-w-0 gap-3 self-start pt-0.5 lg:col-start-1 lg:row-start-1">
                        {canEdit ? (
                          <button
                            type="button"
                            onClick={() => onToggleTaskComplete(task.id, isComplete)}
                            className={cn(
                              "flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-colors",
                              isComplete ? "border-success bg-success text-success-foreground" : "border-border hover:border-primary",
                            )}
                            aria-label={isComplete ? "Mark incomplete" : "Mark complete"}
                          >
                            {isComplete ? <CheckSquare className="h-3 w-3" /> : null}
                          </button>
                        ) : (
                          <div
                            className={cn(
                              "flex h-5 w-5 shrink-0 items-center justify-center rounded border-2",
                              isComplete ? "border-success bg-success text-success-foreground" : "border-border",
                            )}
                          >
                            {isComplete ? <CheckSquare className="h-3 w-3" /> : null}
                          </div>
                        )}
                        <div className="hidden min-w-0 flex-1 lg:block">
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
                          <p className="mt-0.5 text-xs text-muted-foreground">{task.stage}</p>
                        </div>
                      </div>
                      <div className="row-start-1 col-start-2 min-w-0 lg:hidden">
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
                        <p className="mt-0.5 text-xs text-muted-foreground">{task.stage}</p>
                      </div>
                      <div className="row-start-1 col-start-3 self-start lg:col-start-3 lg:row-start-1">
                        {renderTaskActions(task)}
                      </div>
                      <div className="row-start-2 col-start-2 col-span-2 min-w-0 overflow-hidden lg:col-start-2 lg:row-start-1 lg:col-span-1 lg:pt-0.5">
                        <p className="mb-1 hidden text-[10px] font-semibold uppercase tracking-wide text-muted-foreground lg:block">
                          Notes
                        </p>
                        <ThreadNotesPreview
                          notes={task.notes ?? []}
                          onOpenAllNotes={() => setOpenNotesTaskId(task.id)}
                        />
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
