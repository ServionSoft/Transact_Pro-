import { CheckSquare, Plus } from "lucide-react";
import type { Project, ProjectTask } from "@/data/mockData";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { dueDateBucket, dueDateClass } from "@/lib/transactionListUtils";

type TaskFilter = "All" | "Pending" | "In Progress" | "Complete";

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
  onSaveNewTask: () => void;
  onToggleTaskComplete: (taskId: string, isComplete: boolean) => void;
  onMarkAllComplete: () => void;
  onResetAll: () => void;
};

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
  onSaveNewTask,
  onToggleTaskComplete,
  onMarkAllComplete,
  onResetAll,
}: Props) {
  const allTasks = project.tasks ?? [];
  const pendingCount = allTasks.filter((t) => t.status === "Pending").length;
  const inProgressCount = allTasks.filter((t) => t.status === "In Progress").length;
  const completeCount = allTasks.filter((t) => t.status === "Complete").length;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <div className="shrink-0 space-y-3 border-b border-border p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="font-display text-sm font-semibold text-foreground">Task roadmap</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">{project.stage} · {allTasks.length} tasks</p>
          </div>
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

      {showAddTask ? (
        <div className="shrink-0 flex flex-col gap-2 border-b border-border bg-muted/20 px-4 py-3 sm:flex-row sm:items-center">
          <Input
            placeholder="Task title (e.g. Upload signed disclosures)"
            value={newTaskTitle}
            onChange={(e) => onNewTaskTitleChange(e.target.value)}
            className="flex-1"
          />
          <Input type="date" value={newTaskDueDate} onChange={(e) => onNewTaskDueDateChange(e.target.value)} className="w-full sm:w-44" />
          <Button size="sm" onClick={onSaveNewTask} className="shrink-0">
            Save
          </Button>
        </div>
      ) : null}

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
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
              return (
                <li
                  key={task.id}
                  className={cn(
                    "flex items-start gap-3 px-4 py-3 transition-colors hover:bg-muted/20",
                    dueBucket === "overdue" && !isComplete && "border-l-2 border-l-destructive bg-destructive/5",
                  )}
                >
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
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className={cn("text-sm font-medium", isComplete && "text-muted-foreground line-through")}>{task.title}</p>
                      <Badge variant="outline" className={cn("text-[10px] font-semibold", taskStatusBadgeClass(task.status))}>
                        {task.status}
                      </Badge>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {task.stage}
                      <span className="mx-1">·</span>
                      <span className={cn("tabular-nums", dueDateClass(dueBucket))}>
                        Due {task.dueDate?.trim() || "—"}
                      </span>
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
