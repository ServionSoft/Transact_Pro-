import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CalendarDays, Clock, Search } from "lucide-react";
import { useAppStore } from "@/store/appStore";
import { isTransactionProject, type Project } from "@/data/mockData";
import {
  getProjectFromApi,
  listProjectsFromApi,
  patchProjectTaskStatusApi,
  type ProjectListItem,
} from "@/api/projects";
import { getApiBaseUrl } from "@/lib/apiConfig";
import { useAuthStore } from "@/store/authStore";
import { hasPermission } from "@/lib/permissions";
import PageHeader from "@/components/shared/PageHeader";
import TaskDashboardRow, { type TaskDashboardRowData } from "@/components/tasks/TaskDashboardRow";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { dueDateBucket } from "@/lib/transactionListUtils";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type BucketFilter = "all" | "overdue" | "today" | "upcoming";
type StatusFilter = "all" | "Pending" | "In Progress";

function assigneeLabel(project: Project): string {
  const assignees = project.assignees ?? [];
  if (assignees.length === 0) return "Unassigned";
  const first = assignees[0]!.name?.trim() || "Team member";
  if (assignees.length === 1) return first;
  return `${first} +${assignees.length - 1}`;
}

function matchesBucketFilter(bucket: ReturnType<typeof dueDateBucket>, filter: BucketFilter): boolean {
  if (filter === "all") return bucket !== "none";
  if (filter === "overdue") return bucket === "overdue";
  if (filter === "today") return bucket === "today";
  return bucket === "week" || bucket === "later";
}

export default function TasksPage() {
  const [search, setSearch] = useState("");
  const [bucketFilter, setBucketFilter] = useState<BucketFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [loading, setLoading] = useState(false);
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);
  const [apiProjects, setApiProjects] = useState<Project[]>([]);
  const projects = useAppStore((s) => s.projects);
  const clients = useAppStore((s) => s.clients);
  const upsertProject = useAppStore((s) => s.upsertProject);
  const setTaskStatus = useAppStore((s) => s.setTaskStatus);
  const user = useAuthStore((s) => s.user);
  const apiOn = Boolean(getApiBaseUrl());
  const canEditTasks = hasPermission(user, "projects.edit");

  useEffect(() => {
    if (!apiOn) {
      setApiProjects([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void listProjectsFromApi()
      .then(async (rows: ProjectListItem[]) => {
        const ids = rows
          .filter((p) => p.type === "Listing" || p.type === "Buyer File")
          .map((p) => p.id);
        const detailed = await Promise.all(ids.map((id) => getProjectFromApi(id).catch(() => null)));
        if (cancelled) return;
        const valid = detailed.filter((p): p is NonNullable<typeof p> => Boolean(p));
        setApiProjects(valid);
        valid.forEach((p) => upsertProject(p));
      })
      .catch((e) => {
        if (cancelled) return;
        toast.error("Could not load tasks.", {
          description: e instanceof Error ? e.message : "Unknown error",
        });
        setApiProjects([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [apiOn, upsertProject]);

  const transactionProjects = useMemo(
    () => (apiOn ? apiProjects : projects).filter(isTransactionProject),
    [apiOn, apiProjects, projects],
  );

  const projectById = useMemo(() => {
    const map = new Map<string, Project>();
    for (const p of transactionProjects) map.set(p.id, p);
    return map;
  }, [transactionProjects]);

  const allTasks = useMemo<TaskDashboardRowData[]>(() => {
    return transactionProjects.flatMap((p) =>
      (p.tasks ?? [])
        .filter((t) => t.status !== "Complete")
        .map((t) => ({
          id: `${p.id}::${t.id}`,
          taskId: t.id,
          title: t.title,
          dueDate: t.dueDate,
          projectId: p.id,
          clientId: p.clientId,
          propertyAddress: p.propertyAddress,
          clientName: p.clientName,
          stage: p.stage,
          status: t.status,
          assignedTo: assigneeLabel(p),
        })),
    );
  }, [transactionProjects]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allTasks.filter((t) => {
      if (statusFilter !== "all" && t.status !== statusFilter) return false;
      const bucket = dueDateBucket(t.dueDate);
      if (!matchesBucketFilter(bucket, bucketFilter)) return false;
      if (!q) return true;
      return (
        t.title.toLowerCase().includes(q) ||
        t.clientName.toLowerCase().includes(q) ||
        t.propertyAddress.toLowerCase().includes(q) ||
        t.assignedTo.toLowerCase().includes(q)
      );
    });
  }, [allTasks, search, statusFilter, bucketFilter]);

  const counts = useMemo(() => {
    let overdue = 0;
    let today = 0;
    let upcoming = 0;
    for (const t of allTasks) {
      const b = dueDateBucket(t.dueDate);
      if (b === "overdue") overdue += 1;
      else if (b === "today") today += 1;
      else if (b === "week" || b === "later") upcoming += 1;
    }
    return { overdue, today, upcoming, total: allTasks.length };
  }, [allTasks]);

  const groups = useMemo(() => {
    const overdue: TaskDashboardRowData[] = [];
    const today: TaskDashboardRowData[] = [];
    const week: TaskDashboardRowData[] = [];
    const later: TaskDashboardRowData[] = [];
    for (const t of filtered) {
      const b = dueDateBucket(t.dueDate);
      if (b === "overdue") overdue.push(t);
      else if (b === "today") today.push(t);
      else if (b === "week") week.push(t);
      else if (b === "later") later.push(t);
    }
    return [
      {
        key: "overdue",
        label: "Overdue",
        icon: AlertTriangle,
        headerClass: "bg-destructive/10 text-destructive",
        tasks: overdue,
      },
      {
        key: "today",
        label: "Due today",
        icon: Clock,
        headerClass: "bg-amber-500/10 text-amber-800 dark:text-amber-200",
        tasks: today,
      },
      {
        key: "week",
        label: "This week",
        icon: CalendarDays,
        headerClass: "bg-secondary/80 text-foreground",
        tasks: week,
      },
      {
        key: "later",
        label: "Later",
        icon: CalendarDays,
        headerClass: "bg-muted/50 text-muted-foreground",
        tasks: later,
      },
    ];
  }, [filtered]);

  const visibleGroups = groups.filter((g) => g.tasks.length > 0);

  const markDone = (task: TaskDashboardRowData) => {
    if (!canEditTasks) {
      toast.error("You do not have permission to update tasks.");
      return;
    }
    if (apiOn) {
      setUpdatingTaskId(task.id);
      void patchProjectTaskStatusApi(task.projectId, task.taskId, "Complete")
        .then((updated) => {
          upsertProject(updated);
          setApiProjects((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
          toast.success(`Marked "${task.title}" complete`);
        })
        .catch((e) => {
          toast.error(e instanceof Error ? e.message : "Could not update task.");
        })
        .finally(() => {
          setUpdatingTaskId(null);
        });
      return;
    }
    setTaskStatus(task.projectId, task.taskId, "Complete");
    toast.success(`Marked "${task.title}" complete`);
  };

  const bucketChips: { id: BucketFilter; label: string; count: number; className: string }[] = [
    { id: "all", label: "All open", count: counts.total, className: "bg-secondary text-foreground" },
    { id: "overdue", label: "Overdue", count: counts.overdue, className: "bg-destructive/15 text-destructive" },
    { id: "today", label: "Due today", count: counts.today, className: "bg-amber-500/15 text-amber-800 dark:text-amber-200" },
    { id: "upcoming", label: "Upcoming", count: counts.upcoming, className: "bg-muted text-muted-foreground" },
  ];

  return (
    <div className="mx-auto flex min-h-0 flex-1 w-full max-w-7xl flex-col gap-6 overflow-hidden p-6 sm:p-8">
      <div className="shrink-0">
        <PageHeader
          title="Task dashboard"
          subtitle={
            loading
              ? "Loading open tasks…"
              : `${filtered.length} open task${filtered.length === 1 ? "" : "s"} across all transactions`
          }
        />
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="shrink-0 space-y-3 border-b border-border p-4 sm:p-5">
          <div className="relative w-full sm:max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search tasks, contacts, properties…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
              aria-label="Search tasks"
            />
          </div>

          <div className="flex flex-wrap gap-1.5">
            {bucketChips.map((chip) => (
              <button
                key={chip.id}
                type="button"
                onClick={() => setBucketFilter(chip.id)}
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
                  chip.className,
                  bucketFilter === chip.id ? "ring-2 ring-primary ring-offset-1 ring-offset-background" : "opacity-80 hover:opacity-100",
                )}
              >
                {chip.count} {chip.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-1 rounded-lg bg-muted/30 p-1">
            {(["all", "Pending", "In Progress"] as const).map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setStatusFilter(status)}
                className={cn(
                  "rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
                  statusFilter === status
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {status === "all" ? "All statuses" : status}
              </button>
            ))}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-5">
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full rounded-lg" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-sm font-medium text-foreground">No tasks match</p>
              <p className="mt-1 max-w-sm text-xs text-muted-foreground">
                {allTasks.length === 0
                  ? "All caught up — no open tasks on your transactions."
                  : "Try clearing filters or adjusting your search."}
              </p>
              {bucketFilter !== "all" || statusFilter !== "all" || search ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={() => {
                    setBucketFilter("all");
                    setStatusFilter("all");
                    setSearch("");
                  }}
                >
                  Reset filters
                </Button>
              ) : null}
            </div>
          ) : visibleGroups.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No tasks in this filter.</p>
          ) : (
            <div className="space-y-6">
              {visibleGroups.map((g) => (
                <section key={g.key}>
                  <div
                    className={cn(
                      "mb-2 flex items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold",
                      g.headerClass,
                    )}
                  >
                    <g.icon className="h-4 w-4 shrink-0" />
                    {g.label}
                    <span className="rounded-full bg-background/80 px-2 py-0.5 text-[10px] font-bold tabular-nums">
                      {g.tasks.length}
                    </span>
                  </div>
                  <ul className="space-y-2">
                    {g.tasks.map((t) => (
                      <li key={t.id}>
                        <TaskDashboardRow
                          task={t}
                          project={projectById.get(t.projectId)}
                          client={clients.find((c) => c.id === t.clientId)}
                          completing={updatingTaskId === t.id}
                          canEdit={canEditTasks}
                          onMarkDone={() => markDone(t)}
                        />
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
